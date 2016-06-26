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
//       (when doing this sorting, move unavailable courses to bottom of sort order

function intRange(str){
  if(str % 1 == 0) return true
  else{
    let [a,b,...rest] = str.split('-')

    return rest.length == 0 && (a % 1 == 0) && (b % 1 == 0) &&
           Number(a) < Number(b)
  }
}

class _Course extends Component{
  static propTypes = {
    course: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    students: PropTypes.instanceOf(Map).isRequired,

    onRemove: PropTypes.func.isRequired,
    onRename: PropTypes.func.isRequired,
    onRenumber: PropTypes.func.isRequired,

    onChangeQuarter: PropTypes.func.isRequired,
    onChangeHours: PropTypes.func.isRequired,
    onChangeTAs: PropTypes.func.isRequired,
    onChangeEnroll: PropTypes.func.isRequired,

    onAssignTA: PropTypes.func.isRequired,
    onAssign: PropTypes.func.isRequired
  }
  render(){
    let {course,assign_mode,students,assignments,config} = this.props
    let assigned = assignmentHours(assignments)

    let cid = findcid(course)
    let hmin = Number(course.getIn(['hours','range',0]))
    let hmax = Number(course.getIn(['hours','range',1]))

    return (<div>
      <div style={{
        position: "relative",
        right: 0,
        padding: "0.5em",
        zIndex: 1}}>
        <Glyphicon glyph="remove" className="close"
                   style={{fontSize: "1em"}}
                   onClick={() => this.props.onRemove(cid)}/>
      </div>
      <Row>
        <Col md={3}>
          <strong>
            <Editable onChange={to => this.props.onRename(cid,to)}
                      placeholder="Course Name">
              {course.get('name')}
            </Editable>
          </strong>
        </Col>
        <Col md={2}>
          <strong>
            {'('}
            <Editable onChange={to => this.props.onRenumber(cid,to)}
                      validate={x => !isNaN(x)}
                      message={"Must be a number"}
                      placeholder="Course Number">
              {course.get('number')}
            </Editable>
            {') - '}
            <Selectable onChange={to => this.props.onChangeQuarter(cid,to)}
                        options={['fall','winter','spring']}>
              {course.get('quarter')}
            </Selectable>
          </strong>
        </Col>
        <Col md={2}>
          ~enrollment:
          <Editable onChange={to => this.props.onChangeEnroll(cid,to)}
                    validate={x => !isNaN(x) || x.trim() === "?"}>
            {(!course.get('enrollment') ? '?' : course.get('enrollment'))}
          </Editable>
        </Col>
        <Col md={2}>
          {assigned} of
          <Editable onChange={to => this.props.onChangeHours(cid,to)}
                    validate={x => x % config.get('hour_unit') === 0}
                    message={"Must be a multiple of "+config.get('hour_unit')+
                             " hours"}>
            {course.getIn(['hours','total'])}
          </Editable>
          hours
          {' '}
          (<Editable onChange={to => this.props.onChangeTAs(cid,to)}
                     validate={x => intRange(x)}>
            {(hmin == hmax ? hmin : hmin+" - "+ hmax)}
          </Editable> {(hmin == 1 && hmax == 1 ? 'TA' : 'TAs')})
        </Col>
      </Row>
      <Row>
        {assignments.
         filter(a => a.get('hours') > 0).
         sortBy(lastName).
         map((assign,name) => {
           return <Col md={1} key={name}>
             <p>{name} ({assign.get('hours')} hours)</p></Col>
         }).toList()}
        <Col md={2}>
          {(assign_mode.mode !== STANDARD ? null :
            <Button bsSize="xsmall"
                    onClick={to => this.props.onAssignTA(cid)}>
              <Glyphicon glyph="plus"/>TA
            </Button>)}
            {(assign_mode.mode !== STUDENT ? null :
              <Button bsSize="xsmall" bsStyle="primary"
                      onClick={to => {
                          this.props.onAssign(assign_mode.id,cid,
                                              config.get('hour_unit'))
                        }}>
                Add {config.get('hour_unit')} for {assign_mode.id}
              </Button>)}
              {(assign_mode.mode !== COURSE ? null :
                <Button bsSize="xsmall"
                        onClick={to => this.props.onAssignTA(null)}
                        disabled={assign_mode.id !== cid}>
                  {(assign_mode.id === cid ? "Done" :
                    <span><Glyphicon glyph="plus"/>TA</span>)}
                </Button>)}
        </Col>
      </Row>
    </div>)
  }
}

export default connect(state => {
  return {
    ...subkeys(state.document,['students']),
    assign_mode: state.assign_mode,
    config: state.config
  }
},dispatch => {
  return {
    onRemove: cid => {
      dispatch({type: DOCUMENT, field: COURSE, command: REMOVE, id: cid})
    },
    onRename: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['name'],
        to: to
      })
    },
    onRenumber: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['number'],
        to: to
      })
    },
    onChangeQuarter: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['quarter'],
        to: to
      })
    },
    onChangeHours: (cid,to) => {
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['hours','total'],
        to: to
      })
    },
    onChangeTAs: (cid,to) => {
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
    },
    onChangeEnroll: (cid,to) => {
      let val = (to.trim() === "?" ? null : Number(to))
      dispatch({
        type: DOCUMENT,
        id: cid,
        command: CHANGE,
        field: COURSE, subfield: ['enrollment'],
        to: val
      })
    },
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
})(_Course)
