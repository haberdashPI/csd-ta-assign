import {fromJS, Map, List, Set} from 'immutable'
import DoubleMap from '../util/DoubleMap'
import {ADD, REMOVE, CHANGE, STUDENT, COHORT} from './commands'

export const NEW_TA_NAME = 'New TA'

function addStudent(state,action){
  return state.setIn(['students',NEW_TA_NAME],Map({total_hours: 0}))
}

function removeStudent(state,action){
  let student = action.id
  return state.withMutations(s =>
    s.deleteIn(['students',student]).
      update('assignments',asg => asg.delete(student,null)))
}

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

function changeCohort(state,action){
  return state.update('students',ss => ss.map(s =>
    (s.get('cohort') === action.id ? s.setIn(action.subfield,action.to) : s)
  ))
}

export default function student(state,action){
  switch(action.command){
    case ADD: return addStudent(state,action)
    case REMOVE: return removeStudent(state,action)
    case CHANGE:
      switch(action.field){
        case STUDENT: return changeStudent(state,action)
        case COHORT: return changeCohort(state,action)
      }
    default: return state
  }
}
