import {ASSIGN_MODE, DOCUMENT, STANDARD, STUDENT,
        COURSE, REMOVE, CHANGE, ASSIGN, INSTRUCTOR} from './commands'

export default function assign_mode(state = {mode: STANDARD},action){
  switch(action.type){
    case ASSIGN_MODE: return {...action}
    case DOCUMENT:
      // if we change the student name, update the assignment state
      if(state.mode === STUDENT && action.field == STUDENT){

        // reset mode if the assigning student was removed
        if(action.command === REMOVE && action.id === state.id)
          return {mode: STANDARD}

        // update the mode if the assigning student's name was changed
        if(action.command === CHANGE && action.subfield[0] === 'name' &&
           action.id === state.id)
          return {mode: STUDENT, id: action.to}

      }else if(state.mode === COURSE && action.field === COURSE){

        // reset mode if the assigning course was removed
        if(action.command === REMOVE && action.id === state.id)
          return {mode: STANDARD}
      }else if(state.mode === COURSE && action.field == INSTRUCTOR){
        if(action.command === REMOVE && action.id === state.instructor)
          return {mode: STANDARD}
      }
      return state
    default: return state
  }
}
