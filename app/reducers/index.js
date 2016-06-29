import {combineReducers} from 'redux'
import assignments from './assignments'
import assign_mode from './assign_mode'
import config from './config'

export default function root(state = {},action){
  return {
    document: assignments(state.document,action),
    assign_mode: assign_mode(state.assign_mode,action,state),
    config: config(state.config,action)
  }
}
