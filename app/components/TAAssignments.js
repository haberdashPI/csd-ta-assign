import React, {Component, PropTypes} from 'react';
import {Map, List} from 'immutable'
import {Grid, Row, Col, Panel} from 'react-bootstrap'
import {connect} from 'react-redux';
import SplitPane from 'react-split-pane'

import Students from './Students'
import Instructors from './Instructors'
import InfoBadge from './InfoBadge'

export default class TAAssignments extends Component {
  constructor(props){
    super(props)
    this.state = {splitHeight: 300}
    this.handleResize = this.handleResize.bind(this)
  }

  componentDidMount(){
    window.addEventListener('resize',this.handleResize)
  }

  componentWillUnmount(){
    window.removeEventListener('resize',this.handleResize)
  }

  handleResize(){
    this.forceUpdate()
  }

  render() {
    return (<div>
      {/* Small informational header */}
      <InfoBadge/>

      <SplitPane split="horizontal" minSize={100}
                 defaultSize={this.state.splitHeight} primary="second"
                 onChange={size => this.setState({splitHeight: size})}>
        <div style={{
          overflow: "scroll",
          padding: "1em",
          borderBottom: "4px double",
          height: window.innerHeight - this.state.splitHeight,
        }}>
          <Instructors/>
        </div>

        <div style={{
          overflow: "scroll",
          padding: "1em",
          width: "100vw"
        }}>
          <Students/>
        </div>
      </SplitPane>
    </div>)
  }
}
