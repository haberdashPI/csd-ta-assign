import {SOLVE,SOLVE_SETUP} from './commands'

export default function solve(state = {preparing: false},action,parent){
  switch(action.type){
    case SOLVE_SETUP:
      return {preparing: !action.end}
    case SOLVE:
      return {preparing: false}
    default:
      return state
  }
}
