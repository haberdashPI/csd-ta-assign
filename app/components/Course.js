import React, {Component, PropTypes} from 'react';
import {Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {Editable,Selectable} from './Editable'

import {DOCUMENT, REMOVE, ADD, CHANGE, COURSE,
        STUDENT, STANDARD, ASSIGN, ASSIGN_MODE} from '../reducers/commands'
import {findcid, assignmentHours, lastName,
        courseOrder_, subkeys} from '../util/assignment';


// TODO: highlight course being edited
// TODO: prevent user from adding too many hours
// TODO: allow hours to be removed
// TODO: visual cue for preference of actual assignments
// TODO: visual cue for preference of potential assignments
// TODO: allow sorting by overall preference, TA and instructor preference
//       (when doing this sorting, move unavailable courses to bottom of
//        sort order)

function intRange(str){
  if(str % 1 == 0) return true
  else{
    let [a,b,...rest] = str.split('-')

    return rest.length == 0 && (a % 1 == 0) && (b % 1 == 0) &&
           Number(a) < Number(b)
  }
}

class _CloseButton extends Component{
  static propTypes = {
    course: PropTypes.instanceOf(Map).isRequired,
    onRemove: PropTypes.func.isRequired
  }
  render() {
    let {course} = this.props
    return (<div style={{
      position: "relative",
      right: 0,
      padding: "0.5em",
      zIndex: 1}}>
      <Glyphicon glyph="remove" className="close"
                 style={{fontSize: "1em"}}
                 onClick={() => this.props.onRemove(course.get('cid'))}/>
    </div>)
  }
}

const CloseButton = connect(state => {return {}},dispatch => {
  return {
    onRemove: cid => {
      dispatch({type: DOCUMENT, field: COURSE, command: REMOVE, id: cid})
    },
  }
})(_CloseButton)

class _CourseName extends Component{
  static propTypes = {
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {course} = this.props
    return (<strong>
      <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                placeholder="Course Name">
        {course.get('name')}
      </Editable>
    </strong>)
  }
}
const CourseName = connect(state => {return {}},dispatch => {
  return {
    onChange: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['name'],
        to: to
      })
    }
  }
})(_CourseName)

class _CourseNumber extends Component{
  static propTypes = {
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {course} = this.props
    return (
      <strong>
        <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                  validate={x => !isNaN(x)}
                  message={"Must be a number"}
                  placeholder="Course Number">
          {course.get('number')}
        </Editable>
      </strong>)
  }
}
const CourseNumber = connect(state => {return {}},dispatch => {
  return {
    onChange: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['number'],
        to: to
      })
    }
  }
})(_CourseNumber)


class _CourseQuarter extends Component{
  static propTypes = {
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {course} = this.props
    return (
      <strong>
        <Selectable onChange={to => this.props.onChange(course.get('cid'),to)}
                    options={['fall','winter','spring']}>
          {course.get('quarter')}
        </Selectable>
      </strong>)
  }
}
const CourseQuarter = connect(state => {return {}},dispatch => {
  return {
    onChange: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['quarter'],
        to: to
      })
    }
  }
})(_CourseQuarter)

class _CourseEnroll extends Component{
  static propTypes = {
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {course} = this.props
    return (
      <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                validate={x => !isNaN(x) || x.trim() === "?"}>
        {(!course.get('enrollment') ? '?' : course.get('enrollment'))}
      </Editable>)
  }
}
const CourseEnroll = connect(state => {return {}},dispatch => {
  return {
    onChange: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['enrollment'],
        to: to
      })
    }
  }
})(_CourseEnroll)

class _CourseHours extends Component{
  static propTypes = {
    course: PropTypes.instanceOf(Map).isRequired,
    config: PropTypes.instanceOf(Map).isRequired,
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {course,config} = this.props
    return (
      <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                validate={x => x % config.get('hour_unit') === 0}
                message={"Must be a multiple of "+config.get('hour_unit')+
                         " hours"}>
        {course.getIn(['hours','total'])}
      </Editable>)
  }
}
const CourseHours = connect(state => {
  return {config: state.config}
},dispatch => {
  return {
    onChange: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['hours','total'],
        to: to
      })
    }
  }
})(_CourseHours)

