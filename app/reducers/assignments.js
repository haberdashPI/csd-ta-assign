import _ from 'underscore'
import {fromJS, Map, List, Set} from 'immutable'

import courses_csv from '../data/courses.json'
import students_csv from '../data/students.csv'
import instructors_csv from '../data/instructors.csv'

import DoubleMap from '../util/DoubleMap'

////////////////////////////////////////////////////////////////////////////////
// exported utility functions

export function assignmentHours(assignments){
  return assignments.reduce((total,a) =>
    total + (a.get('hours') ? a.get('hours') : 0),0)
}

export function subkeys(map,keys){
  let result = {}
  for(let key of keys) result[key] = map.get(key)
    return result
}

const NEW_TA_NAME = 'New TA'
export function lastName(v,name){
  if(name == NEW_TA_NAME)
    return "AAA"
  else
    return (name.trim().match(/\s+([^\s]+)$/) || [null,name])[1]
}

let quarter_order = {'fall': 0, 'winter': 1, 'spring': 2}
export function courseOrder_(courses){
  return cid => quarter_order[courses.getIn([cid,'quarter'])] + "_"
              courses.getIn([cid,'name'])
}

export function findcid(course){
  return Number(course.get('cid'))
}

////////////////////////////////////////////////////////////////////////////////
// construction

export class AssignmentError extends Error {
  constructor(msg) {
    super(msg);
    this.msg = msg;
    this.name = 'AssignmentError';
  }
}

function dictadd(obj,key){
  if(!obj[key]) obj[key] = {}
}
function arrayadd(obj,key){
  if(!obj[key]) obj[key] = []
}

function organizeStudents(data){
  let students = {}
  let ranks = new DoubleMap().asMutable()
  for(let entry of data){
    if(!students[entry.name])
      students[entry.name] = {}

    if(entry.type == "ranking"){
      ranks = ranks.set(entry.name,entry.value,entry.argument1)
    }else if(entry.type == "background"){
      arrayadd(students[entry.name],'background')
      students[entry.name].background.push(entry.argument1)
    }else if(entry.type == "conflict"){
      arrayadd(students[entry.name],'conflict')
      students[entry.name].conflict.push({
        day: entry.value,
        start: entry.argument1,
        stop: entry.argument2
      })
    }else{
      students[entry.name][entry.type] = entry.value
    }
    students[entry.name].total_hours = 30
  }
  return {studentRanks: ranks.asImmutable(), students: fromJS(students)}
}

function organizeInstructors(data){
  let instructors = {}
  let ranks = new DoubleMap().asMutable()
  for(let entry of data){
    if(!instructors[entry.name])
      instructors[entry.name] = {}

    if(entry.type == "ranking"){
      ranks.set(entry.argument1,entry.value,entry.argument2)
    }else{
      instructors[entry.name][entry.type] = entry.value
    }
  }

  return {instructorRanks: ranks.asImmutable(),instructors: fromJS(instructors)}
}

function organizeCourses(data){
  let courses = {}
  let coursesByInstructor = Map().asMutable()
  let uniques = {}
  let cid = 0
  for(let entry of data){
    cid += 1
    let hour_reg = /([0-9]+) to ([0-9]+) TA - ([0-9.]+) hours \/ week/
    let [__,pmin,max,total] = entry.hours.match(hour_reg)

    let unique = entry.number+ "_" + entry.quarter
    if(uniques[unique])
      throw new AssignmentError(`Multiple courses with the number
        ${entry.number} in the ${entry.quarter} quarter.`)

    courses[cid] = {
      quarter: entry.quarter,
      number: entry.number,
      name: entry.name,
      instructor: entry.instructor,
      cid: String(cid),
      hours: {range: [Number(pmin), Number(max)], total: Number(total)}
    }

    coursesByInstructor.update(entry.instructor,Set(),x => x.add(String(cid)))
  }

  return {
    coursesByInstructor: coursesByInstructor.asMutable(),
    courses: fromJS(courses)
  }
}

function createInitialState(){
  let {courses,coursesByInstructor} = organizeCourses(courses_csv)
  let {students,studentRanks} = organizeStudents(students_csv)
  let {instructors,instructorRanks} = organizeInstructors(instructors_csv)

  instructors = instructors.withMutations(instructors => {
    coursesByInstructor.forEach((v,k) => instructors.setIn([k,'courses'],v))
  })

  return Map({
    instructors: instructors,
    courses: courses,
    students: students,
    assignments: DoubleMap.combineValues({
      studentRank: studentRanks,
      instructorRank: instructorRanks
    })
  })
}

