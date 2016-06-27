import {fromJS, Map, List, Set} from 'immutable'
import DoubleMap from '../util/DoubleMap'
import {ADD,REMOVE,CHANGE} from './commands'

export const NEW_INSTRUCTOR_NAME = 'AAA^^NEW_INSTRUCTOR^^'
function addInstructor(state,action){
  return state.setIn(['instructors',NEW_INSTRUCTOR_NAME],Map())
}

function changeInstructor(state,action){
  let instructor = action.id
  if(action.subfields[0] === 'name'){
    return state.withMutations(s => {
      let data = s.getIn(['instructors',instructor])
      return s.deleteIn(['instructors',instructor]).
               setIn(['instructors',action.to],data)
    })
  }else{
    return state.setIn(['instructors',instructor].concat(action.subfields),
                       action.to)
  }
}

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

export default function instructor(state,action){
  switch(action.command){
    case ADD: return addInstructor(state,action)
    case REMOVE: return removeInstructor(state,action)
    case CHANGE: return changeInstructor(state,action)
    default: return state
  }
}
