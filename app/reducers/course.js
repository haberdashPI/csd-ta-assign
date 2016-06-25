import {fromJS, Map, List, Set} from 'immutable'
import DoubleMap from '../util/DoubleMap'
import {ADD, REMOVE, CHANGE} from './commands'

function changeCourse(state,action){
  let cid = String(action.id)
  return state.setIn(['courses',cid].concat(action.subfield),action.to)
}

function addCourse(state,action){
  let instructor = action.id
  let cids = state.get('courses').map(x => x.get('cid')).toList().toJS()
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

function removeCourse(state,action){
  let cid = String(action.id)
  let instructor = state.getIn(['courses',cid,'instructor'])
  return state.withMutations(s =>
    s.deleteIn(['courses',cid]).
      update('assignments',asg => asg.delete(null,cid)).
      updateIn(['instructors',instructor,'courses'],x => x.remove(cid)))
}

export default function course(state,action){
  switch(action.command){
    case ADD: return addCourse(state,action)
    case REMOVE: return removeCourse(state,action)
    case CHANGE: return changeCourse(state,action)
    default: return state
  }
}
