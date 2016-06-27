import {Map} from 'immutable'

function initialConfig(){
  return {
    hour_unit: 7.5
  }
}

export default function assign_mode(state = initialConfig(),action){
  return state
}
