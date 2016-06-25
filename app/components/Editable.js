import React, {Component, PropTypes} from 'react';
import {findDOMNode} from 'react-dom';

import {Autosize} from 'react-input-enhancements'

function getTextWidth(text, font){
    // if given, use cached canvas for better performance
    // else, create new canvas
  let canvas = getTextWidth.canvas ||
               (getTextWidth.canvas = document.createElement("canvas"));
  let context = canvas.getContext("2d");
  context.font = font;
  let metrics = context.measureText(text);
  return metrics.width;
}

export class EditableArea extends Component{
  constructor(props){
    super(props)
    this.state = {
      edited: String(props.children),
      lastwidth: 200,
      lastheight: 50
    }
  }

  startEditing(){
    let element = findDOMNode(this._field)
    this.setState({
      editing: true,
      edited: String(this.props.children),
      lastwidth: Math.max(200,element.offsetWidth),
      lastheight: Math.max(50,element.offsetHeight)
    },() => this._area.select())
  }

  finishEditing(passed){
    this.setState({editing: false})
    if(this.state.edited !== this.props.children)
      this.props.onChange(this.state.edited)
  }
  cancelEditing(){
    this.setState({editing: false})
    if(this.props.onCancel) this.props.onCancel()
  }

  handleKeys(event){
    if(event.keyCode === 13){
      this.finishEditing()
    }else if(event.keyCode === 27){
      this.cancelEditing()
    }
  }

  render(){
    if(!this.state.editing){
      return (<div className="editable_field"
                   style={{minWidth: 100, minHeight: 10}}
                   onClick={() => this.startEditing()}
                   ref={c => this._field = c}>
        <p>{this.props.children}</p>
      </div>)
    }else{
      return (<textarea className={"editable_input"}
                        placeholder={this.props.placeholder}
                        autoFocus={this.props.selectedByDefault}
                        onChange={e => this.setState({edited: e.target.value})}
                        value={this.state.edited}
                        style={{
                          width: this.state.lastwidth,
                          height: this.state.lastheight
                        }}
                        onKeyDown={e => this.handleKeys(e)}
                        onBlur={() => this.finishEditing()}
                        ref={(c) => this._area = c}/>)
    }
  }
}

export class Editable extends Component{
  constructor(props){
    super(props)
    if(!this.props.selectedByDefault)
      this.state = {edited: String(props.children), editing: false}
    else
      this.state = {edited: "", editing: true}
  }

  startEditing(){
    this.setState({editing: true, edited: String(this.props.children)},
                  () => this._input.select())
  }

  finishEditing(passed){
    this.setState({editing: false})
    if(this.validate() !== 'error'){
      if(this.state.edited !== this.props.children)
        this.props.onChange(this.state.edited)
    }else if(this.props.onCancel) this.props.onCancel()
  }
  cancelEditing(){
    this.setState({editing: false})
    if(this.props.onCancel) this.props.onCancel()
  }

  handleKeys(event){
    if(event.keyCode === 13 || event.keyCode === 9){
      this.finishEditing()
    }else if(event.keyCode === 27){
      this.cancelEditing()
    }
  }

  validate(){
    if(this.props.validate){
      return (!this.props.validate(this.state.edited) ? 'error' : '')
    }
    return ''
  }

  render(){
    if(!this.state.editing){
      return (<div className="editable_field"
                   onClick={() => this.startEditing()}>
        {this.props.children}
      </div>)
    }else{

      return (<Autosize value={this.state.edited}
                        onChange={e => this.setState({edited: e.target.value})}
                        defaultWidth={10}>
        <input className={"editable_input " + this.validate()}
                     placeholder={this.props.placeholder}
                     autoFocus={this.props.selectedByDefault}
                     value={this.state.edited}
                     onKeyDown={e => this.handleKeys(e)}
                     onBlur={() => this.finishEditing()}
                     ref={(c) => this._input = c}/>
      </Autosize>)
    }
  }
}

function showDropdown(selectComponent){
  let element = findDOMNode(selectComponent)
  let event = document.createEvent('MouseEvents')
  event.initMouseEvent('mousedown', true, true, window)
  element.dispatchEvent(event)
}

export class Selectable extends Component{
  constructor(props){
    super(props)
    this.state = {editing: false}
  }

  startEditing(){
    this.setState({editing: true},() => showDropdown(this._select))
  }

  finishEditing(value){
    this.setState({editing: false})
    if(value !== this.props.value) this.props.onChange(value)
  }

  cancelEditing(){
    this.setState({editing: false})
    this.props.onCancel()
  }

  render(){
    if(!this.state.editing){
      return (<div className="editable_field"
                   onClick={() => setTimeout(this.startEditing(),250)}>
        {this.props.children}
      </div>)
    }else{
      return (<select className="editable_input"
                      autoFocus={this.props.selectedByDefault}
                      value={this.props.children}
                      ref={c => this._select = c}
                      onChange={e => this.finishEditing(e.target.value)}
                      onBlur={() => this.finishEditing()}>
        {this.props.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>)
    }
  }
}
