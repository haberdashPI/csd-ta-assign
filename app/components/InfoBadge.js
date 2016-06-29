import React, {Component, PropTypes} from 'react'
import {Map, List} from 'immutable'
import {Button, Grid, Row, Col, Panel} from 'react-bootstrap'
import {connect} from 'react-redux'

import {STUDENT,COURSE,STANDARD,ASSIGN_MODE} from '../reducers/commands'
import {subkeys} from '../util/assignment'

// TODO: ask the user if they would like to change the default fit type
// if it's changed form the default.

class _InfoBadge extends Component{
  static propTypes = {
    assign_mode: PropTypes.object.isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,

    onClearAssign: PropTypes.func.isRequired
  }
  render(){
    let {assign_mode,courses,onClearAssign} = this.props

    if(assign_mode.mode == STUDENT){
      return (<div className="infobadge">
        <div style={{float: "right"}}>
          <Button inline onClick={() => onClearAssign()}>Done</Button>
        </div>
        <p style={{padding: "0.5em"}}>
          Currently adding courses for {assign_mode.id}.

        </p>
      </div>)

    }else if(assign_mode.mode === COURSE){
      return (<div className="infobadge">
        <div style={{float: "right"}}>
          <Button inline onClick={() => onClearAssign()}>Done</Button>
        </div>
        <p style={{padding: "0.5em"}}>
          Currently adding TAs for {courses.getIn([assign_mode.id,'name'])}
          {" "}({courses.getIn([assign_mode.id,'quarter'])})
        </p>
      </div>)
    }else{
      return null
    }
  }
}
export default connect(state => {
  return {
    ...subkeys(state.document,['courses']),
    assign_mode: state.assign_mode
  }
},dispatch => {
  return {
    onClearAssign: () => {
      dispatch({type: ASSIGN_MODE, mode: STANDARD})
    }
  }
})(_InfoBadge)
