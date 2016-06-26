import _ from 'underscore'
import {fromJS, Map, List, Set} from 'immutable'

import courses_csv from '../data/courses.json'
import students_csv from '../data/students.csv'
import instructors_csv from '../data/instructors.csv'

import DoubleMap from '../util/DoubleMap'

import student from './student'
import instructor from './instructor'
import course from './course'
import assign from './assign'

import {quarter_order} from '../util/assignment'

import {STUDENT, INSTRUCTOR, COURSE, ASSIGN} from './commands'

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
      ranks = ranks.set(entry.name,strID_to_cid(entry.value),entry.argument1)
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
      ranks.set(entry.argument1,strID_to_cid(entry.value),entry.argument2)
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

export const DOCUMENT = 'DOCUMENT'
export default function assignment(state = createInitialState(), action){
  switch(action.type){
    case DOCUMENT:
      switch(action.field){
        case STUDENT: return student(state,action)
        case INSTRUCTOR: return instructor(state,action)
        case COURSE: return course(state,action)
        case ASSIGN: return assign(state,action)
      }
    default: return state
  }
}
