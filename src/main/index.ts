import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// 파일 정리 로직(cleaner.ts)을 불러옵니다.
import { organizeFiles, restoreFiles } from './cleaner'

function createWindow(): void {
  // 프로그램 창의 크기와 기본 설정을 정합니다.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true, // 상단 메뉴바(파일, 편집 등) 숨기기
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

  // 개발 모드일 때와 실제 exe 빌드 후의 화면 띄우는 방식을 구분합니다.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 프로그램이 켜질 준비가 완료되었을 때 실행되는 부분
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 화면(React)에서 보내는 신호를 듣고(handle) 동작하는 곳
  // 화면에서 'clean-files'라는 신호를 보내면 organizeFiles()를 실행하고 결과를 돌려줍니다.
  ipcMain.handle('clean-files', () => {
    return organizeFiles()
  })

  // 화면에서 'restore-files'라는 신호를 보내면 restoreFiles()를 실행하고 결과를 돌려줍니다.
  ipcMain.handle('restore-files', () => {
    return restoreFiles()
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
