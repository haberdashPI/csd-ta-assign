import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import NotificationSystem from 'react-notification-system';

import TAAssignments from './components/TAAssignments';
import createRootStore from './reducers';

import './index.less'

var provideNotify = null
const notifyPromise = new Promise((resolve,reject) => provideNotify = resolve)
const store = createRootStore(notifyPromise)

render(
  <div>
  <Provider store={store}>
    <TAAssignments/>
  </Provider>
  <NotificationSystem ref={(notifier) => provideNotify(notifier)}/>
  </div>,
  document.getElementById('root')
);
