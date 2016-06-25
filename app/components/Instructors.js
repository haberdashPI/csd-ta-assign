import React, {Component, PropTypes} from 'react';
import {Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {Editable,Selectable} from './Editable'
import Course from './Course'

import DoubleMap from '../util/DoubleMap'

import {DOCUMENT, REMOVE, ADD, CHANGE, INSTRUCTOR, COURSE,
        NEW_INSTRUCTOR_NAME, findcid, subkeys, assignmentHours,
        lastName, courseOrder_} from '../reducers/assignments';

// TODO: highlight based on degree of preferences satisfied
// TODO: allow editing of comments
class _Instructor extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    instructor: PropTypes.instanceOf(Map).isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(DoubleMap).isRequired,
    onRemove: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired
  }

  render(){
    let {name,instructor,courses,assignments} = this.props
    let cids = instructor.get('courses') || List()

    let title = (<div>
    <div style={{float: "right"}}>
      <Glyphicon glyph="remove" className="close"
                 onClick={() => this.props.onRemove(name)}/>
    </div>
    <h4>
      <Editable onChange={to => this.props.onRename(name,to)}
                placeholder="Name"
                selectedByDefault={name === NEW_INSTRUCTOR_NAME}
                onCancel={() => (name === NEW_INSTRUCTOR_NAME ?
                                 this.props.onRemove(name) : null)}>
        {name}
      </Editable>
    </h4>
    </div>)

    return (<Panel header={title}>
      <Row>
        <Col md={4}>
          Courses{' '}
          <Button inline bsSize="xsmall" onClick={() => this.props.onAdd(name)}>
            <Glyphicon glyph="plus"/>
          </Button>
        </Col>
      </Row>
      {cids.
       sortBy(courseOrder_(courses)).
       map(cid => {
         let course = courses.get(cid)
         return (<Course key={cid} course={course}
                         assignments={assignments.get(null,cid)}/>)
       })}
      <Row><Col md={4}><p><strong>Comments</strong></p></Col></Row>
      <Row><Col md={12}><p>{instructor.get('comment')}</p></Col></Row>
    </Panel>)
  }
}

const Instructor = connect(state => {
  return subkeys(state.document,['courses','assignments'])
},dispatch => {
  return {
    onRemove: instructor => {
      dispatch({type: DOCUMENT, command: REMOVE, field: INSTRUCTOR,
                id: instructor})
    },
    onRename: (instructor,to) => {
      dispatch({type: DOCUMENT, command: CHANGE, field: INSTRUCTOR,
                id: instructor, to: to})
    },
    onAdd: instructor => {
      dispatch({type: DOCUMENT, command: ADD, field: COURSE, id: instructor})
    }
  }
})(_Instructor)

class Instructors extends Component {
  static propTypes = {
    instructors: PropTypes.instanceOf(Map).isRequired,
    onAdd: PropTypes.func.isRequired
  }

  render(){
    let {instructors} = this.props
    return (<Grid>
      <h3>Instructors{' '}
        <Button inline onClick={this.props.onAdd}>
          <Glyphicon glyph="plus"/>
        </Button>
      </h3>
      {instructors.sortBy(lastName).map((instructor,name) =>
        <Instructor key={name} name={name} instructor={instructor}/>).toList()}
    </Grid>)
  }
}

export default connect(state => {
  return subkeys(state.document,['instructors'])
},dispatch => {
  return {
    onAdd: () => {
      dispatch({type: DOCUMENT, command: ADD, field: INSTRUCTOR})
    }
  }
})(Instructors)
