import React, {Component, PropTypes} from 'react';
import ReactDOM from 'react-dom';
import {FormGroup, FormControl, Checkbox, Well, ButtonGroup,
        Button, Glyphicon, Grid, Row, Col, Panel} from 'react-bootstrap'
import {Map, List} from 'immutable'
import {connect} from 'react-redux';

import {EditableArea,Editable,EditableOptions,Selectable} from './Editable'
import DoubleMap from '../util/DoubleMap'
import {DOCUMENT, REMOVE, ADD, CHANGE, STUDENT,
        COURSE, STANDARD, ASSIGN, ASSIGN_MODE,
        LAST_NAME, CONFIG, COHORT, OVERALL_FIT} from '../reducers/commands'
import {findcid, assignmentHours,
        lastNameAndCohort, courseOrder, rankClass,
        combineRanks, combineRanksContinuous} from '../util/assignment';
import {documentKeys} from '../reducers/document'

const FormControlFeedback = FormControl.Feedback

class _CloseButton extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    onRemove: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,onRemove,disabled} = this.props
    return (<div style={{
      position: "relative",
      right: 0,
      padding: "0.5em",
      zIndex: 1}}>
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
    return (<Editable onChange={to => onChange(name,student,to)}
                      validate={x => (x % config.hour_unit === 0 && x >= 0)}
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
    onChange: (name,student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['total_hours'],
        id: name,
        to: Number(to)
      })
      if(student.get('cohort')){
        dispatch({
          type: DOCUMENT,
          command: CHANGE,
          field: COHORT, subfield: ['total_hours'],
          id: student.get('cohort'),
          confirm: "Change for all students in this cohort?",
          to: Number(to)
        })
      }
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

const shortorder = {
  "0": 'any',
  "1": "FWS",
  "2": "FSW",
  "3": "WFS",
  "4": "WSF",
  "5": "SFW",
  "6": "SWF"
}
const longorder = {
  "0": 'any',
  "1": "F > W > S",
  "2": "F > S > W",
  "3": "W > F > S",
  "4": "W > S > F",
  "5": "S > F > W",
  "6": "S > W > F"
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

    if(this.props.detail){
      return (<span>
        <span className={(match ? 'completed' : 'uncompleted')}>
          <em>"Quarter Load"</em>
        </span>
        <Selectable onChange={to => this.props.onChange(name,to)}
                    disabled={disabled}
                    value={String(order)}>
          {longorder}
        </Selectable>
      </span>)
    }else{
      return (<span className={(match ? 'completed' : 'uncompleted')}
                    style={{width: "3.5em", height: "2em",
                            display: "inline-block"}}>
        <Selectable onChange={to => this.props.onChange(name,to)}
                    disabled={disabled}
                    value={String(order)}>
          {shortorder}
        </Selectable>
      </span>)
    }
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

class _StudentCohort extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    disabled: PropTypes.bool.isRequired,

    onChange: PropTypes.func.isRequired
  }
  render(){
    let {name,student,onChange,disabled} = this.props
    return (
      <Selectable onChange={to => this.props.onChange(name,to)}
                  disabled={disabled}
                  value={(student.get('cohort') ?
                          student.get('cohort') : "")}>
        {{"": 'no cohort',
          "1": "1st year",
          "2": "2nd year",
          "3": "3rd year",
          "4": "4th year",
          "5": "5th year",
          "6": "6th year+"}}
      </Selectable>)
  }
}
const StudentCohort = connect(state => {
  return documentKeys(state,['courses'])
},dispatch => {
  return {
    onChange: (student,to) => {
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: STUDENT, subfield: ['cohort'],
        id: student,
        to: Number(to)
      })
    }
  }
})(_StudentCohort)