class _CourseNumTAs extends Component{
  static propTypes = {
    onChange: PropTypes.func.isRequired
  }
  render(){
    let {course} = this.props
    let hmin = Number(course.getIn(['hours','range',0]))
    let hmax = Number(course.getIn(['hours','range',1]))

    return (<span>
        <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                  validate={x => intRange(x)}>
          {(hmin == hmax ? hmin : hmin+" - "+ hmax)}
        </Editable> {(hmin == 1 && hmax == 1 ? 'TA' : 'TAs')}
    </span>)
  }
}
const CourseNumTAs = connect(state => {return {}},dispatch => {
  return {
    onChange: (cid,to) => {
      let hmin
      let hmax
      if(to.match(/.*-.*/))
        [hmin,hmax] = to.split('-').map(Number)
      else{
        hmin = Number(to)
        hmax = Number(to)
      }
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['hours','range'],
        to: List([hmin,hmax])
      })
    }
  }
})(_CourseNumTAs)

function Assignments({assignments}){
  return (<div>
      {assignments.filter(a => a.get('hours') > 0).sortBy(lastName).
                   map((assign,name) =>
                     <Col md={3} key={name}>
                       <p>{name} ({assign.get('hours')} hours)</p>
                     </Col>).toList()}
  </div>)
}

class _AssignButton extends Component{
  static propTypes = {
    course: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.instanceOf(Map).isRequired,

    onAssignTA: PropTypes.func.isRequired,
    onAssign: PropTypes.func.isRequired
  }
  render(){
    let {assign_mode,config,course} = this.props
    if(assign_mode.mode === STANDARD){
      return (
        <Button bsSize="xsmall"
                onClick={to => this.props.onAssignTA(course.get('cid'))}>
          <Glyphicon glyph="plus"/>TA
        </Button>)
    }else if(assign_mode.mode === STUDENT){
      return (<Button bsSize="xsmall" bsStyle="primary"
                      onClick={to => {
                          this.props.onAssign(assign_mode.id,course.get('cid'),
                                              config.get('hour_unit'))
                        }}>
          Add {config.get('hour_unit')} for {assign_mode.id}
      </Button>)
    }else if(assign_mode.mode === COURSE){
      return (<Button bsSize="xsmall"
                      onClick={to => this.props.onAssignTA(null)}
                      disabled={assign_mode.id !== course.get('cid')}>
        {(assign_mode.id === course.get('cid') ? "Done" :
          <span><Glyphicon glyph="plus"/>TA</span>)}
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
    onAssignTA: cid => {
      if(cid){
        dispatch({
          type: ASSIGN_MODE,
          mode: COURSE,
          id: cid
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


class _Course extends Component{
  static propTypes = {
    course: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    students: PropTypes.instanceOf(Map).isRequired,
  }
  render(){
    let {course,students,assignments} = this.props
    let assigned = assignmentHours(assignments)

    return (<div>
      <CloseButton course={course}/>
      <Row>
        <Col md={3}>
          <CourseName course={course}/>
        </Col>
        <Col md={2}>
          {'('}<CourseNumber course={course}/>{') - '}
          <CourseQuarter course={course}/>
        </Col>
        <Col md={2}>
          ~enrollment:
          <CourseEnroll course={course}/>
        </Col>
        <Col md={2}>
          {assigned} of
          <CourseHours course={course}/>
          hours
          {' '}
          (<CourseNumTAs course={course}/>)
        </Col>
      </Row>
      <Row>
        <Assignments assignments={assignments}/>
        <Col md={2}>
          <AssignButton course={course}/>
        </Col>
      </Row>
    </div>)
  }
}

export default connect(state => {
  return subkeys(state.document,['students'])
})(_Course)
