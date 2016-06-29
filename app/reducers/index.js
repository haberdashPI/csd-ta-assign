import {combineReducers,createStore,applyMiddleware} from 'redux'
import assignments from './assignments'
import assign_mode from './assign_mode'
import config from './config'
import {notify, notifyMiddelware} from './notify'

function root(state = {},action){
  return {
    document: assignments(state.document,action),
    assign_mode: assign_mode(state.assign_mode,action,state),
    config: config(state.config,action)
  }
}

export default function createRootStore(notifyPromise){
  return createStore(root,applyMiddleware(notifyMiddelware(notifyPromise)))
}
