import {Map, List, zip} from 'immutable'
import _ from 'underscore'

export default class DoubleMap{
  constructor(obj,literal=false){
    if(literal){
      this.val = obj
    }else{
      if(!obj) obj = Map()
      let a = Map().asMutable()
      let b = Map().asMutable()
      obj.forEach((v,k) => {
        a.setIn([k.get(0),k.get(1)],v)
        b.setIn([k.get(1),k.get(0)])
      })

      this.val = List([a.asImmutable(),b.asImmutable()])
    }
  }

  static combineValues(obj){
    let result = new DoubleMap().asMutable()
    for(let valuekey of _.keys(obj)){
      for(let [a,b] of obj[valuekey].keys()){
        result.update(a,b,Map(),x => x.set(valuekey,obj[valuekey].get(a,b)))
      }
    }
    return result.asImmutable()
  }

  asMutable(){
    return new DoubleMap(this.val.asMutable(),true)
  }
  asImmutable(){
    return new DoubleMap(this.val.asImmutable(),true)
  }
  withMutations(fn){
    return fn(this.asMutable()).asImmutable()
  }

  get(a,b){
    if(a && b)
      return this.val.getIn([0,a,b])
    else if(a)
      return (this.val.getIn([0,a]) || Map())
    else if(b)
      return (this.val.getIn([1,b]) || Map())
    else
      throw "Both keys are falsey"
  }

  set(a,b,to){
    if(a && b){
      return new DoubleMap(this.val.withMutations(v => {
        v.setIn([0,a,b],to)
        v.setIn([1,b,a],to)
        return v
      }),true)
    }
    else if(a){
      return new DoubleMap(this.val.withMutations(v => {
        v.setIn([0,a],to)
        to.forEach((toitem,b) => v.setIn([1,b,a],toitem))
        return v
      }),true)
    }
    else if(b){
      return new DoubleMap(this.val.withMutations(v => {
        to.forEach((toitem,a) => v.setIn([0,a,b],toitem))
        v.setIn([1,b],to)
        return v
      }),true)
    }
    else throw "Both keys are falsey"
  }

  update(a,b,def,fn){
    if(!fn){
      fn = def
      def = undefined
    }

    if(a && b){
      return new DoubleMap(this.val.withMutations(v => {
        v.updateIn([0,a,b],def,fn)
        v.updateIn([1,b,a],def,fn)
        return v
      }),true)
    }
    else if(a){
      if(def) throw "Cannot have default with falsey a key."
      return new DoubleMap(this.val.withMutations(v => {
        v.updateIn([0,a],bs => bs.map(fn))
        v.update(1,bs => bs.map(b => b.update(a,fn)))
        return v
      }),true)
    }
    else if(b){
      if(def) throw "Cannot have default with falsey b key."
      return new DoubleMap(this.val.withMutations(v => {
        v.update(0,as => as.map(a => a.update(b,fn)))
        v.updateIn([1,b],as => as.map(fn))
        return v
      }),true)
    }
    else{
      return "Both keys are falsey."
    }
  }

  delete(a,b){
    if(a && b){
      return new DoubleMap(this.val.withMutations(v => {
        v.deleteIn([0,a,b])
        v.deleteIn([1,b,a])
        return v
      }),true)
    }
    else if(a){
      return new DoubleMap(this.val.withMutations(v => {
        v.deleteIn([0,a])
        v.update(1,bs => bs.map(b => b.delete(a)))
        return v
      }),true)
    }
    else if(b){
      return new DoubleMap(this.val.withMutations(v => {
        v.update(0,as => as.map(a => a.delete(b)))
        v.deleteIn([1,b])
        return v
      }),true)
    }
    else{
      throw "Both keys are falsey"
    }
  }
  keys(){
    let result = List().asMutable()
    this.val.get(0).forEach((vs,ka) => {
      vs.forEach((v,kb) => {
        result.push([ka,kb])
      })
    })

    return result
  }
}
