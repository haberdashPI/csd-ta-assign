import React, {Component, PropTypes} from 'react';
import {Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {EditableArea,Editable,Selectable} from './Editable'
import DoubleMap from '../util/DoubleMap'
import {DOCUMENT, REMOVE, ADD, CHANGE, STUDENT,
        COURSE, STANDARD, ASSIGN, ASSIGN_MODE} from '../reducers/commands'
import {findcid, subkeys, assignmentHours,
        lastName, courseOrder_} from '../util/assignment';

// TODO: highlight student being edited

class _CloseButton extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    onRemove: PropTypes.func.isRequired
  }
  render(){
    let {name,onRemove} = this.props
    return (<div style={{float: "right"}}>
      <Glyphicon glyph="remove" className="close"
                 style={{fontSize: "1em"}}
                 onClick={() => onRemove(name)}/>
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
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {name,onChange} = this.props
    return (<strong>
      <Editable onChange={to => onChange(name,to)}>
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
    config: PropTypes.instanceOf(Map).isRequired,
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {name,student,config,onChange} = this.props
    return (<Editable onChange={to => onChange(name,to)}
                      validate={x => x % config.get('hour_unit') === 0}
                      message={"Must be a multiple of "+
                               config.get('hour_unit')+" hours"}>
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
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {name,student,onChange} = this.props
    return (<span><em>Comments</em>
      <EditableArea onChange={to => onChange(name,to)}>
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
    config: PropTypes.instanceOf(Map).isRequired,

    onAssignCourse: PropTypes.func.isRequired,
    onAssign: PropTypes.func.isRequired
  }
  render(){
    let {name,assign_mode,config,student} = this.props
    if(assign_mode.mode === STANDARD){
      return (<Button bsSize="xsmall"
                      onClick={to => this.props.onAssignCourse(name)}>
      <Glyphicon glyph="plus"/>Course
      </Button>)
    }
    else if(assign_mode.mode === COURSE){
      return (<Button bsSize="xsmall" bsStyle="primary"
                      onClick={to => {
                          this.props.onAssign(name,assign_mode.id,
                                              config.get('hour_unit'))
                        }}>
        Add {config.get('hour_unit')} hours to
        {' '}{courses.getIn([String(assign_mode.id),'number'])}
        {' ('}{courses.getIn([String(assign_mode.id),'quarter'])}{')'}
      </Button>)
    }else if(assign_mode.mode === STUDENT){
      return (<Button bsSize="xsmall"
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
    onAssign: (student,cid,hours) => {
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
    courses: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired
  }
  render(){
    let {assignments,courses} = this.props
    return (<div>
        {assignments.
         filter(course => course.get('hours')).
         sortBy(courseOrder_(courses)).
         map((assign,cid) =>
           <Col md={2} key={cid}><p>
             {courses.getIn([cid,'number'])} - {courses.getIn([cid,'quarter'])}
             {' '}({assign.get('hours')} hours/week)
           </p></Col>).
         toList()}
    </div>)
  }
}
const Assignments = connect(state => {
  return subkeys(state.document,['courses'])
})(_Assignments)

class Student extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
  }
  render(){
    let {name,assignments,student} = this.props
    let assigned = assignmentHours(assignments)
    return (
      <div>
        <Row>
          <Col md={2}>
            <CloseButton name={name}/>
            <StudentName name={name}/>
          </Col>
          <Col md={2}>
            <AssignButton name={name} student={student}
                          assignments={assignments}/>
          </Col>
          <Col md={2}>
            {assigned} hours/week of
            <StudentHours name={name} student={student}/>
          </Col>
          <Col md={4}>
            <StudentComments name={name} student={student}/>
          </Col>

        </Row>
        <Row>
          <Assignments assignments={assignments}/>
        </Row>
      </div>)
  }
}

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
