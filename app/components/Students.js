import React, {Component, PropTypes} from 'react';
import ReactDOM from 'react-dom';
import {Checkbox, Well, Button, Glyphicon, Grid, Row,
        Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {EditableArea,Editable,Selectable} from './Editable'
import DoubleMap from '../util/DoubleMap'
import {DOCUMENT, REMOVE, ADD, CHANGE, STUDENT,
        COURSE, STANDARD, ASSIGN, ASSIGN_MODE,
        LAST_NAME, CONFIG} from '../reducers/commands'
import {findcid, assignmentHours,
        lastName, courseOrder, rankClass,
        combineRanks, combineRanksContinuous} from '../util/assignment';
import {documentKeys} from '../reducers/document'

class _CloseButton extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    onRemove: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,onRemove,disabled} = this.props
    return (<div style={{float: "right"}}>
      <Glyphicon glyph="remove" className="close"
                 style={{fontSize: "1em"}}
                 onClick={() => (disabled ? null : onRemove(name))}/>
    </div>)
  }
}
const CloseButton = connect(state => {return {}},dispatch => {
  return {
    onRemove: student => {
      dispatch({
        type: DOCUMENT,
        command: REMOVE,
        field: STUDENT,
        id: student,
        confirm: `Are you sure you want to delete ${student}?`
      })
    }
  }
})(_CloseButton)

class _StudentName extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,onChange,disabled} = this.props
    return (<strong>
      <Editable onChange={to => onChange(name,to)} disabled={disabled}>
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
    config: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {name,student,config,onChange,disabled} = this.props
    return (<Editable onChange={to => onChange(name,to)}
                      validate={x => (x % config.hour_unit === 0 && x > 0)}
                      message={"Must be a multiple of "+
                               config.hour_unit+" hours"}
                      disabled={disabled}>
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
    },
  }
})(_StudentHours)

class _StudentAllowMore extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired
  }
  render(){
    let {name,student,onChange,disabled} = this.props
    return (<Checkbox checked={student.get('allow_more_hours')}
                      disabled={disabled}
                      onChange={(e) =>
                        onChange(name,!student.get('allow_more_hours'))}>
      allow more hours
    </Checkbox>)
  }
}
const StudentAllowMore = connect(state => {return {}},dispatch => {
  return {
    onChange: (student,to) => dispatch({
      type: DOCUMENT,
      command: CHANGE,
      field: STUDENT, subfield: ['allow_more_hours'],
      id: student, to: to
    })
  }
})(_StudentAllowMore)

class _StudentComments extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,student,onChange,disabled} = this.props
    return (<span><em>Comments</em>
      <EditableArea onChange={to => onChange(name,to)}
                    disabled={disabled}>
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

function quarterIsFn(quarter,courses){
  return (assign,cid) => courses.getIn([cid,'quarter']) === quarter
}

function quarterLoadMatches(name,courses,assignments,order){
  let f =
    assignmentHours(assignments.filter(quarterIsFn('fall',courses)))
  let w =
    assignmentHours(assignments.filter(quarterIsFn('winter',courses)))
  let s =
    assignmentHours(assignments.filter(quarterIsFn('spring',courses)))
  switch(order){
    case 0: return true
    case 1: return f >= w && w >= s
    case 2: return f >= s && s >= w
    case 3: return w >= f && f >= s
    case 4: return w >= s && s >= f
    case 5: return s >= f && f >= w
    case 6: return s >= w && w >= f
  }
}

class _StudentQuarterLoad extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    disabled: PropTypes.bool.isRequired,
    assignments: PropTypes.instanceOf(Map),
    courses: PropTypes.instanceOf(Map),

    onChange: PropTypes.func.isRequired
  }
  render(){
    let {name,student,assignments,courses,onChange,disabled} = this.props
    let order = Number(student.get('quarter_load',0))
    let match = quarterLoadMatches(name,courses,assignments,order)
    return (<span>
        <span className={(match ? 'completed' : 'uncompleted')}>
          <em>Quarter Load </em>
        </span>
        <Selectable onChange={to => this.props.onChange(name,to)}
                    disabled={disabled}
                    value={String(order)}>
          {{"0": 'any',
            "1": "F > W > S",
            "2": "F > S > W",
            "3": "W > F > S",
            "4": "W > S > F",
            "5": "S > F > W",
            "6": "S > W > F"}}
        </Selectable>
    </span>)
  }
}
const StudentQuarterLoad = connect(state => {
  return documentKeys(state,['courses'])
},dispatch => {
  return {
    onChange: (student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['quarter_load'],
        id: student,
        to: Number(to)
      })
    }
  }
})(_StudentQuarterLoad)

