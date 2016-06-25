import { combineReducers } from 'redux';
import assignments from './assignments';

export default combineReducers({
  document: assignments,
});
