
export function notifyMiddelware(notifyPromise){
  return store => next => action => {
    if(action.confirm && !action.confirmed){
      notifyPromise.then( notify =>
        notify.addNotification({
          message: action.confirm.message || action.confirm,
          level: 'warning',
          position: 'tr',
          autoDismiss: 10,
          action: {
            label: action.confirm.button || 'Yes',
            callback: () => store.dispatch({...action, confirmed: true})
          }
        }))
    }else{
      next(action)
    }
  }
}
