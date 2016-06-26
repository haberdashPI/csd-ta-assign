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

class _Student extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    onRemove: PropTypes.func.isRequired,
    onRename: PropTypes.func.isRequired,
    onChangeHours: PropTypes.func.isRequired,
    onChangeComments: PropTypes.func.isRequired,

    onAssignCourse: PropTypes.func.isRequired,
    onAssign: PropTypes.func.isRequired
  }
  render(){
    let {name,assign_mode,assignments,student,courses,config} = this.props
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
            {(assign_mode.mode !== STANDARD ? null :
              <Button bsSize="xsmall"
                      onClick={to => this.props.onAssignCourse(name)}>
                <Glyphicon glyph="plus"/>Course
              </Button>)}
            {(assign_mode.mode !== COURSE ? null :
              <Button bsSize="xsmall" bsStyle="primary"
                      onClick={to => {
                          this.props.onAssign(name,assign_mode.id,
                                              config.get('hour_unit'))
                        }}>
                Add {config.get('hour_unit')} hours to
                {' '}{courses.getIn([String(assign_mode.id),'number'])}
                {' ('}{courses.getIn([String(assign_mode.id),'quarter'])}{')'}
              </Button>)}
            {(assign_mode.mode !== STUDENT ? null :
              <Button bsSize="xsmall"
                      onClick={to => this.props.onAssignCourse(null)}
                      disabled={assign_mode.id !== name}>
                {(assign_mode.id === name ? "Done" :
                  <span><Glyphicon glyph="plus"/>Course</span>)}
              </Button>)}
          </Col>
          <Col md={2}>
            {assigned} hours/week of
            <Editable onChange={to => this.props.onChangeHours(name,to)}
                      validate={x => x % config.get('hour_unit') === 0}
                      message={"Must be a multiple of "+
                               config.get('hour_unit')+" hours"}>
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
          {(assignments.
           filter(course => course.get('hours')).
            sortBy(courseOrder_(courses)).
            map((assign,cid) =>
              <Col md={2} key={cid}><p>
                {courses.getIn([cid,'number'])} - {courses.getIn([cid,'quarter'])}
                {' '}({assign.get('hours')} hours/week)
              </p></Col>).
            toList())}

        </Row>
      </div>)
  }
}
const Student = connect(state => {
  return {
    ...subkeys(state.document,['courses']),
    assign_mode: state.assign_mode,
    config: state.config
  }
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
    },
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
