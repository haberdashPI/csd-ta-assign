import React, {Component, PropTypes} from 'react';
import {Well, Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {EditableArea,Editable,Selectable} from './Editable'
import DoubleMap from '../util/DoubleMap'
import {DOCUMENT, REMOVE, ADD, CHANGE, STUDENT,
        COURSE, STANDARD, ASSIGN, ASSIGN_MODE} from '../reducers/commands'
import {findcid, subkeys, assignmentHours,
        lastName, courseOrder_, rankClass,
        combineRanks} from '../util/assignment';

class _CloseButton extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    onRemove: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,onRemove,disabled} = this.props
    return (<div style={{float: "right"}}>
      <Glyphicon glyph="remove" className="close"
                 style={{fontSize: "1em"}}
                 onClick={() => (disabled ? null : onRemove(name))}/>
    </div>)
  }
}
const CloseButton = connect(state => {return {}},dispatch => {
  return {
    onRemove: student => {
      dispatch({type: DOCUMENT, command: REMOVE, field: STUDENT, id: student})
    }
  }
})(_CloseButton)

class _StudentName extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,onChange,disabled} = this.props
    return (<strong>
      <Editable onChange={to => onChange(name,to)} disabled={disabled}>
        {name}
      </Editable>
    </strong>)
  }
}
const StudentName = connect(state => {return {}},dispatch => {
  return {
    onChange: (student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['name'],
        id: student,
        to: to
      })
    }
  }
})(_StudentName)

class _StudentHours extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    config: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,student,config,onChange,disabled} = this.props
    return (<Editable onChange={to => onChange(name,to)}
                      validate={x => (x % config.hour_unit === 0 && x > 0)}
                      message={"Must be a multiple of "+
                               config.hour_unit+" hours"}
                      disabled={disabled}>
      {student.get('total_hours')}
    </Editable>)
  }
}
const StudentHours = connect(state => {
  return {config: state.config}
},dispatch => {
  return {
    onChange: (student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['total_hours'],
        id: student,
        to: to
      })
    }
  }
})(_StudentHours)

class _StudentComments extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,student,onChange,disabled} = this.props
    return (<span><em>Comments</em>
      <EditableArea onChange={to => onChange(name,to)}
                    disabled={disabled}>
        {student.get('comments')}
      </EditableArea></span>)
  }
}
const StudentComments = connect(state => {return {}},dispatch => {
  return {
    onChange: (student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['comments'],
        id: student,
        to: to
      })
    }
  }
})(_StudentComments)

class _AssignButton extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,

    onAssignCourse: PropTypes.func.isRequired,
    onAssign: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,assign_mode,config,student,disabled,courses} = this.props

    if(assign_mode.mode === STANDARD){
      return (<Button bsSize="xsmall"
                      disabled={disabled}
                      onClick={to => this.props.onAssignCourse(name)}>
      <Glyphicon glyph="plus"/>Course
      </Button>)
    }
    else if(assign_mode.mode === COURSE){
      return (<Button bsSize="xsmall" bsStyle="primary"
                      disabled={disabled}
                      onClick={to => {
                          this.props.onAssign(name,assign_mode.id,
                                              config.hour_unit)
                        }}>
        Add {config.hour_unit} hours to
        {' '}{courses.getIn([String(assign_mode.id),'number'])}
        {' ('}{courses.getIn([String(assign_mode.id),'quarter'])}{')'}
      </Button>)
    }else if(assign_mode.mode === STUDENT){
      return (<Button bsSize="xsmall"
                      disabled={disabled}
                      onClick={to => this.props.onAssignCourse(null)}
                      disabled={assign_mode.id !== name}>
        {(assign_mode.id === name ? "Done" :
          <span><Glyphicon glyph="plus"/>Course</span>)}
      </Button>)
    }
  }
}
const AssignButton = connect(state => {
  return {
    ...subkeys(state.document,['courses']),
    assign_mode: state.assign_mode,
    config: state.config
  }
},dispatch => {
  return {
    onAssignCourse: name => {
      if(name){
        dispatch({
          type: ASSIGN_MODE,
          mode: STUDENT,
          id: name
        })
      }else{
        dispatch({type: ASSIGN_MODE, mode: STANDARD})
      }
    },
    onAssign: (student,cid,hours,complete) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: ASSIGN,
        hours: hours,
        course: cid, student: student
      })
    }
  }
})(_AssignButton)

