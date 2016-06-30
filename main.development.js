import electron, { app, BrowserWindow, Menu, shell } from 'electron'
import path from 'path'

let menu;
let template;
let mainWindow = null;
let fastQuit = true;

if (process.env.NODE_ENV === 'development') {
  require('electron-debug')(); // eslint-disable-line global-require
}


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


app.on('ready', () => {
  var currentDirectory = __dirname;
  var currentFile = null;

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728
  });

  mainWindow.loadURL(`file://${__dirname}/app/app.html`);
  mainWindow.maximize();

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close',(e)=> {
    if (!fastQuit &&
        electron.dialog.showMessageBox(mainWindow,{
          type: "warning",
          buttons: ['Yes','No'],
          title: "Really Quit?",
          message: 'This document has unsaved changes '+
                    'Are you sure you want to quit?',
        }) == 1){
      // don't quit...
      e.preventDefault()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  electron.ipcMain.on('setCurrentFile',function(event,filename){
    if(filename){
      currentFile = filename
      currentDirectory = path.dirname(filename)
    }else{
      currentFile = null
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.openDevTools();
  }

  function saveFile(focusedWindow){
    var filename = electron.dialog.showSaveDialog(focusedWindow,{
      title: 'Save File',
      defaultPath: currentDirectory,
      filters: [{name: 'Schedules', extensions: ['sch']},
                {name: 'All Files', extensions: ['*']}]
    })
    if(filename){
      currentDirectory = path.dirname(filename)
      currentFile = filename
      focusedWindow.webContents.send('save',filename)
    }
  }

  template = [
    {
    label: 'File',
    submenu: [
      {
        label: 'New',
        enabled: false,
        accelerator: 'CmdOrCtrl+N',
        click: function(item,focusedWindow){
          if(focusedWindow &&
            (fastQuit ||
             electron.dialog.showMessageBox(mainWindow,{
               type: "warning",
               buttons: ['Yes','No'],
               title: " Discard Changes?",
               message: 'This document has unsaved changes. '+
                        'Are you sure you want to create a new file?',
             }) == 0))
            focusedWindow.webContents.send('new')
        }
      },
      {
        label: 'Open',
        enabled: false,
        accelerator: 'CmdOrCtrl+O',
        click: function(item,focusedWindow){
          if(focusedWindow &&
             (fastQuit ||
              electron.dialog.showMessageBox(mainWindow,{
                type: "warning",
                buttons: ['Yes','No'],
                title: "Discard Changes?",
                message: 'This document has unsaved changes. ' +
                         'Are you sure you want to open a file?',
              }) == 0)){
            var filename = electron.dialog.showOpenDialog(focusedWindow,{
              title: 'Open File',
              defaultPath: currentDirectory,
              filters: [{name: 'Schedules', extensions: ['sch']},
                        {name: 'All Files', extensions: ['*']}],
              properties: ['openFile']
            })

            if(filename){
              currentDirectory = path.dirname(filename[0])
              currentFile = filename[0]
              focusedWindow.webContents.send('open',filename[0])
            }
          }
        }
      },
      {
        label: 'Save',
        enabled: false,
        accelerator: 'CmdOrCtrl+S',
        click: function(item,focusedWindow){
          if(focusedWindow){
            if(currentFile) focusedWindow.webContents.send('save',currentFile)
            else saveFile(focusedWindow)
          }
        }
      },
      {
        label: 'Save As…',
        enabled: false,
        accelerator: 'Alt+CmdOrCtrl+S',
        click: function(item,focusedWindow){
          if(focusedWindow) saveFile(focusedWindow)
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Export CSV…',
        enabled: false,
        accelerator: 'Alt+CmdOrCtrl+E',
        click: function(item,focusedWindow){
          if(focusedWindow)
            focusedWindow.webContents.send('exportcsv')
        }
      }
    ]
    },
    {
      label: 'Edit',
      submenu: [{
        label: 'Undo',
        accelerator: 'Command+Z',
        click: function(item,focusedWindow){
          if(focusedWindow)
            focusedWindow.webContents.send('undo')
        }
      }, {
        label: 'Redo',
        accelerator: 'Shift+Command+Z',
        click: function(item,focusedWindow){
          if(focusedWindow)
            focusedWindow.webContents.send('redo')
        }
      }, {
        type: 'separator'
      }, {
        label: 'Cut',
        accelerator: 'Command+X',
        selector: 'cut:'
      }, {
        label: 'Copy',
        accelerator: 'Command+C',
        selector: 'copy:'
      }, {
        label: 'Paste',
        accelerator: 'Command+V',
        selector: 'paste:'
      }, {
        label: 'Select All',
        accelerator: 'Command+A',
        selector: 'selectAll:'
      }]
    }, {
      label: 'View',
      submenu: (process.env.NODE_ENV === 'development') ? [{
        label: 'Reload',
        accelerator: 'Command+R',
        click() {
          mainWindow.webContents.reload();
        }
      }, {
        label: 'Toggle Full Screen',
        accelerator: 'Ctrl+Command+F',
        click() {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      }, {
        label: 'Toggle Developer Tools',
        accelerator: 'Alt+Command+I',
        click() {
          mainWindow.toggleDevTools();
        }
      }] : [{
        label: 'Toggle Full Screen',
        accelerator: 'Ctrl+Command+F',
        click() {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      }]
    }, {
      label: 'Window',
      submenu: [{
        label: 'Minimize',
        accelerator: 'Command+M',
        selector: 'performMiniaturize:'
      }, {
        label: 'Close',
        accelerator: 'Command+W',
        selector: 'performClose:'
      }, {
        type: 'separator'
      }, {
        label: 'Bring All to Front',
        selector: 'arrangeInFront:'
      }]
    }, {
      label: 'Help',
      submenu: [{
        label: 'Learn More',
        click() {
          shell.openExternal('http://electron.atom.io');
        }
      }, {
        label: 'Documentation',
        click() {
          shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme');
        }
      }, {
        label: 'Community Discussions',
        click() {
          shell.openExternal('https://discuss.atom.io/c/electron');
        }
      }, {
        label: 'Search Issues',
        click() {
          shell.openExternal('https://github.com/atom/electron/issues');
        }
      }]
    }];

  if (process.platform == 'darwin') {
    var name = app.getName();
    template.unshift({
      label: name,
      submenu: [
        {
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide ' + name,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() {
            app.quit()
          }
        },
      ]
    });
    // Window menu.
    template[4].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    );
  }

  menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  electron.ipcMain.on('setMenuEnable',function(event,enable){
    var start = 0
    if(process.platform == 'darwin'){
      start = 1
    }
    fastQuit = enable.fastQuit
    menu.items[start].submenu.items[0].enabled = enable.newFile
    menu.items[start].submenu.items[1].enabled = enable.open
    menu.items[start].submenu.items[2].enabled = enable.save
    menu.items[start].submenu.items[3].enabled = enable.saveAs
    menu.items[start].submenu.items[5].enabled = enable.saveAs

    menu.items[start+1].submenu.items[0].enabled = enable.undo
    menu.items[start+1].submenu.items[1].enabled = enable.redo
  })
});
