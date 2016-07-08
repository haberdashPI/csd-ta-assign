import React, {Component, PropTypes} from 'react';
import ReactDOM from 'react-dom';
import {FormControl, FormGroup, Checkbox, ButtonGroup, Button, Glyphicon,
        Grid, Row, Col, Panel} from 'react-bootstrap'

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

const FormControlFeedback = FormControl.Feedback

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
           return (<Course key={cid} course={course} detail={true}
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
    let srank
    let irank
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

function assignedFn(courses,assignments){
  return cid => assignmentHours(assignments.get(null,cid)) >=
    courses.getIn([cid,'hours','total'])
}

function fullyAssignedFn(courses,assignments){
  return instructor => {
    let cids = instructor.get('courses')
    return (cids || List()).every(assignedFn(courses,assignments))
  }
}

function courseMatchesFn(search){
  return course =>
    !search || course.get('name').toUpperCase().match(search.toUpperCase()) ||
          course.get('number').match(search)
}

function instructorMatchesFn(search,courses){
  return (instructor,name) => {
    if(search){
      if(name.toUpperCase().match(search.toUpperCase()))
        return true

      let cids = instructor.get('courses')
      return !cids || cids.map(cid => courses.get(cid)).
                           some(courseMatchesFn(search))
    }else return true
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
    this.state = {scrollToTop: false,detail: true}
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

    let courseList
    if(this.state.detail){
      let filtered =
        (!config.hide_completed_instructors ? instructors :
         instructors.filterNot(fullyAssignedFn(courses,assignments)))
      filtered = filtered.filter(instructorMatchesFn(this.state.search,courses))

      let order = lastName
      if(assign_mode.mode === STUDENT){
        if(assign_mode.orderby !== LAST_NAME)
          order = instructorOrderFn(assignments,assign_mode,config)
      }

      courseList = filtered.sortBy(order).map((instructor,name) =>
        <Instructor key={name} name={name} instructor={instructor}
                    detail={this.state.detail}/>).toList()
    }else{
      let filtered =
        (!config.hide_completed_instructors ? courses :
         courses.filterNot((c,cid) => assignedFn(courses,assignments)(cid)))
      filtered = filtered.filter(courseMatchesFn(this.state.search))

      let order = (c,cid) => courseOrder(cid,courses)
      if(assign_mode.mode === STUDENT){
        if(assign_mode.orderby !== LAST_NAME)
          order = (c,cid) => courseOrderFn(assignments,assign_mode,config)(cid)
      }

      courseList =
        filtered.sortBy(order).
                  map((course,cid) => {
                    return (<Course key={cid} course={course}
                                    detail={false}
                                    assignments={assignments.get(null,cid)}/>)
                  }).
                  toList()
    }

    return (<Grid>
      <div>
        <div style={{float: "right"}}>
          <Checkbox checked={(config.hide_completed_instructors || false)}
                    onClick={(e) =>
                      onHideCompleted(!config.hide_completed_instructors)}>
            Hide items with no unassigned hours.
          </Checkbox>
        </div>
        <h3>Instructors and Courses{' '}
          <Button inline onClick={onAdd}>
            <Glyphicon glyph="plus"/>
          </Button>{' '}
          <ButtonGroup inline>
            <Button onClick={() => this.setState({detail: true})}
                    active={this.state.detail}>
              Detail
            </Button>
            <Button onClick={() => this.setState({detail: false})}
                    active={!this.state.detail}>
              Summary
            </Button>
          </ButtonGroup>
        </h3>
        <FormGroup>
          <FormControl type="text"
                       value={(this.state.search ? this.state.search : '')}
                       placeholder="Search"
                       onChange={(e) =>
                         this.setState({search: e.target.value})}/>
          <FormControlFeedback>
            <Glyphicon glyph="search"/>
          </FormControlFeedback>
        </FormGroup>
      </div>
      {courseList}
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
