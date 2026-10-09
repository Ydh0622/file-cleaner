import { ElectronAPI } from '@electron-toolkit/preload'

import type { CleanResult, RestoreResult } from '../main/cleaner'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      cleanFiles: () => Promise<CleanResult>
      restoreFiles: () => Promise<RestoreResult>
    }
  }
}
