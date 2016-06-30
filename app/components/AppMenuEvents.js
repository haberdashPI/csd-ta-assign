import React, {Component, PropTypes} from 'react';
import {Map, List} from 'immutable'
import {Grid, Row, Col, Panel} from 'react-bootstrap'
import {connect} from 'react-redux';
import {ActionCreators as UndoActionCreators} from 'redux-undo'
import {documentData,isClean,docToJSON,docFromJSON} from '../reducers/document'

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
    let data = docToJSON(this.props.document.present.data)
    fs.writeFile(filename,JSON.stringify(data),err => {
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

  render(){
    this.updateMenus()
    this.updateTitle()
    return <span/>
  }
}
export default connect(state => {
  // NOTE: data is here solely so that this component
  // updates when the document changes (so the menus and title
  // can be changed appropriately)
  return {document: state.document, data: documentData(state)}
})(AppMenuEvents)