////////////////////////////////////////////////////////////////////////////////
// reducers

export const ADD = 'ADD'
export const REMOVE = 'REMOVE'
export const CHANGE = 'CHANGE'

export const INSTRUCTOR = 'INSTRUCTOR'
export const COURSE = 'COURSE'
export const STUDENT = 'STUDENT'
export const ASSIGNMENT = 'ASSIGNMENT'

var reductions = {INSTRUCTOR: {}, COURSE: {}, STUDENT: {}, ASSIGNMENT: {}}


export const NEW_INSTRUCTOR_NAME = 'AAA^^NEW_INSTRUCTOR^^'
function addInstructor(state,action){
  return state.setIn(['instructors',NEW_INSTRUCTOR_NAME],Map())
}
reductions[INSTRUCTOR][ADD] = addInstructor

function renameInstructor(state,action){
  let instructor = action.id
  return state.withMutations(s => {
    let data = s.getIn(['instructors',instructor])
    return s.deleteIn(['instructors',instructor]).
             setIn(['instructors',action.to],data)
  })
}
reductions[INSTRUCTOR][CHANGE] = renameInstructor

function removeInstructor(state,action){
  let instructor = action.id
  return state.withMutations(s => {

    // remove all instructor courses
    (s.getIn(['instructors',instructor,'courses']) || []).forEach(cid => {
      s.deleteIn(['courses',cid]).
        update('assignments',asg => asg.delete(null,cid))
    })

    // remove instructor
    s.deleteIn(['instructors',instructor])

    return s
  })
}
reductions[INSTRUCTOR][REMOVE] = removeInstructor

function changeCourse(state,action){
  let cid = String(action.id)
  return state.setIn(['courses',cid].concat(action.subfield),action.to)
}
reductions[COURSE][CHANGE] = changeCourse

function addCourse(state,action){
  let instructor = action.id
  let cids = state.get('courses').map(findcid).toList().toJS()
  let cid = String(Math.max(...cids) + 1)
  return state.withMutations(s =>
    s.updateIn(['instructors',instructor,'courses'],x => x.add(cid)).
      setIn(['courses',cid],Map({
        quarter: "fall",
        number: 0,
        name: "New Course",
        instructor: instructor,
        cid: cid,
        hours: Map({range: List([1,1]), total: 7.5})
      })))
}
reductions[COURSE][ADD] = addCourse

function removeCourse(state,action){
  let cid = String(action.id)
  let instructor = state.getIn(['courses',cid,'instructor'])
  return state.withMutations(s =>
    s.deleteIn(['courses',cid]).
      update('assignments',asg => asg.delete(null,cid)).
      updateIn(['instructors',instructor,'courses'],x => x.remove(cid)))
}
reductions[COURSE][REMOVE] = removeCourse

function addStudent(state,action){
  return state.setIn(['students',NEW_TA_NAME],Map({total_hours: 0}))
}
reductions[STUDENT][ADD] = addStudent

function removeStudent(state,action){
  let student = action.id
  return state.withMutations(s =>
    s.deleteIn(['students',student]).
      update('assignments',asg => asg.delete(student,null)))
}
reductions[STUDENT][REMOVE] = removeStudent

function changeStudent(state,action){
  let student = action.id
  if(action.subfield[0] == 'name'){
    if(state.getIn(['assignments',action.to]))
      throw AssignmentError('There is already a student named '+action.to+'.')
    let assign = state.get('assignments').get(student,null)

    return state.withMutations(s =>
      s.update('assignments',asg => asg.set(action.to,null,assign)).
        update('assignments',asg => asg.delete(student,null)).
        setIn(['students',action.to],s.getIn(['students',student])).
        deleteIn(['students',student]))
  }else{
    return state.setIn(['students',student].concat(action.subfield),action.to)
  }
}
reductions[STUDENT][CHANGE] = changeStudent

export const DOCUMENT = 'DOCUMENT'
export default function assignment(state = createInitialState(), action){
  switch(action.type){
    case DOCUMENT: return reductions[action.field][action.command](state,action)
    default: return state
  }
}
