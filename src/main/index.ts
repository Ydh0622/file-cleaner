import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import os from 'node:os'
import fs from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { organizeFiles, restoreFiles, scanFiles, undoLastClean } from './cleaner'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

let folderWatcher: fs.FSWatcher | null = null
let watchTimeout: NodeJS.Timeout | null = null

function stopWatching(): void {
  if (watchTimeout) {
    clearTimeout(watchTimeout)
    watchTimeout = null
  }
  if (folderWatcher) {
    folderWatcher.close()
    folderWatcher = null
  }
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'File Cleaner 열기',
      click: (): void => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: '완전히 종료',
      click: (): void => {
        isQuitting = true
        stopWatching()
        app.quit()
      }
    }
  ])

  tray.setToolTip('File Cleaner - 백그라운드 실행 중')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 500,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 닫기(X) 버튼 클릭 시 기본 종료를 막고 프론트엔드에 닫기 요청 이벤트를 전달
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.webContents.send('window-close-requested')
    }
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

  ipcMain.handle('open-folder', async (_event, folderPath: string) => {
    if (folderPath) {
      await shell.openPath(folderPath)
    }
  })

  ipcMain.handle(
    'preview-files',
    (_event, keywords, extensions, targetFolder, includeUnmatched) => {
      return scanFiles(keywords, extensions, targetFolder, includeUnmatched)
    }
  )

  ipcMain.handle(
    'clean-files',
    async (_event, keywords, extensions, targetFolder, includeUnmatched, selectedItems) => {
      const result = organizeFiles(
        keywords,
        extensions,
        targetFolder,
        includeUnmatched,
        selectedItems
      )
      return result
    }
  )

  ipcMain.handle('undo-clean', () => {
    return undoLastClean()
  })

  ipcMain.handle('restore-files', (_event, targetFolder) => {
    return restoreFiles(targetFolder)
  })

  // 프론트엔드 모달에서 '트레이로 숨기기'를 선택했을 때 실행
  ipcMain.handle('hide-to-tray', () => {
    mainWindow?.hide()
  })

  // 프론트엔드 모달에서 '완전히 종료'를 선택했을 때 실행
  ipcMain.handle('quit-app', () => {
    isQuitting = true
    stopWatching()
    app.quit()
  })

  ipcMain.handle(
    'toggle-watch',
    (
      _event,
      enable: boolean,
      keywords: string[],
      extensions: string[],
      targetFolder: string,
      includeUnmatched: boolean
    ) => {
      stopWatching()

      if (!enable || !targetFolder || !fs.existsSync(targetFolder)) {
        return false
      }

      try {
        folderWatcher = fs.watch(targetFolder, (eventType, filename) => {
          if (!filename || filename === '문서 보관함' || filename.startsWith('.')) return

          const lower = filename.toLowerCase()
          if (lower.endsWith('.crdownload') || lower.endsWith('.part') || lower.endsWith('.tmp')) {
            return
          }

          if (eventType === 'rename' || eventType === 'change') {
            if (watchTimeout) clearTimeout(watchTimeout)

            watchTimeout = setTimeout(() => {
              const result = organizeFiles(keywords, extensions, targetFolder, includeUnmatched)
              if (result.success > 0 && mainWindow) {
                mainWindow.webContents.send('auto-clean-triggered', result)
              }
            }, 1500)
          }
        })
        return true
      } catch {
        return false
      }
    }
  )

  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
  stopWatching()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
