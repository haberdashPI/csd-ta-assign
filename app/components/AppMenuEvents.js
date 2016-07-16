import React, {Component, PropTypes} from 'react';
import {Map, List} from 'immutable'
import {Grid, Row, Col, Panel} from 'react-bootstrap'
import {connect} from 'react-redux';
import {ActionCreators as UndoActionCreators} from 'redux-undo'
import {documentData,isClean,docToJSON,docFromJSON,docToCSV} from '../reducers/document'
import _ from 'underscore'

// TODO: allow loading of student, course and instructor data

// node.js specific modules (all code specific to this program being on the
// filesystem is in this one file)
import {ipcRenderer as electron} from 'electron'
import fs from 'fs'
import {parse as fileparse} from 'path'

const APP_TITLE = "NU CSD TA Assignment Manager"
const INIT_FILE_NAME = "Untitled"

import {FILE_LOAD, FILE_SAVED, FILE_CLEAR, ERROR} from '../reducers/commands'
class AppMenuEvents extends Component {
  static propTypes = {
    document: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired
  }

  constructor(props){
    super(props)
    this.state = {filename: INIT_FILE_NAME}
  }

  componentDidMount(){
    document.title = `${APP_TITLE} - ${fileparse(this.state.filename).name}`

    electron.on('open',(e,file) => this.openFile(file))
    electron.on('save',(e,file) => this.saveFile(file))
    electron.on('exportcsv',(e,file) => this.exportFile(file))
    electron.on('new',(e) => this.newFile())

    electron.on('undo',() =>
      this.props.dispatch(UndoActionCreators.undo()))
    electron.on('redo',() =>
      this.props.dispatch(UndoActionCreators.redo()))

    this.updateMenus()
  }

  componentWillUnmount(){
    electron.removeAllListeners('open')
    electron.removeAllListeners('save')
    electron.removeAllListeners('exportcsv')
    electron.removeAllListeners('new')

    electron.removeAllListeners('undo')
    electron.removeAllListeners('redo')
  }

  updateTitle(){
    document.title = `${APP_TITLE} - ${fileparse(this.state.filename).name}` +
                      (!isClean(this.props.document) ? '*' : '')
  }

  updateMenus(){
    let {document} = this.props
    let enabled = {
      undo: document.undo.past.length > 0,
      redo: document.undo.future.length > 0,

      newFile: true,
      open: true,
      save: !isClean(document),
      saveAs: true,
      fastQuit: isClean(document)
    }
    electron.send('setMenuEnable',enabled)
  }

  newFile(){
    this.props.dispatch({type: FILE_CLEAR})
    this.setState({filename: 'Untitled'})
    electron.send('setCurrentFile',null)
  }

  openFile(filename){
    fs.readFile(filename,'utf8',(err,data) => {
      if(err){
        this.props.dispatch({
          type: ERROR,
          message: `Exception opening ${filename}: ${err.message}`
        })
      }
      else{
        try{
          this.props.dispatch({
            type: FILE_LOAD,
            data: docFromJSON(JSON.parse(data))
          })
          this.setState({filename: filename})
        }catch(e){
          this.props.dispatch({
            type: ERROR,
            message: `Error reading ${filename}: ${e.message}`
          })
        }
      }
    })
  }

  saveFile(filename){
    filename = (fileparse(filename).ext ? filename : filename + ".taa")
    let data = docToJSON(this.props.data)
    fs.writeFile(filename,JSON.stringify(data,null,2),err => {
      if(err){
        this.props.dispatch({
          type: ERROR,
          message: `Exception saving ${filename}: ${err.message}`
        })
      }
      else{
        electron.send('setCurrentFile',filename)
        this.props.dispatch({type: FILE_SAVED})
        this.setState({filename: filename})
      }
    })
  }

  exportFile(filename){
    filename = (fileparse(filename).ext ? filename : filename + ".csv")
    let data = docToCSV(this.props.data)
    fs.writeFile(filename,data,err => {
      if(err){
        this.props.dispatch({
          type: ERROR,
          message: `Exception while saving ${filename}: ${err.message}`
        })
      }
      console.log(`Document exported to ${filename}.`)
    })
  }

  render(){
    this.updateMenus()
    this.updateTitle()
    return <span/>
  }
}
export default connect(state => {
  return {document: state.document, data: documentData(state)}
})(AppMenuEvents)
