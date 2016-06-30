import React, {Component, PropTypes} from "react"
import {Map, List} from "immutable"
import {Button, Grid, Row, Col, Panel} from "react-bootstrap"
import {connect} from "react-redux"

import {STUDENT,COURSE,STANDARD,ASSIGN_MODE,
        ASSIGN_DISPLAY, ORDERBY, COLORBY,
        OVERALL_FIT, LAST_NAME, CONFIG} from "../reducers/commands"
import {documentKeys} from '../reducers/document'
import {Selectable} from "./Editable"

// TODO: ask user if they want to change defaults when the
// badge closes automatically (becuase the hours have been completed)

class _InfoBadge extends Component{
  static propTypes = {
    assign_mode: PropTypes.object.isRequired,
    courses: PropTypes.instanceOf(Map).isRequired,
    config: PropTypes.object.isRequired,

    onClearAssign: PropTypes.func.isRequired,
    onColorbyChange: PropTypes.func.isRequired,
    onOrderbyChange: PropTypes.func.isRequired
  }
  render(){
    let {assign_mode,courses,config,onClearAssign,onColorbyChange,
         onOrderbyChange} = this.props

    if(assign_mode.mode == STUDENT){
      return (<div className="infobadge">
        <div style={{float: "right"}}>
          <Button inline onClick={() => onClearAssign(assign_mode,config)}>
            Done
          </Button>
        </div>
        <p style={{padding: "0.5em"}}>
          Adding courses for {assign_mode.id}.
          Color by{" "}
          <Selectable onChange={to => onColorbyChange(to)}
                      value={assign_mode.colorby}>
            {{OVERALL_FIT: "Overall fit",
              STUDENT: "TA fit",
              COURSE: "Instructor fit"}}
          </Selectable>{". "}
          Order by{" "}
          <Selectable onChange={to => onOrderbyChange(to)}
                      value={assign_mode.orderby}>
            {{LAST_NAME: "Last name",
              OVERALL_FIT: "Overall fit",
              STUDENT: "TA fit",
              COURSE: "Instructor fit"}}
          </Selectable>{"."}
        </p>
      </div>)

    }else if(assign_mode.mode === COURSE){
      return (<div className="infobadge">
        <div style={{float: "right"}}>
          <Button inline onClick={() => onClearAssign(assign_mode,config)}>
            Done
          </Button>
        </div>
        <p style={{padding: "0.5em"}}>
          Adding TAs for {courses.getIn([assign_mode.id,"name"])}
          {" "}({courses.getIn([assign_mode.id,"quarter"])})
          Color by{" "}
          <Selectable onChange={to => onColorbyChange(to)}
                      value={assign_mode.colorby}>
            {{OVERALL_FIT: "Overall fit",
              STUDENT: "TA fit",
              COURSE: "Instructor fit"}}
          </Selectable>{". "}
          Order by{" "}
          <Selectable onChange={to => onOrderbyChange(to)}
                      value={assign_mode.orderby}>
            {{LAST_NAME: "Last name",
              OVERALL_FIT: "Overall fit",
              STUDENT: "TA fit",
              COURSE: "Instructor fit"}}
          </Selectable>{"."}
        </p>
      </div>)
    }else{
      return null
    }
  }
}
export default connect(state => {
  return {
    ...documentKeys(state,["courses"]),
    assign_mode: state.assign_mode,
    config: state.config
  }
},dispatch => {
  return {
    onClearAssign: (assign_mode,config) => {
      if(config.default_colorby[assign_mode.mode] !== assign_mode.colorby ||
         config.default_orderby[assign_mode.mode] !== assign_mode.orderby){
        let default_colorby = {...config.default_colorby}
        let default_orderby = {...config.default_orderby}
        default_colorby[assign_mode.mode] = assign_mode.colorby
        default_orderby[assign_mode.mode] = assign_mode.orderby
        dispatch({
          type: CONFIG,
          confirm: "Use this same ordering and coloring for next time?",
          to: {
            default_colorby: default_colorby,
            default_orderby: default_orderby
          }
        })
      }
      dispatch({type: ASSIGN_MODE, mode: STANDARD})
    },
    onOrderbyChange: to => {
      dispatch({type: ASSIGN_DISPLAY, field: ORDERBY, value: to})
    },
    onColorbyChange: to => {
      dispatch({type: ASSIGN_DISPLAY, field: COLORBY, value: to})
    }
  }
})(_InfoBadge)
