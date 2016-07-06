import React, {Component, PropTypes} from 'react';
import {Well, Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {Editable,Selectable} from './Editable'

import {DOCUMENT, REMOVE, ADD, CHANGE, COURSE,
        STUDENT, STANDARD, ASSIGN, ASSIGN_MODE,
        OVERALL_FIT} from '../reducers/commands'

import {findcid, assignmentHours, lastName,
        courseOrder_, rankClass,
        combineRanks} from '../util/assignment';

import {documentKeys} from '../reducers/document';

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
    onRemove: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render() {
    let {course,disabled} = this.props
    return (<div style={{
      position: "relative",
      right: 0,
      padding: "0.5em",
      zIndex: 1}}>
      <Glyphicon glyph="remove" className="close"
                 style={{fontSize: "1em"}}
                 onClick={() => (disabled ? null :
                                 this.props.onRemove(course.get('cid')))}/>
    </div>)
  }
}

const CloseButton = connect(state => {return {}},dispatch => {
  return {
    onRemove: cid => {
      dispatch({
        type: DOCUMENT,
        field: COURSE,
        command: REMOVE,
        id: cid,
        confirm: "Are you sure you want to delete this course?"
      })
    },
  }
})(_CloseButton)

class _CourseName extends Component{
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {course,disabled} = this.props
    return (<strong>
      <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                disabled={disabled}
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
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {course,disabled} = this.props
    return (
      <strong>
        <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                  disabled={disabled}
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
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {course,disabled} = this.props
    return (
      <strong>
        <Selectable onChange={to => this.props.onChange(course.get('cid'),to)}
                    disabled={disabled}
                    value={course.get('quarter')}>
          {(this.props.detail ?
            ['fall','winter','spring'] :
            {'fall': 'F', 'winter': 'W', 'spring': 'S'})}
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
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {course,disabled} = this.props
    return (
      <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                disabled={disabled}
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
    config: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {course,config,disabled} = this.props
    return (
      <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                disabled={disabled}
                validate={x => (x % config.hour_unit === 0 && x > 0)}
                message={"Must be a multiple of "+config.hour_unit+
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
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {course,disabled} = this.props
    let hmin = Number(course.getIn(['hours','range',0]))
    let hmax = Number(course.getIn(['hours','range',1]))

    return (<span>
        <Editable onChange={to => this.props.onChange(course.get('cid'),to)}
                  disabled={disabled}
                  validate={x => intRange(x)}>
          {(hmin == hmax ? hmin : hmin+"-"+ hmax)}
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

class _Assignments extends Component{
  static propTypes = {
    assignments: PropTypes.instanceOf(Map).isRequired,
    course: PropTypes.instanceOf(Map).isRequired,
    disabled: PropTypes.bool.isRequired,

    onUnassign: PropTypes.func.isRequired,
    config: PropTypes.object.isRequired
  }
  render(){
    let {assignments,course,onUnassign,disabled,config} = this.props
    let filtered = assignments.filter(a => a.get('hours') > 0).
                               sortBy(lastName)

    return (<div>
      {filtered.map((assign,name) => {
         let fit = assignFit(assignments,{id: name, colorby: OVERALL_FIT},
                             config)

         return (<Col md={(this.props.detail ? 3 : 2)} key={name}>
           <p className={fit}>{(this.props.detail ? name : lastName(null,name))}
             ({assign.get('hours')} hours)
             <Button bsSize="xsmall"
                     disabled={disabled}
                     onClick={to => onUnassign(name,course.get('cid'),
                                               config.hour_unit)}>
               <Glyphicon glyph="minus"/>
             </Button>
           </p>
         </Col>)
       }).toList()}
    </div>)
  }
}
const Assignments = connect(state => {
  return {config: state.config}
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

function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1)
}

class _AssignPreferences extends Component{
  static propTypes = {
    assignments: PropTypes.instanceOf(Map).isRequired,
    course: PropTypes.instanceOf(Map).isRequired,
    config: PropTypes.object.isRequired
  }
  render(){
    let {assignments,course,config} = this.props
    let filtered = assignments.filter(a => a.get('hours') > 0).
                               sortBy(lastName)
    return (<div>
      <Row>
        <Col md={2}>Instructor:</Col>
        {filtered.map((assign,name) => {
           let instructorRank = rankClass(assign.get('instructorRank'),
                                          config.default_instructor_rank)
           return (<Col md={3} key={name}>
          <span className={instructorRank+" pref-area"}>
            {capitalize(instructorRank)} fit
          </span>
           </Col>)
         }).toList()}
      </Row>
      <Row>
        <Col md={2}>TA:</Col>
        {filtered.map((assign,name) => {
           let studentRank = rankClass(assign.get('studentRank'),
                                       config.default_student_srank)
           return (<Col md={3} key={name}>
          <span className={studentRank+" pref-area"}>
            {capitalize(studentRank)} fit
          </span>
           </Col>)
         }).toList()}
      </Row>
    </div>)
  }
}
const AssignPreferences = connect(state => {
  return {
    config: state.config
  }
})(_AssignPreferences)

class _AssignButton extends Component{
  static propTypes = {
    course: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    onAssignTA: PropTypes.func.isRequired,
    onAssign: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {assign_mode,config,course,disabled} = this.props

    if(assign_mode.mode === STANDARD){
      return (
        <Button bsSize="xsmall"
                disabled={disabled}
                onClick={to => this.props.onAssignTA(course.get('cid'))}>
          <Glyphicon glyph="plus"/>{(!this.props.detail ? '' : "TA")}
        </Button>)
    }else if(assign_mode.mode === STUDENT){
      return (<Button bsSize="xsmall" bsStyle="primary"
                      disabled={disabled}
                      onClick={to => {
                          this.props.onAssign(assign_mode.id,course.get('cid'),
                                              config.hour_unit)
                        }}>
          <Glyphicon glyph="plus"/>
        {(!this.props.detail ? '' :
            <span>Add {config.hour_unit} for {assign_mode.id}</span>)}
      </Button>)
    }else if(assign_mode.mode === COURSE && assign_mode.id === course.get('cid')){
      return (<Button bsSize="xsmall" disabled={false}
                      onClick={to => this.props.onAssignTA(null)}>
        <Glyphicon glyph="ok"/>
          {(!this.props.detail ? '' : "Done")}
      </Button>)
    }else if(assign_mode.mode === COURSE && assign_mode.id !== course.get('cid')){
      return (<Button bsSize="xsmall" disabled={true}>
        <Glyphicon glyph="plus"/>{(!this.props.detail ? '' : "TA")}
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
    onAssignTA: (cid) => {
      if(cid){
        dispatch({
          type: ASSIGN_MODE,
          mode: COURSE,
          id: cid,
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

function assignFit(assignments,assign_mode,config){
  if(assign_mode.mode !== STANDARD){
    let srank = assignments.getIn([assign_mode.id,'studentRank'],
                                  config.default_student_srank)
    let irank = assignments.getIn([assign_mode.id,'instructorRank'],
                                  config.default_instructor_rank)
    return rankClass(combineRanks(srank,irank,assign_mode.colorby,config))
  }
}

class _Course extends Component{
  static propTypes = {
    course: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    students: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired
  }
  render(){
    let {course,students,assignments,assign_mode,config} = this.props
    let assigned = assignmentHours(assignments)
    let unfocused = (assign_mode.mode === COURSE &&
                     assign_mode.id !== course.get('cid'))
    let completed = assigned >= course.getIn(['hours','total'])

    let courseFit = (assign_mode.mode !== STUDENT ? '' :
                     assignFit(assignments,assign_mode,config))

    if(!this.props.detail){
      return (<div className={(unfocused ? "unfocused" : "") + " "+
                              courseFit}>
        <Row>
          <Col md={2}>
            <CourseNumber course={course} disabled={unfocused}/>{' '}
            <CourseQuarter course={course} disabled={unfocused}
                           detail={false}/>
          </Col>
          <Col md={2}>
            <div className={(completed ? "completed" : "uncompleted")}
                 style={{width: "10em", height: "2em", display: "inline-block"}}>
              {assigned} of
              <CourseHours course={course} disabled={unfocused}/>
              {' '}
              (<CourseNumTAs course={course} disabled={unfocused}/>)
            </div>
            <AssignButton course={course} detail={false}
                          disabled={unfocused || completed}/>
          </Col>
          <Assignments assignments={assignments} disabled={unfocused}
                       course={course} detail={false}/>
        </Row>
      </div>)
    }else{
      return (<div className={(unfocused ? "unfocused" : "")}>
        <CloseButton course={course} disabled={unfocused}/>
        <Row>
          <Col md={3}>
            <CourseName course={course} disabled={unfocused}/>
          </Col>
          <Col md={2}>
            {'('}<CourseNumber course={course} disabled={unfocused}/>{') - '}
            <CourseQuarter course={course} disabled={unfocused}/>
          </Col>
          <Col md={2}>
            ~enrollment:
            <CourseEnroll course={course} disabled={unfocused}/>
          </Col>
          <Col md={3}>
            <div className={(completed ? "completed" : "uncompleted")}
                 style={{width: "12em", height: "2em", display: "inline-block"}}>
              {assigned} of
              <CourseHours course={course} disabled={unfocused}/>
              hours
              {' '}
              (<CourseNumTAs course={course} disabled={unfocused}/>)
            </div>
          </Col>
        </Row>
        <Well className={courseFit}>
          <Row>
            <Col md={2}>
              <AssignButton course={course} detail={true}
                            disabled={unfocused || completed}/>
            </Col>
            <Assignments assignments={assignments} disabled={unfocused}
                         course={course} detail={false}/>
          </Row>
          <AssignPreferences assignments={assignments}
                             course={course}/>
        </Well>
      </div>)
    }
  }
}

export default connect(state => {
  return {
    ...documentKeys(state,['students']),
    assign_mode: state.assign_mode,
    config: state.config
  }
})(_Course)
