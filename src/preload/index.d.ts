import { ElectronAPI } from '@electron-toolkit/preload'

// 백엔드(cleaner.ts)에서 만들었던 결과 데이터 모양(타입)을 가져옵니다.
import type { CleanResult, RestoreResult } from '../main/cleaner'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // "화면에서 api.cleanFiles()를 실행하면 CleanResult 모양의 결과가 돌아올 거야" 라고 알려줌
      cleanFiles: () => Promise<CleanResult>

      // "화면에서 api.restoreFiles()를 실행하면 RestoreResult 모양의 결과가 돌아올 거야" 라고 알려줌
      restoreFiles: () => Promise<RestoreResult>
    }
  }
}
