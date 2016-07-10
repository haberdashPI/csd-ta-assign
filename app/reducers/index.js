import {combineReducers,createStore,applyMiddleware} from 'redux'
import document from './document'
import assign_mode from './assign_mode'
import config from './config'
import {notify, notifyMiddelware} from './notify'
import solve from './solve'

export default function createRootStore(notifyPromise){
  let root = (state = {},action) => {
    return {
      document: document(state.document,action),
      assign_mode: assign_mode(state.assign_mode,action,state),
      config: config(state.config,action),
      solve: solve(state.solve,action,state)
    }
  }

  return createStore(root,applyMiddleware(notifyMiddelware(notifyPromise)))
}
