import {combineReducers} from 'redux'
import assignments from './assignments'
import assign_mode from './assign_mode'
import config from './config'

export default combineReducers({
  document: assignments,
  assign_mode: assign_mode,
  config: config
});