class _AssignButton extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,

    onAssignCourse: PropTypes.func.isRequired,
    onAssign: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,assign_mode,config,student,disabled,courses} = this.props

    if(assign_mode.mode === STANDARD){
      return (<Button bsSize="xsmall"
                      disabled={disabled}
                      onClick={to => this.props.onAssignCourse(name)}>
        <Glyphicon glyph="plus"/>Course
      </Button>)
    }
    else if(assign_mode.mode === COURSE){
      return (<Button bsSize="xsmall" bsStyle="primary"
                      disabled={disabled}
                      onClick={to => {
                          this.props.onAssign(name,assign_mode.id,
                                              config.hour_unit)
                        }}>
        Add {config.hour_unit} hours to
        {' '}{courses.getIn([String(assign_mode.id),'number'])}
        {' ('}{courses.getIn([String(assign_mode.id),'quarter'])}{')'}
      </Button>)
    }else if(assign_mode.mode === STUDENT){
      return (<Button bsSize="xsmall"
                      disabled={disabled}
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
    ...documentKeys(state,['courses']),
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

class _Assignments extends Component{
  static PropTypes = {
    name: PropTypes.string.isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    disabled: PropTypes.bool.isRequired,

    courses: PropTypes.instanceOf(Map).isRequired,
    config: PropTypes.object.isRequired,
    onUnassign: PropTypes.func.isRequired
  }
  render(){
    let {name,assignments,courses,config,disabled,onUnassign} = this.props
    return (<div>
        {assignments.
           filter(course => course.get('hours')).
         sortBy((c,cid) => courseOrder(cid,courses)).
         map((assign,cid) =>
           <Col md={2} key={cid}><p>
             {courses.getIn([cid,'number'])} - {courses.getIn([cid,'quarter'])}
             {' '}({assign.get('hours')} hrs/wk)
             <Button bsSize="xsmall"
                     disabled={disabled}
                     onClick={to => onUnassign(name,cid,
                                               config.hour_unit)}>
               <Glyphicon glyph="minus"/>
             </Button>
           </p></Col>).
         toList()}
    </div>)
  }
}
const Assignments = connect(state => {
  return {
    ...documentKeys(state,['courses']),
    config: state.config
  }
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

function assignFit(assignments,assign_mode,config){
  if(assign_mode.mode !== STANDARD){
    let srank = assignments.getIn([assign_mode.id,'studentRank'],
                                  config.default_student_srank)
    let irank = assignments.getIn([assign_mode.id,'instructorRank'],
                                  config.default_instructor_rank)
    return rankClass(combineRanks(srank,irank,assign_mode.colorby,config))
  }
}

class _Student extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    assignments: PropTypes.instanceOf(Map).isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired
  }
  render(){
    let {name,assignments,student,assign_mode,config} = this.props
    let assigned = assignmentHours(assignments)
    let unfocused = (assign_mode.mode === STUDENT &&
                     assign_mode.id !== name)
    let completed = assigned >= student.get('total_hours')

    let courseFit = (assign_mode.mode !== COURSE ? '' :
                     assignFit(assignments,assign_mode,config))

    return (
      <div className={(unfocused ? "unfocused" : "")}>
        <Well className={courseFit}>
          <Row>
            <Col md={2}>
              <CloseButton disabled={unfocused} name={name}/>
              <StudentName disabled={unfocused} name={name}/>
            </Col>
            <Col md={2}>
              <AssignButton name={name} student={student}
                            assignments={assignments}
                            disabled={unfocused ||
                                      (completed &&
                                       !student.get('allow_more_hours'))}/>
            </Col>
            <Col md={2}>
              <div className={(completed ? "completed" : "uncompleted")}>
                {assigned} hours/week of
                <StudentHours name={name} student={student}
                              disabled={unfocused}/>
              </div>
              <StudentAllowMore name={name} student={student}
                                disabled={unfocused}/>
            </Col>
            <Col md={3}>
              <StudentQuarterLoad name={name} student={student}
                                  assignments={assignments}
                                  disabled={unfocused}/>
            </Col>
          </Row>
          <Row>
            <Assignments assignments={assignments} name={name}
                         disabled={unfocused}/>
          </Row>
          <Row>
            <Col md={8}>
              <StudentComments name={name} student={student}
                               disabled={unfocused}/>
            </Col>
          </Row>
        </Well>
      </div>)
  }
}
const Student = connect(state => {
  return {
    assign_mode: state.assign_mode,
    config: state.config
  }
})(_Student)


function studentOrderFn(assignments,assign_mode,config){
  return (student,name) => {
    let assign = assignments.get(name,assign_mode.id)
    let srank = assign.get('studentRank',config.default_student_rank)
    let irank = assign.get('instructorRank',config.default_instructor_rank)
    return -combineRanksContinuous(srank,irank,assign_mode.orderby,config)
  }
}

function fullyAssignedFn(courses,assignments){
  return (student,name) => {
    return assignmentHours(assignments.get(name,null)) >=
      student.get('total_hours')
  }
}

// TODO: show student's cohort, and order by that and then last name
// TODO: allow setting hours by cohort
class Students extends Component {
  static propTypes = {
    assignments: PropTypes.instanceOf(DoubleMap).isRequired,
    students: PropTypes.instanceOf(Map).isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    onHideCompleted: PropTypes.func.isRequired
  }

  constructor(props){
    super(props)
    this.state = {scrollToTop: false}
  }

  componentWillReceiveProps(nextProps){
    // respond to an order change by starting from the top
    // of the list of students
    if(nextProps.assign_mode.mode === COURSE &&
       (this.props.assign_mode.mode === STANDARD ||
        nextProps.assign_mode.orderby !== this.props.assign_mode.orderby)){
      this.setState({scrollToTop: true})
    }
  }
  componentDidUpdate(){
    if(this.state.scrollToTop) ReactDOM.findDOMNode(this).scrollIntoView()
  }

  render(){
    let {assignments,students,courses,assign_mode,config,
         onHideCompleted} = this.props
    let order = lastName
    if(assign_mode.mode === COURSE){
      if(assign_mode.orderby !== LAST_NAME)
        order = studentOrderFn(assignments,assign_mode,config)
    }

    let filtered = (!config.hide_completed_students ? students :
                    students.filterNot(fullyAssignedFn(courses,assignments)))


    return (<Grid>
        <div>
          <div style={{float: "right"}}>
            <Checkbox checked={(config.hide_completed_students || false)}
                      onClick={(e) =>
                        onHideCompleted(!config.hide_completed_students)}>
              Hide TAs with no unassigned hours.
            </Checkbox>
          </div>
          <h3>
            TAs{' '}
            <Button inline onClick={this.props.onAdd}>
              <Glyphicon glyph="plus"/>
            </Button>
          </h3>
        </div>
        {filtered.sortBy(order).map((student,name) =>
          <Student key={name} name={name}
                   assignments={assignments.get(name,null)}
                   student={student}/>).toList()}
    </Grid>)
  }
}
export default connect(state => {
  return {
    ...documentKeys(state,['assignments','students','courses']),
    assign_mode: state.assign_mode,
    config: state.config
  }
},dispatch => {
  return {
    onAdd: () => {
      dispatch({type: DOCUMENT, command: ADD, field: STUDENT})
    },
    onHideCompleted: hide => dispatch({
      type: CONFIG,
      to: {hide_completed_students: hide}
    })
  }
})(Students)
