import {ASSIGN_MODE, DOCUMENT, STANDARD, STUDENT,
        COURSE, REMOVE, CHANGE, ASSIGN, INSTRUCTOR} from './commands'
import {assignmentHours} from '../util/assignment'

function willCompleteHours(state,action,document){
  if(state.mode === STUDENT){
    let asg = document.get('assignments').get(action.student,null)
    let hours = action.hours + assignmentHours(asg)
    return hours >= document.getIn(['students',action.student,'total_hours'])
  }else if(state.mode === COURSE){
    let asg = document.get('assignments').get(null,action.course)
    let hours = action.hours + assignmentHours(asg)
    return hours >= document.getIn(['courses',action.course,'hours','total'])
  }
}

export default function assign_mode(state = {mode: STANDARD},action,parent){
  switch(action.type){
    case ASSIGN_MODE: return {mode: action.mode, id: action.id,
                              fit_type: parent.config.default_fit_type}
    case DOCUMENT:
      // if
      if(action.field == ASSIGN && willCompleteHours(state,action,parent.document))
        return {mode: STANDARD}

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
        if(action.command === REMOVE &&
           action.id === parent.document.getIn(['courses',state.id,'instructor']))
          return {mode: STANDARD}
      }
      return state
    default: return state
  }
}
