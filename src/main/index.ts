import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import os from 'node:os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { organizeFiles, restoreFiles } from './cleaner'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 500,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('get-default-folder', () => {
    return join(os.homedir(), 'Desktop')
  })

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '정리할 대상 폴더를 선택하세요'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // 👇 새로 추가된 부분: 전달받은 경로의 폴더를 윈도우 탐색기로 바로 엽니다.
  ipcMain.handle('open-folder', async (_event, folderPath: string) => {
    if (folderPath) {
      await shell.openPath(folderPath)
    }
  })

  ipcMain.handle('clean-files', async (_event, keywords, extensions, targetFolder) => {
    const result = await organizeFiles(keywords, extensions, targetFolder)
    return result
  })

  ipcMain.handle('restore-files', (_event, targetFolder) => {
    return restoreFiles(targetFolder)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
