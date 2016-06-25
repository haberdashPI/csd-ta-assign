import React, {Component, PropTypes} from 'react';
import {Map, List} from 'immutable'
import {Grid, Row, Col, Panel} from 'react-bootstrap'
import {connect} from 'react-redux';

import Students from './Students'
import Instructors from './Instructors'

export default class TAAssignments extends Component {
  render() {
    return (<div>
      {/* The instructors */}
      <div style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw",
        height: "65vh",
        overflow: "scroll",
        padding: "1em"
      }}>
        <Instructors/>
      </div>

      {/* The TAs */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0,
        width: "100vw",
        height: "35vh",
        overflow: "scroll",
        background: "rgb(255,255,255)",
        borderTopStyle: "solid",
        borderTopWidth: "1px",
        padding: "1em"
      }}>
        <Students/>
      </div>
    </div>)
  }
}
