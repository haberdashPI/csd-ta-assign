import {ASSIGN_MODE, STANDARD} from './commands'

export default function assign_mode(state = {mode: STANDARD},action){
  switch(action.type){
    case ASSIGN_MODE: return {mode: action.mode, id: action.id}
    default: return state
  }
}
