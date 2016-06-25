import React, {Component, PropTypes} from 'react';
import {Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {EditableArea,Editable,Selectable} from './Editable'
import DoubleMap from '../util/DoubleMap'
import {DOCUMENT, REMOVE, ADD, CHANGE, STUDENT} from '../reducers/commands'
import {findcid, subkeys, assignmentHours,
        lastName, courseOrder_} from '../util/assignment';

// TODO: allow setting of hours
// TODO: allow editing of comments
class _Student extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    onRemove: PropTypes.func.isRequired,
    onRename: PropTypes.func.isRequired,
    onChangeHours: PropTypes.func.isRequired,
    onChangeComments: PropTypes.func.isRequired
  }
  render(){
    let {name,assignments,student,courses} = this.props
    let assigned = assignmentHours(assignments)
    let total = student.get('total_hours')
    return (
      <div>
        <Row>
          <Col md={2}>
            <div style={{float: "right"}}>
              <Glyphicon glyph="remove" className="close"
                         style={{fontSize: "1em"}}
                         onClick={() => this.props.onRemove(name)}/>
            </div>
            <strong>
              <Editable onChange={to => this.props.onRename(name,to)}>
                {name}
              </Editable>
            </strong>
          </Col>

          <Col md={2}>
            {assigned} hours/week of
            <Editable onChange={to => this.props.onChangeHours(name,to)}
                      validate={x => x % 0.5 === 0}
                      message={"Must be a multiple of 0.5 hours"}>
              {student.get('total_hours')}
            </Editable>
          </Col>
          <Col md={4}><em>Comments</em>
            <EditableArea onChange={to => this.props.onChangeComments(name,to)}>
              {student.get('comments')}
            </EditableArea>
          </Col>
        </Row>
        <Row>
          <Col md={1}>
            <Button bsSize="xsmall"
                    onClick={to => this.props.setAssignMode(name,null)}>
              <Glyphicon glyph="plus"/>Course
            </Button>
          </Col>
          {(assignments.
                filter(course => course.get('hours')).
           sortBy(courseOrder_(courses)).
           map((assign,cid) =>
             <Col md={2}><p>
               {courses.getIn([cid,'name'])} ({assign.get('hours')} hours/week)
             </p></Col>).
           toList())}

        </Row>
      </div>)
  }
}
const Student = connect(state => {
  return subkeys(state.document,['courses'])
},dispatch => {
  return {
    onRemove: student => {
      dispatch({type: DOCUMENT, command: REMOVE, field: STUDENT, id: student})
    },
    onRename: (student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['name'],
        id: student,
        to: to
      })
    },
    onChangeHours: (student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['total_hours'],
        id: student, to: to
      })
    },
    onChangeComments: (student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['comments'],
        id: student, to: to
      })
    }
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
