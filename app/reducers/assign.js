import {fromJS, Map, List, Set} from 'immutable'
import DoubleMap from '../util/DoubleMap'
import {CHANGE} from './commands'

export default function assign(state,action){
  switch(action.command){
    case CHANGE:
      if(action.hours){
        return state.update('assignments',asg =>
          asg.update(action.student,String(action.course),Map(),x =>
            x.update('hours',0,h => h+action.hours)))
      }else if(action.fix !== undefined){
        return state.update('assignments',asg =>
          asg.update(action.student,String(action.course),Map(),x =>
            x.set('fix',action.fix)))
      }
    default: return state
  }
}
