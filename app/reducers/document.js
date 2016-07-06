import _ from 'underscore'
import {fromJS, Map, List, Set} from 'immutable'
import undoable, {combineFilters,distinctState,includeAction} from 'redux-undo'

import courses_csv from '../data/courses.json'
import students_csv from '../data/students.csv'
import instructors_csv from '../data/instructors.csv'

import DoubleMap from '../util/DoubleMap'

import student from './student'
import instructor from './instructor'
import course from './course'
import assign from './assign'

import {quarter_order} from '../util/assignment'

import {STUDENT, INSTRUCTOR, COURSE, ASSIGN, COHORT, DOCUMENT,
        FILE_LOAD, FILE_SAVED, FILE_CLEAR} from './commands'

////////////////////////////////////////////////////////////////////////////////
// construction

function dictadd(obj,key){
  if(!obj[key]) obj[key] = {}
}
function arrayadd(obj,key){
  if(!obj[key]) obj[key] = []
}

function strID_to_cid(strID){
  let [number,quarter] = strID.trim().split("_")
  return String(Number(number)*10 + quarter_order[quarter])
}

function organizeStudents(data){
  let students = {}
  let ranks = new DoubleMap().asMutable()
  for(let entry of data){
    if(!students[entry.name])
      students[entry.name] = {}

    if(entry.type == "ranking"){
      ranks = ranks.set(entry.name,strID_to_cid(entry.value),
                        Number(entry.argument1))
    }else if(entry.type == "background"){
      arrayadd(students[entry.name],'background')
      students[entry.name].background.push(entry.value)
    }else if(entry.type == "allow_more_hours"){
      students[entry.name].allow_more_hours = entry.value === "yes"
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
      ranks.set(entry.argument1,strID_to_cid(entry.value),
                Number(entry.argument2))
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
  for(let entry of data){
    let hour_reg = /([0-9]+) to ([0-9]+) TA - ([0-9.]+) hours \/ week/
    let [__,pmin,max,total] = entry.hours.match(hour_reg)

    let cid = Number(entry.number)*10 + quarter_order[entry.quarter]
    if(courses[cid])
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

function createInitialState(timestamp){
  let {courses,coursesByInstructor} = organizeCourses(courses_csv)
  let {students,studentRanks} = organizeStudents(students_csv)
  let {instructors,instructorRanks} = organizeInstructors(instructors_csv)

  instructors = instructors.withMutations(instructors => {
    coursesByInstructor.forEach((v,k) => instructors.setIn([k,'courses'],v))
  })

  return {
    timestamp: timestamp || Date.now(),
    data: Map({
      instructors: instructors,
      courses: courses,
      students: students,
      assignments: DoubleMap.combineValues({
        studentRank: studentRanks,
        instructorRank: instructorRanks
      })
    })
  }
}

export function docFromJSON(data){
  return Map({
    instructors: fromJS(data.instructors).map(i =>
      i.update('courses',Set(),x => x.toSet())),
    courses: fromJS(data.courses),
    students: fromJS(data.students),
    assignments: new DoubleMap(fromJS(data.assignments))
  })
}

export function docToJSON(doc){
  return {
    instructors: doc.get('instructors').toJS(),
    courses: doc.get('courses').toJS(),
    students: doc.get('students').toJS(),
    assignments: doc.get('assignments').toJS()
  }
}

export function isClean(state){
  return state.lastStored &&
         (!state.undo || state.lastStored === state.undo.present.timestamp)
}

export function documentKeys(state,keys){
  let data = documentData(state)
  let result = {}
  for(let key of keys) result[key] = data.get(key)
  return result
}

export function documentData(state){
  return state.document.undo.present.data
}

////////////////////////////////////////////////////////////////////////////////
// reducers

function dataReducer(state = createInitialState(),action){
  switch(action.type){
    case DOCUMENT:
      let result = state.data
      let timestamp = Date.now()
      switch(action.field){
        case STUDENT: result = student(state.data,action); break
        case COHORT: result = student(state.data,action); break
        case INSTRUCTOR: result = instructor(state.data,action); break
        case COURSE: result = course(state.data,action); break
        case ASSIGN: result = assign(state.data,action); break
        default: timestamp = state.timestamp
      }
      return {data: result, timestamp: timestamp}
    default: return state
  }
}

const undoReducer = undoable(dataReducer,{
  filter: includeAction(DOCUMENT)
})

export default function document(state = {},action){
  let time
  switch(action.type){
    case FILE_LOAD:
      time = Date.now()
      return {
        lastStored: time,
        undo: {
          past: [],
          present: {data: action.data, timestamp: time},
          future: []
        }
      }
    case FILE_SAVED:
      time = Date.now()
      return {
        lastStored: time,
        undo: {
          ...state.undo,
          present: {...state.undo.present, timestamp: time}
        }
      }
    case FILE_CLEAR:
      time = Date.now()
      return {
        lastStored: time,
        undo: {
          past: [],
          present: createInitialState(time),
          future: []
        }
      }
    default: return {
      lastStored: state.lastStored,
      undo: undoReducer(state.undo,action)
    }
  }
}
