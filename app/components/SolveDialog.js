import React, {Component, PropTypes} from 'react';
import {Map, List} from 'immutable'
import {Grid, Row, Col, Button, ButtonGroup, Input,
        Modal, Checkbox} from 'react-bootstrap'
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

var prefix = (process.platform !== 'win32' ? "/tmp/" : "\\\\.\\pipe\\")
var port = prefix+"NUCSD_TA_ASSIGN_v1_z1NSUX6F"

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
      quarter_max_courses: 1,
      student_weight: 1,
      student_extrahour_weight: 1.5,
      instructor_weight: 1.5,
      default_instructor_rank: config.default_instructor_rank,
      default_student_rank: config.default_student_rank,
      max_extra_over_units: 1,
      max_over_units: 0,
      max_under_units: 1,
      closeto: false,
      differentfrom: false,
      rank_weight: 1,
      hour_weight: 1,
      count_weight: 1
    }
  }

  render(){
    let {preparing,endSolve,runSolve,document} = this.props
    return (<Modal show={preparing} onHide={endSolve}>
      <MHeader closeButton>
        <MTitle>Find a solution…</MTitle>
      </MHeader>
      <MBody>
        <h4>Hourly Limits</h4>
        <ul>
          <li>At most
            <Editable onChange={to => this.setState({
                max_units: to/7.5})}
                      validate={(x) => x % this.state.hour_unit === 0}>
              {this.state.max_units*7.5}
            </Editable> hours/week per assignment.
          </li>

          <li>At most
            <Editable onChange={to => this.setState({
                quarter_max_units: to/7.5})}
                      validate={(x) => x % this.state.hour_unit === 0}>
              {this.state.quarter_max_units*7.5}
            </Editable> hours/week for each student, per quarter.
          </li>

          <li>At most
            <Editable onChange={to => this.setState({
                quarter_max_courses: Number(to)})}
                      validate={(x) => x % 1 === 0 && x > 0}>
              {this.state.quarter_max_courses}
            </Editable> course(s) for each student, per quarter.
          </li>

          <li>Willing students will take no more than
            <Editable onChange={to => this.setState({
                max_extra_over_units: to/7.5})}
                      validate={(x) => x % this.state.hour_unit === 0}>
              {this.state.max_extra_over_units*7.5}
            </Editable>
            extra hours/week.
          </li>

          <li>Student will receive no more than
            <Editable onChange={to => this.setState({
                max_under_units: to/7.5})}
                      validate={(x) => x % this.state.hour_unit === 0}>
              {this.state.max_under_units*7.5}
            </Editable>
            fewer hours/week than their expected amount.
          </li>
        </ul>

        <h4>Preferences</h4>
        <ul>
          <li>Assignment preferences have an importance of
            <Editable onChange={to => this.setState({
                rank_weight: Number(to)})}
                      validate={(x) => !isNaN(x)}>
              {this.state.rank_weight}
            </Editable>
          </li>

          <li>Minimizing the number of courses a student receives
            has an importance of
            <Editable onChange={to => this.setState({
                count_weight: Number(to)})}
                      validate={x => !isNaN(x)}>
              {this.state.count_weight}
            </Editable>
          </li>

          <li>Maintaining the preferred load of hours across quarters
            has an importance of
            <Editable onChange={to => this.setState({
                hour_weight: Number(to)})}
                      validate={x => !isNaN(x)}>
              {this.state.hour_weight}
            </Editable>.
          </li>

          <li>Instructor preferences have an importance of
            <Editable onChange={to => this.setState({
                instructor_weight: Number(to)})}
                      validate={(x) => !isNaN(x)}>
              {this.state.instructor_weight}
            </Editable>.
          </li>

          <li>Student preferences have an importance of
            <Editable onChange={to => this.setState({
                student_weight: Number(to)})}
                      validate={(x) => !isNaN(x)}>
              {this.state.student_weight}
            </Editable>
            when they <strong>will not</strong> take extra hours.
          </li>

          <li>Student preferences have an importance of
            <Editable onChange={to => this.setState({
                student_extrahour_weight: Number(to)})}
                      validate={(x) => !isNaN(x)}>
              {this.state.student_extrahour_weight}
            </Editable>
            when they <strong>will</strong> take extra hours.
          </li>
        </ul>

        <h4>Relationship to Existing solution</h4>
        <p><em>The following options are only useful if you have already found a
          complete or mostly complete solution.</em></p>
        <Checkbox checked={this.state.closeto}
                  onClick={e => this.setState({
                      closeto: !this.state.closeto,
                      // all close solutions must be different
                      differentfrom: (this.state.closeto ?
                                      this.state.differentfrom : true)
                    })}>
          Find a similar (but different) solution.
        </Checkbox>
        <Checkbox checked={this.state.differentfrom}
                  onClick={e => this.setState({
                      differentfrom: !this.state.differentfrom,
                      // all close solutions must be different
                      closeto: (this.state.differentfrom ?
                                false : this.state.closeto)
                    })}>
          Find a different solution.
        </Checkbox>

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
          message: "An error occurred while connecting "+
		  "to the solver. It may take some time for the "+
		  "solver to start up. If you just opened the program, "+
		  "try again in a few seconds. If "+
		  "the problem persists, you may need to reinstall "+
		  "the program. Error details: \n"+String(err)
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
