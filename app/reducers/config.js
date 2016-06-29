import {Map} from 'immutable'
import {OVERALL_FIT} from './commands'

function initialConfig(){
  return {
    hour_unit: 7.5,
    default_fit_type: OVERALL_FIT,
    student_weight: 1,
    instructor_weight: 2,
    default_instructor_rank: 0,
    default_student_srank: 0
  }
}

export default function config(state = initialConfig(),action){
  return state
}