class _AssignButton extends Component{
  static propTypes = {
    name: PropTypes.string.isRequired,
    student: PropTypes.instanceOf(Map).isRequired,
    assign_mode: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,
    assignments: PropTypes.instanceOf(DoubleMap).isRequired,

    onAssignCourse: PropTypes.func.isRequired,
    onAssign: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
  }
  render(){
    let {name,assign_mode,config,student,disabled,courses,
         assignments} = this.props
    let text

    if(assign_mode.mode === STANDARD){
      text = "Course"
      return (<Button bsSize="xsmall"
                      disabled={disabled}
                      onClick={to => this.props.onAssignCourse(name)}>
        <Glyphicon glyph="plus"/>{(this.props.detail ? text : "")}
      </Button>)
    }
    else if(assign_mode.mode === COURSE){
      disabled = disabled || assignments.get(name,assign_mode.id).get('fix')
      text = (<span>
        Add {config.hour_unit} hours to
        {' '}{courses.getIn([String(assign_mode.id),'number'])}
        {' ('}{courses.getIn([String(assign_mode.id),'quarter'])}{')'}
      </span>)
      return (<Button bsSize="xsmall" bsStyle="primary"
                      disabled={disabled}
                      onClick={to => {
                          this.props.onAssign(name,assign_mode.id,
                                              config.hour_unit)}}>
        <Glyphicon glyph="plus"/>{(this.props.detail ? text : "")}
      </Button>)
    }else if(assign_mode.mode === STUDENT && assign_mode.id == name){
      text = "Done"
      return (<Button bsSize="xsmall"
                      disabled={disabled}
                      onClick={to => this.props.onAssignCourse(null)}>
        <span><Glyphicon glyph="ok"/>{(this.props.detail ? text : "")}</span>
      </Button>)
    }else if(assign_mode.mode === STUDENT && assign_mode.id != name){
      text = "Course"
      return (<Button bsSize="xsmall"
               disabled={true}>
        <Glyphicon glyph="plus"/>{(this.props.detail ? text : "")}
      </Button>)
    }
  }
}
const AssignButton = connect(state => {
  return {
    ...documentKeys(state,['courses','assignments']),
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
    let {name,assignments,courses,config,disabled,onFix,
         onUnassign} = this.props
    return (<div>
        {assignments.
         filter(course => course.get('hours')).
           sortBy((c,cid) => courseOrder(cid,courses)).
           map((assign,cid) => {
             let fit = assignFit(assignments,{id: cid, colorby: OVERALL_FIT},
                                 config)

             return (<Col md={2} key={cid}><div className={fit}>
               {courses.getIn([cid,'number'])}-{courses.getIn([cid,'quarter'])}
               {' '}({assign.get('hours')}
               {(this.props.detail ? " hrs/wk" : "")})
               <ButtonGroup>
                 <Button bsSize="xsmall"
                         disabled={disabled || assign.get('fix')}
                         onClick={to => onUnassign(name,cid,
                                                   config.hour_unit)}>
                   <Glyphicon glyph="minus"/>
                 </Button>
                 <Button bsSize="xsmall" disabled={disabled}
                         onClick={to => onFix(name,cid,!assign.get('fix'))}
                         active={assign.get('fix')}>
                   <Glyphicon glyph="magnet"/>
                   {(this.props.detail ? " do not change" : "")}
                 </Button>
               </ButtonGroup>
             </div></Col>)
           }).
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
    },
    onFix: (name,cid,fix) => {
      let dummy = 2+1
      dispatch({
        type: DOCUMENT,
        command: CHANGE,
        field: ASSIGN,
        fix: fix,
        student: name,
        course: cid
      })
    }
  }
})(_Assignments)

function assignFit(assignments,assign_mode,config){
  if(assign_mode.mode !== STANDARD){
    let srank = assignments.getIn([assign_mode.id,'studentRank'],
                                  config.default_student_rank)
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

    if(!this.props.detail){
      return (
        <div className={(unfocused ? "unfocused" : "") + " " +
                        courseFit}>
          <Row>
            <Col md={2}>
              <AssignButton name={name} student={student}
                            detail={false}
                            assignments={assignments}
                            disabled={unfocused ||
                                      (completed &&
                                       !student.get('allow_more_hours'))}/>
              <StudentName disabled={unfocused} name={name}/>
            </Col>
            <Col md={2}>
              <div className={(completed ? "completed" : "uncompleted")}
                   style={{width: "6.8em", height: "2em",
                           display: "inline-block"}}>
                {assigned} of
                <StudentHours name={name} student={student}
                              disabled={unfocused}/>
              </div>
              {' '}<StudentQuarterLoad name={name} student={student}
                                  assignments={assignments}
                                  disabled={unfocused}
                                       detail={false}/>
            </Col>
            <Assignments assignments={assignments} name={name}
                         detail={false}
                         disabled={unfocused}/>
          </Row>
        </div>)
    }
    else{
      return (
        <div className={(unfocused ? "unfocused" : "")}>
          <Well className={courseFit}>
            <CloseButton disabled={unfocused} name={name}/>
            <Row>
              <Col md={2}>
                <StudentName disabled={unfocused} name={name}/>
              </Col>
              <Col md={1}>
                <AssignButton name={name} student={student}
                              detail={true}
                              assignments={assignments}
                              disabled={unfocused ||
                                        (completed &&
                                         !student.get('allow_more_hours'))}/>
              </Col>
              <Col md={2}>
                <div className={(completed ? "completed" : "uncompleted")}
                     style={{width: "11em", height: "2em", display: "inline-block"}}>
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
                                    detail={true}
                                    disabled={unfocused}/>
              </Col>
              <Col md={1}>
                <StudentCohort name={name} student={student}
                               disabled={unfocused}/>
              </Col>
            </Row>
            <Row>
              <Assignments assignments={assignments} name={name}
                           detail={true}
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
    let srank
    let irank
    if(assign){
      srank = assign.get('studentRank',config.default_student_rank)
      irank = assign.get('instructorRank',config.default_instructor_rank)
    }else{
      irank = config.default_instructor_rank
      srank = config.default_student_rank
    }
    return -combineRanksContinuous(srank,irank,assign_mode.orderby,config)
  }
}

function fullyAssignedFn(courses,assignments){
  return (student,name) => {
    return assignmentHours(assignments.get(name,null)) >=
      student.get('total_hours')
  }
}

function studentMatchesFn(search){
  return (student,name) => !search ||
                         name.toUpperCase().match(search.toUpperCase())
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
    this.state = {scrollToTop: false, detail: true}
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
    let order = lastNameAndCohort
    if(assign_mode.mode === COURSE){
      if(assign_mode.orderby !== LAST_NAME)
        order = studentOrderFn(assignments,assign_mode,config)
    }

    let filtered = (!config.hide_completed_students ? students :
                    students.filterNot(fullyAssignedFn(courses,assignments)))
    filtered = filtered.filter(studentMatchesFn(this.state.search))

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
        {filtered.sortBy(order).map((student,name) =>
          <Student key={name} name={name} detail={this.state.detail}
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
