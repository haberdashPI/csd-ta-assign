import {NEW_TA_NAME} from '../reducers/student'
import {OVERALL_FIT, STUDENT, COURSE} from '../reducers/commands'

export function assignmentHours(assignments){
  return assignments.reduce((total,a) =>
    total + (a.get('hours') ? a.get('hours') : 0),0)
}

export function lastName(v,name){
  if(name == NEW_TA_NAME)
    return "AAA"
  else
    return (name.trim().match(/\s+([^\s]+)$/) || [null,name])[1]
}

export function lastNameAndCohort(v,name){
  return v.get('cohort') + "_" + lastName(v,name)
}

export var quarter_order = {'fall': 0, 'winter': 1, 'spring': 2}
export function courseOrder(cid,courses){
  return quarter_order[courses.getIn([cid,'quarter'])] + "_" +
         courses.getIn([cid,'name'])
}

export function findcid(course){
  return Number(course.get('cid'))
}

export class AssignmentError extends Error {
  constructor(msg) {
    super(msg);
    this.msg = msg;
    this.name = 'AssignmentError';
  }
}

export function rankClass(n,def){
  switch(Number(n || def)){
    case -2: return "terrible"
    case -1: return "poor"
    case 0: return "okay"
    case 1: return "good"
    case 2: return "excellent"
  }
}

export function combineRanks(srank,irank,fit_type,config){
  if(fit_type === OVERALL_FIT){
    let mean = ((srank*config.student_weight + irank*config.instructor_weight) /
      (config.student_weight + config.instructor_weight))
    if(srank + irank < 0 && srank <= 0 && irank <= 0){
      return (mean <= -1 ? -2 : -1)
    }else if(srank + irank > 0 && srank >= 0 && irank >= 0){
      return (mean >= 1 ? 2 : 1)
    }else{
      if(mean > 0)
        return Math.ceil(mean)
      else
        return Math.floor(mean)
    }
  }else if(fit_type === STUDENT){
    return srank
  }else if(fit_type === COURSE){
    return irank
  }else{
    throw "Unexpected fit_type: "+fit_type
  }
}

export function combineRanksContinuous(srank,irank,fit_type,config){
  if(fit_type === OVERALL_FIT){
    return ((srank*config.student_weight + irank*config.instructor_weight) /
      (config.student_weight + config.instructor_weight))
  }else if(fit_type === STUDENT){
    return srank
  }else if(fit_type === COURSE){
    return irank
  }else{
    throw "Unexpected fit_type: "+fit_type
  }
}
