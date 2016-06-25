import React, {Component, PropTypes} from 'react';
import {Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {Editable,Selectable} from './Editable'

import {DOCUMENT, REMOVE, ADD, CHANGE, COURSE} from '../reducers/commands'
import {findcid, assignmentHours, lastName,
        courseOrder_} from '../util/assignment';


function intRange(str){
  if(str % 1 == 0) return true
  else{
    let [a,b,...rest] = str.split('-')

    return rest.length == 0 && (a % 1 == 0) && (b % 1 == 0) && Number(a) < Number(b)
  }
}

class _Course extends Component{
  static propTypes = {
    course: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,

    onRemove: PropTypes.func.isRequired,
    onRename: PropTypes.func.isRequired,
    onRenumber: PropTypes.func.isRequired,

    onChangeQuarter: PropTypes.func.isRequired,
    onChangeHours: PropTypes.func.isRequired,
    onChangeTAs: PropTypes.func.isRequired,
    onChangeEnroll: PropTypes.func.isRequired,
  }
  render(){
    let {course,assignments} = this.props
    let assigned = assignmentHours(assignments)

    let cid = findcid(course)
    let hmin = Number(course.getIn(['hours','range',0]))
    let hmax = Number(course.getIn(['hours','range',1]))

    return (<div>
      <div style={{
        position: "relative",
        right: 0,
        padding: "0.5em",
        zIndex: 1000000}}>
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
                    validate={x => x % 0.5 === 0}
                    message={"Must be a multiple of 0.5 hours"}>
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
        {assignments.sortBy(lastName).map((assign,name) => {
           <Col md={1}><p>{name} ({assign.get('hours')} hours)</p></Col>
         }).toList()}
         <Col md={1}>
           <Button bsSize="xsmall"
                   onClick={to => this.props.setAssignMode(null,cid)}>
             <Glyphicon glyph="plus"/>TA
           </Button>
         </Col>
      </Row>
    </div>)
  }
}

export default connect(state => {return {}},dispatch => {
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
    }
  }
})(_Course)