class _Assignments extends Component{
  static PropTypes = {
    name: PropTypes.string.isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    disabled: PropTypes.bool.isRequired,

    courses: PropTypes.instanceOf(Map).isRequired,
    config: PropTypes.object.isRequired,
    onUnassign: PropTypes.func.isRequired
  }
  render(){
    let {name,assignments,courses,config,disabled,onUnassign} = this.props
    return (<div>
        {assignments.
         filter(course => course.get('hours')).
         sortBy(courseOrder_(courses)).
         map((assign,cid) =>
           <Col md={2} key={cid}><p>
             {courses.getIn([cid,'number'])} - {courses.getIn([cid,'quarter'])}
             {' '}({assign.get('hours')} hours/week)
             <Button bsSize="xsmall"
                     disabled={disabled}
                     onClick={to => onUnassign(name,cid,
                                               config.hour_unit)}>
               <Glyphicon glyph="minus"/>
             </Button>
           </p></Col>).
         toList()}
    </div>)
  }
}
const Assignments = connect(state => {
  return {
    ...subkeys(state.document,['courses']),
    config: state.config
  }
},dispatch => {
  return {
    onUnassign: (name,cid,unit) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: ASSIGN,
        hours: -unit,
        student: name,
        course: cid
      })
    }
  }
})(_Assignments)

function assignFit(assignments,assign_mode,config){
  if(assign_mode.mode !== STANDARD){
    let srank = assignments.getIn([assignments.id,'studentRank'],
                                  config.default_student_srank)
    let irank = assignments.getIn([assignments.id,'instructorRank'],
                                  config.default_instructor_rank)
    return rankClass(combineRanks(srank,irank,assign_mode.fit_type,config))
  }
}

class _Student extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired
  }
  render(){
    let {name,assignments,student,assign_mode,config} = this.props
    let assigned = assignmentHours(assignments)
    let unfocused = (assign_mode.mode === STUDENT &&
                     assign_mode.id !== name)
    let completed = assigned >= student.get('total_hours')

    let courseFit = (assign_mode.mode !== COURSE ? '' :
                     assignFit(assignments,assign_mode,config))

    return (
      <div className={(unfocused ? "unfocused" : "")}>
        <Well className={courseFit}>
          <Row>
            <Col md={2}>
              <CloseButton disabled={unfocused} name={name}/>
              <StudentName disabled={unfocused} name={name}/>
            </Col>
            <Col md={2}>
              <AssignButton name={name} student={student}
                            assignments={assignments}
                            disabled={unfocused || completed}/>
            </Col>
            <Col md={2}>
              <div className={(completed ? "completed" : "uncompleted")}>
                {assigned} hours/week of
                <StudentHours name={name} student={student}
                              disabled={unfocused}/>
              </div>
            </Col>
          </Row>
          <Row>
            <Assignments assignments={assignments} name={name}
                         disabled={unfocused}/>
          </Row>
          <Row>
            <Col md={8}>
              <StudentComments name={name} student={student}
                               disabled={unfocused}/>
            </Col>
          </Row>
        </Well>
      </div>)
  }
}
const Student = connect(state => {
  return {
    assign_mode: state.assign_mode,
    config: state.config
  }
})(_Student)


// TODO: show students by cohort
// TODO: allow setting hours by cohort
class Students extends Component {
  static propTypes = {
    assignments: React.PropTypes.instanceOf(DoubleMap).isRequired,
    students: React.PropTypes.instanceOf(Map).isRequired,
    courses: React.PropTypes.instanceOf(Map).isRequired
  }
  render(){
    let {assignments,students,courses} = this.props
    return (<Grid>
    <h3>
      TAs{' '}
      <Button inline onClick={this.props.onAdd}>
        <Glyphicon glyph="plus"/>
      </Button>
    </h3>

    {students.sortBy(lastName).map((student,name) =>
       <Student key={name} name={name}
                assignments={assignments.get(name,null)}
                student={student}/>).toList()}
    </Grid>)
  }
}
export default connect(state => {
  return subkeys(state.document,['assignments','students','courses'])
},dispatch => {
  return {
    onAdd: () => {
      dispatch({type: DOCUMENT, command: ADD, field: STUDENT})
    }
  }
})(Students)
