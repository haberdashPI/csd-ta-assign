import React, {Component, PropTypes} from 'react';
import {Map, List} from 'immutable'
import {Grid, Row, Col, Button, ButtonGroup, Input,
        Modal} from 'react-bootstrap'
import {connect} from 'react-redux';
import {SOLVE, SOLVE_SETUP, ERROR} from '../reducers/commands'
import {documentData,docFromJSON,docToJSON} from '../reducers/document'

import {Editable,Selectable} from './Editable'

// node.js stuff...
import net from 'net'
import StreamArray from 'stream-json/utils/StreamArray'

const MHeader = Modal.Header
const MFooter = Modal.Footer
const MTitle = Modal.Title
const MBody = Modal.Body

var port = "/tmp/NUCSD_TA_ASSIGN_v4_z1NSUX6F"

class _SolveDialog extends Component{
  static propTypes = {
    config: PropTypes.object.isRequired,
    document: PropTypes.instanceOf(Map).isRequired,
    runSolve: PropTypes.func.isRequired,
    endSolve: PropTypes.func.isRequired,
    preparing: PropTypes.bool.isRequired
  }

  constructor(props){
    super(props)
    let config = this.props.config
    this.state = {
      solving: false,
      hour_unit: config.hour_unit,
      max_units: 2,
      quarter_max_units: 2,
      student_weight: 1,
      student_extrahour_weight: 2,
      instructor_weight: 2,
      default_instructor_rank: config.default_instructor_rank,
      default_student_rank: config.default_student_rank,
      max_extra_over_units: 1,
      max_over_units: 0,
      max_under_units: 1
    }
  }

  render(){
    let {preparing,endSolve,runSolve,document} = this.props
    return (<Modal show={preparing} onHide={endSolve}>
      <MHeader closeButton>
        <MTitle>Solution Constraints</MTitle>
      </MHeader>
      <MBody>
        <p><strong>Units</strong> = {this.state.hour_unit} hours</p>
        <ul>
          <li>There will be at most
            <Editable onChange={to => this.setState({
                max_units: Number(to)})}
                      validate={(x) => Math.round(x) === Number(x)}>
              {this.state.max_units}
            </Editable> units in one assignment.
          </li>

          <li>There will be at most
            <Editable onChange={to => this.setState({
                quarter_max_units: Number(to)})}
                      validate={(x) => Math.round(x) === Number(x)}>
              {this.state.quarter_max_units}
            </Editable> units in one quarter for a student.
          </li>

          <li>Student preferences will be multiples by
            <Editable onChange={to => this.setState({
                student_weight: Number(to)})}
                      validate={(x) => Math.round(x) === Number(x)}>
              {this.state.student_weight}
            </Editable>
            when they do not want any extra hours.
          </li>

          <li>Student preferences will be multipled by
            <Editable onChange={to => this.setState({
                student_extrahour_weight: Number(to)})}
                      validate={(x) => Math.round(x) === Number(x)}>
              {this.state.student_extrahour_weight}
            </Editable>
            when they are willing to take extra hours.
          </li>

          <li>Students who volunteer will get a maximum of
            <Editable onChange={to => this.setState({
                max_extra_over_units: Number(to)})}
                      validate={(x) => Math.round(x) === Number(x)}>
              {this.state.max_extra_over_units}
            </Editable>
            extra unit(s).
          </li>

          <li>Instructor preferences are multipled by
            <Editable onChange={to => this.setState({
                instructor_weight: Number(to)})}
                      validate={(x) => Math.round(x) === Number(x)}>
              {this.state.instructor_weight}
            </Editable>
          </li>

          <li>When there are too few hours to give all students enough,
            students can be
            <Editable onChange={to => this.setState({
                max_under_units: Number(to)})}
                      validate={(x) => Math.round(x) === Number(x)}>
              {this.state.max_under_units}
            </Editable>
            units below the expected amount.
          </li>
        </ul>
        <Button bsStyle="primary"
                onClick={() => runSolve(this.state,document,this)}
                disabled={this.state.solving}>
          {(this.state.solving ? "Solving..." : "Find Solution")}
        </Button>
      </MBody>
    </Modal>)
  }
}
export default connect(state => {
  return {
    config: state.config,
    document: documentData(state),
    preparing: state.solve.preparing
  }
},dispatch => {
  return {
    runSolve: (config,document,component) => {
      component.setState({solving: true})
      let response = StreamArray.make()

      let client = net.connect({path: port}, () => {
        console.log("connected to solver...")
        client.pipe(response.input)
        client.write(JSON.stringify({
          type: "solve",
          problem: docToJSON(document),
          prefs: config
        }) + "\n")
      }).on('error',err => {
        dispatch({
          type: ERROR,
          message: String(err)
        })
        component.setState({solving: false})
      })

      response.output.on('data',data => {
        client.end()
        console.log("recieving solver result...")
        if(data.value.result === 'optimal'){
          dispatch({
            type: SOLVE,
            document: docFromJSON(data.value.solution)
          })
        }else if(data.value.result === "infeasible"){
          dispatch({
            type: ERROR,
            message: "There is no viable solution, "+
                     "adjust the problem and try again."
          })
        }else if(data.value.result === "error"){
          dispatch({
            type: ERROR,
            message: data.value.message
          })
        }else{
          dispatch({
            type: ERROR,
            message: "Unexpected result type: "+data.value.result
          })
        }
        component.setState({solving: false})
      }).on('error',err => {
        dispatch({
          type: ERROR,
          message: "Streaming error: "+String(err)
        })
        component.setState({solving: false})
      })
    },
    endSolve: config => dispatch({
      type: SOLVE_SETUP,
      end: true
    })
  }
})(_SolveDialog)
