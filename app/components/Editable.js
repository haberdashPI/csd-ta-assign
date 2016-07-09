import React, {Component, PropTypes} from 'react';
import {findDOMNode} from 'react-dom';
import _ from 'underscore'

import {Autosize, Combobox} from 'react-input-enhancements'

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
                   onClick={() => (this.props.disabled ? null :
                                   this.startEditing())}
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
                   onClick={() => (this.props.disabled ? null :
                                   this.startEditing())}>
        {this.props.children}
      </div>)
    }else{

      return (<Autosize value={(this.state.edited ? this.state.edited : "")}
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

export class Selectable extends Component{
  render(){
    let options = []
    for(let key of _.keys(this.props.children)){
      options.push({text: this.props.children[key], value: key})
    }

    return (
      <Combobox value={String(this.props.value)}
                onValueChange={x => this.props.onChange(x)}
                options={options}
                defaultWidth={10}

                placeholder={this.props.placeholder}
                autoFocus={this.props.selectedByDefault}
                autosize autocomplete>
        {(iprops,{matchingText,width}) =>
          <input type="text" {...iprops}
                 className={"editable_field"}/>}

      </Combobox>)
  }
}
