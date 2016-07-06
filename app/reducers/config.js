import {Map} from 'immutable'
import {OVERALL_FIT, CONFIG} from './commands'

function initialConfig(){
  return {
    hour_unit: 7.5,
    default_colorby: {'STUDENT': OVERALL_FIT, 'COURSE': OVERALL_FIT},
    default_orderby: {'STUDENT': OVERALL_FIT, 'COURSE': OVERALL_FIT},
    student_weight: 1,
    instructor_weight: 2,
    default_instructor_rank: 0,
    default_student_rank: 0,
  }
}

export default function config(state = initialConfig(),action){
  switch(action.type){
    case CONFIG: return {...state, ...action.to}
    default: return state
  }
}
