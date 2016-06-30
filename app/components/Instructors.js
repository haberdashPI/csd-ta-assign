import React, {Component, PropTypes} from 'react';
import ReactDOM from 'react-dom';
import {Checkbox, Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {Editable,Selectable,EditableArea} from './Editable'
import Course from './Course'

import DoubleMap from '../util/DoubleMap'

import {DOCUMENT, REMOVE, ADD, CHANGE, INSTRUCTOR,
        STUDENT, COURSE, STATIC, LAST_NAME, CONFIG,
        STANDARD} from '../reducers/commands'
import {NEW_INSTRUCTOR_NAME} from '../reducers/instructor'

import {findcid, assignmentHours, lastName,
        courseOrder,combineRanks,
        combineRanksContinuous} from '../util/assignment';
import {documentKeys} from '../reducers/document'

class _Instructor extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    instructor: PropTypes.instanceOf(Map).isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(DoubleMap).isRequired,
    assign_mode: PropTypes.object.isRequired,

    onRemove: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
    onChangeComment: PropTypes.func.isRequired
  }

  render(){
    let {name,instructor,courses,assignments,assign_mode,
         onChangeComment} = this.props
    let cids = instructor.get('courses') || List()
    let unfocused = (assign_mode.mode === COURSE &&
                     courses.getIn([assign_mode.id,'instructor']) !== name)

    let title = (<div>
      <div style={{float: "right"}}>
        <Glyphicon glyph="remove" className="close"
                   onClick={() => (unfocused ? null :
                                   this.props.onRemove(name))}/>
      </div>
      <h4>
        <Editable onChange={to => this.props.onRename(name,to)}
                  disabled={unfocused}
                  placeholder="Name"
                  selectedByDefault={name === NEW_INSTRUCTOR_NAME}
                  onCancel={() => (name === NEW_INSTRUCTOR_NAME ?
                                   this.props.onRemove(name) : null)}>
          {name}
        </Editable>
      </h4>
    </div>)

    return (<div className={(unfocused ? "unfocused" : "")}>
      <Panel header={title}>
        <Row>
          <Col md={4}>
            Courses{' '}
            <Button inline bsSize="xsmall"
                    disabled={unfocused}
                    onClick={() => this.props.onAdd(name)}>
              <Glyphicon glyph="plus"/>
            </Button>
          </Col>
        </Row>
        {cids.
         sortBy(c => courseOrder(c,courses)).
         map(cid => {
           let course = courses.get(cid)
           return (<Course key={cid} course={course}
                           assignments={assignments.get(null,cid)}/>)
         })}
        <Row><Col md={4}><p><strong>Comments</strong></p></Col></Row>
        <Row><Col md={12}>
          <EditableArea onChange={to => onChangeComment(name,to)}
                        disabled={unfocused}>
            {instructor.get('comment')}
          </EditableArea>
        </Col></Row>
      </Panel>
    </div>)
  }
}

const Instructor = connect(state => {
  return {
    ...documentKeys(state,['courses','assignments']),
    assign_mode: state.assign_mode
  }
},dispatch => {
  return {
    onRemove: instructor => {
      dispatch({
        type: DOCUMENT,
        command: REMOVE,
        field: INSTRUCTOR,
        id: instructor,
        confirm: `Are you sure you want to delete ${instructor} and
                  all their courses?`
      })
    },
    onRename: (instructor,to) => {
      dispatch({type: DOCUMENT, command: CHANGE, field: INSTRUCTOR,
                subfields: ['name'], id: instructor, to: to})
    },
    onAdd: instructor => {
      dispatch({type: DOCUMENT, command: ADD, field: COURSE, id: instructor})
    },
    onChangeComment: (instructor,to) => {
      dispatch({type: DOCUMENT, command: CHANGE, field: INSTRUCTOR,
                subfields: ['comment'], id: instructor, to: to})
    }
  }
})(_Instructor)

function courseOrderFn(assignments,assign_mode,config){
  return cid => {
    let assign = assignments.get(assign_mode.id,cid)
    let srank, irank
    if(assign){
      srank = assign.get('studentRank',config.default_student_rank)
      irank = assign.get('instructorRank',config.default_instructor_rank)
    }else{
      srank = config.default_student_rank
      irank = config.default_instructor_rank
    }
    return -combineRanksContinuous(srank,irank,assign_mode.orderby,config)
  }
}

function instructorOrderFn(assignments,assign_mode,config){
  return (instructor,name) =>
    Math.min(...(instructor.get('courses') || List()).
              map(courseOrderFn(assignments,assign_mode,config)).toList())
}

function fullyAssignedFn(courses,assignments){
  return instructor => {
    let cids = instructor.get('courses')
    return (cids || List()).every(cid =>
      assignmentHours(assignments.get(null,cid)) >=
        courses.getIn([cid,'hours','total']))
  }
}

export class Instructors extends Component {
  static propTypes = {
    instructors: PropTypes.instanceOf(Map).isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(DoubleMap).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    onAdd: PropTypes.func.isRequired,
    onHideCompleted: PropTypes.func.isRequired
  }

  constructor(props){
    super(props)
    this.state = {scrollToTop: false}
  }

  componentWillReceiveProps(nextProps){
    // respond to an order change by starting from the top
    // of the list of instructors
    if(nextProps.assign_mode.mode === STUDENT &&
       (this.props.assign_mode.mode === STANDARD ||
        nextProps.assign_mode.orderby !== this.props.assign_mode.orderby)){
      this.setState({scrollToTop: true})
    }
  }
  componentDidUpdate(){
    if(this.state.scrollToTop){
      ReactDOM.findDOMNode(this).scrollIntoView()
      this.setState({scrollToTop: false})
    }
  }

  render(){
    let {instructors,courses,assignments,assign_mode,config,onAdd,
         onHideCompleted} = this.props

    let order = lastName
    if(assign_mode.mode === STUDENT){
      if(assign_mode.orderby !== LAST_NAME)
        order = instructorOrderFn(assignments,assign_mode,config)
    }

    let filtered = (!config.hide_completed_instructors ? instructors :
                    instructors.filterNot(fullyAssignedFn(courses,assignments)))


    return (<Grid>
      <div>
        <div style={{float: "right"}}>
          <Checkbox checked={(config.hide_completed_instructors || false)}
                    onClick={(e) =>
                      onHideCompleted(!config.hide_completed_instructors)}>
            Hide instructors with no unassigned hours.
          </Checkbox>
        </div>
        <h3>Instructors{' '}
          <Button inline onClick={onAdd}>
            <Glyphicon glyph="plus"/>
          </Button>
        </h3>
      </div>
      {filtered.sortBy(order).map((instructor,name) =>
        <Instructor key={name} name={name} instructor={instructor}/>).toList()}
    </Grid>)
  }
}

export default connect(state => {
  return {
    ...documentKeys(state,['instructors','assignments','courses']),
    assign_mode: state.assign_mode,
    config: state.config
  }
},dispatch => {
  return {
    onAdd: () => {
      dispatch({type: DOCUMENT, command: ADD, field: INSTRUCTOR})
    },
    onHideCompleted: hide => dispatch({
      type: CONFIG,
      to: {hide_completed_instructors: hide}
    })
  }
})(Instructors)
