import {NEW_TA_NAME} from '../reducers/student'

export function assignmentHours(assignments){
  return assignments.reduce((total,a) =>
    total + (a.get('hours') ? a.get('hours') : 0),0)
}

export function subkeys(map,keys){
  let result = {}
  for(let key of keys) result[key] = map.get(key)
    return result
}

export function lastName(v,name){
  if(name == NEW_TA_NAME)
    return "AAA"
  else
    return (name.trim().match(/\s+([^\s]+)$/) || [null,name])[1]
}

let quarter_order = {'fall': 0, 'winter': 1, 'spring': 2}
export function courseOrder_(courses){
  return cid => quarter_order[courses.getIn([cid,'quarter'])] + "_"
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
