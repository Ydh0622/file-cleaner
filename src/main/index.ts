import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import os from 'node:os' // 기본 바탕화면 경로를 가져오기 위해 추가
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

  // 1. 기본 바탕화면 경로를 프론트엔드에 알려주는 채널
  ipcMain.handle('get-default-folder', () => {
    return join(os.homedir(), 'Desktop')
  })

  // 2. 윈도우 폴더 선택창을 띄우고 선택된 경로를 반환하는 채널
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'], // 파일이 아닌 '폴더'만 선택 가능하게 설정
      title: '정리할 대상 폴더를 선택하세요'
    })

    // 사용자가 취소를 눌렀거나 선택한 폴더가 없으면 null 반환
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    // 선택한 첫 번째 폴더의 경로 반환
    return result.filePaths[0]
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
