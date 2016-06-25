import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import TAAssignments from './components/TAAssignments';
import rootReducer from './reducers';

import './index.less'

const store = createStore(rootReducer)

render(
  <Provider store={store}>
    <TAAssignments/>
  </Provider>,
  document.getElementById('root')
);
