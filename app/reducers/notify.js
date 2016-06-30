import {ERROR} from './commands'

export function notifyMiddelware(notifyPromise){
  return store => next => action => {
    if(action.confirm && !action.confirmed){
      notifyPromise.then(notify =>
        notify.addNotification({
          message: action.confirm.message || action.confirm,
          level: 'warning',
          position: 'tr',
          autoDismiss: 10,
          title: action.confirm.title || '',
          action: {
            label: action.confirm.button || 'Yes',
            callback: () => store.dispatch({...action, confirmed: true})
          }
        }))
    }
    else if(action.type === ERROR){
      notifyPromise.then(notify =>
        notify.addNotification({
          message: action.message,
          level: 'error',
          position: 'tl',
          autoDismiss: 0,
          title: action.title || 'Error!'
        }))
    }
    else{
      next(action)
    }
  }
}
