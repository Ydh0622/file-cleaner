import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const defaultDesktop = path.join(os.homedir(), 'Desktop')

export interface CleanResult {
  total: number
  success: number
  skip: number
  error: number
  logs: string[]
  canUndo?: boolean
}

export interface RestoreResult {
  restored: number
  logs: string[]
  canUndo?: boolean
}

export interface PreviewItem {
  filepath: string
  filename: string
  category: string
}

export interface PreviewResult {
  items: PreviewItem[]
  errorMessage?: string
}

interface MovedRecord {
  from: string
  to: string
  filename: string
  targetFolder: string
}

// 직전 정리 작업에서 이동된 파일들의 경로 기록
let lastMovedHistory: MovedRecord[] = []

function getUniquePath(folder: string, filename: string): string {
  const ext = path.extname(filename)
  const name = path.basename(filename, ext)
  let targetPath = path.join(folder, filename)
  let n = 1

  while (fs.existsSync(targetPath)) {
    targetPath = path.join(folder, `${name}_${n}${ext}`)
    n += 1
  }
  return targetPath
}

// 빈 하위 폴더들을 안쪽에서부터 재귀적으로 청소하는 보조 함수
function cleanEmptyFolders(dirPath: string): void {
  if (!fs.existsSync(dirPath)) return

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dirPath, entry.name)
      cleanEmptyFolders(fullPath)
    }
  }

  try {
    const remaining = fs
      .readdirSync(dirPath)
      .filter((name) => !name.startsWith('.') && name.toLowerCase() !== 'desktop.ini')
    if (remaining.length === 0) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
  } catch {
    // 사용 중이거나 이미 삭제된 경우 무시
  }
}

export function scanFiles(
  keywords: string[] = [],
  extensions: string[] = [],
  targetFolder?: string,
  includeUnmatched: boolean = false
): PreviewResult {
  const currentTarget = targetFolder && targetFolder.trim() !== '' ? targetFolder : defaultDesktop

  if (!fs.existsSync(currentTarget)) {
    return { items: [], errorMessage: '지정된 폴더 경로를 찾을 수 없습니다.' }
  }

  if (extensions.length === 0 || (keywords.length === 0 && !includeUnmatched)) {
    return {
      items: [],
      errorMessage: '키워드나 확장자가 설정되지 않았습니다. 설정 탭을 확인해주세요.'
    }
  }

  const extSet = new Set(extensions.map((e) => e.toLowerCase()))
  const entries = fs.readdirSync(currentTarget, { withFileTypes: true })
  const items: PreviewItem[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue

    const ext = path.extname(entry.name).toLowerCase()
    if (!extSet.has(ext)) continue

    const lower = entry.name.toLowerCase()
    let category: string | null = null

    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        category = keyword
        break
      }
    }

    if (!category && includeUnmatched) {
      category = '기타 문서'
    }

    if (category) {
      items.push({
        filepath: path.join(currentTarget, entry.name),
        filename: entry.name,
        category
      })
    }
  }

  return { items }
}

export function organizeFiles(
  keywords: string[] = [],
  extensions: string[] = [],
  targetFolder?: string,
  includeUnmatched: boolean = false,
  selectedItems?: PreviewItem[]
): CleanResult {
  const logs: string[] = []
  const currentTarget = targetFolder && targetFolder.trim() !== '' ? targetFolder : defaultDesktop
  const historyFolder = path.join(currentTarget, '문서 보관함')

  let moveList: PreviewItem[] = []

  // 미리보기 모달에서 체크박스로 선택된 목록이 전달된 경우 해당 목록만 사용
  if (selectedItems && Array.isArray(selectedItems)) {
    moveList = selectedItems
  } else {
    const scanResult = scanFiles(keywords, extensions, targetFolder, includeUnmatched)
    if (scanResult.errorMessage) {
      return {
        total: 0,
        success: 0,
        skip: 0,
        error: 0,
        logs: [scanResult.errorMessage],
        canUndo: lastMovedHistory.length > 0
      }
    }
    moveList = scanResult.items
  }

  if (moveList.length === 0) {
    return {
      total: 0,
      success: 0,
      skip: 0,
      error: 0,
      logs: ['선택한 폴더에 정리할 문서가 없습니다.'],
      canUndo: lastMovedHistory.length > 0
    }
  }

  fs.mkdirSync(historyFolder, { recursive: true })

  let success = 0,
    skip = 0,
    errorCount = 0

  const currentMoved: MovedRecord[] = []

  for (const { filepath, filename, category } of moveList) {
    try {
      if (!fs.existsSync(filepath)) {
        skip += 1
        logs.push(`[건너뜀] 파일이 존재하지 않습니다: ${filename}`)
        continue
      }

      const stats = fs.statSync(filepath)
      const mtime = stats.mtime

      const ym = `${mtime.getFullYear()}-${String(mtime.getMonth() + 1).padStart(2, '0')}`
      const prefix = `${ym}-${String(mtime.getDate()).padStart(2, '0')}`

      const targetDir = path.join(historyFolder, category, ym)
      fs.mkdirSync(targetDir, { recursive: true })

      const ext = path.extname(filename)
      const name = path.basename(filename, ext)
      const newName = `${prefix}_${name}${ext}`

      const destination = getUniquePath(targetDir, newName)

      fs.renameSync(filepath, destination)
      success += 1
      currentMoved.push({
        from: filepath,
        to: destination,
        filename,
        targetFolder: currentTarget
      })
      logs.push(`[이동 완료] ${filename} -> ${category} 폴더`)
    } catch (unknownError) {
      const err = unknownError as NodeJS.ErrnoException
      if (err.code === 'EBUSY' || err.code === 'EPERM') {
        skip += 1
        logs.push(`[사용 중/권한 없음] ${filename}`)
      } else {
        errorCount += 1
        logs.push(`[오류] ${filename}\n${err.message || String(unknownError)}`)
      }
    }
  }

  if (currentMoved.length > 0) {
    lastMovedHistory = currentMoved
  }

  return {
    total: moveList.length,
    success,
    skip,
    error: errorCount,
    logs,
    canUndo: lastMovedHistory.length > 0
  }
}

// 직전 정리 작업의 파일들만 원래 자리로 되돌리는 함수
export function undoLastClean(): RestoreResult {
  const logs: string[] = []

  if (lastMovedHistory.length === 0) {
    return { restored: 0, logs: ['되돌릴 직전 작업 기록이 없습니다.'], canUndo: false }
  }

  let restored = 0
  const affectedTargets = new Set<string>()

  for (const record of lastMovedHistory) {
    if (!fs.existsSync(record.to)) {
      logs.push(`[건너뜀] 파일이 이미 이동되었거나 없습니다: ${record.filename}`)
      continue
    }

    const parentDir = path.dirname(record.from)
    const originalFilename = path.basename(record.from)
    const destination = getUniquePath(parentDir, originalFilename)

    try {
      fs.renameSync(record.to, destination)
      restored += 1
      affectedTargets.add(record.targetFolder)
      logs.push(`[직전 되돌리기 완료] ${record.filename}`)
    } catch (unknownError) {
      const err = unknownError as NodeJS.ErrnoException
      logs.push(`[오류] ${record.filename}\n${err.message || String(unknownError)}`)
    }
  }

  // 파일이 빠져나간 보관함 내 빈 폴더 정리
  for (const target of affectedTargets) {
    const historyFolder = path.join(target, '문서 보관함')
    if (fs.existsSync(historyFolder)) {
      cleanEmptyFolders(historyFolder)
      if (!fs.existsSync(historyFolder)) {
        logs.push('[정리 완료] 비어있는 문서 보관함 폴더를 삭제했습니다.')
      }
    }
  }

  lastMovedHistory = []
  return { restored, logs, canUndo: false }
}

export function restoreFiles(targetFolder?: string): RestoreResult {
  const logs: string[] = []

  const currentTarget = targetFolder && targetFolder.trim() !== '' ? targetFolder : defaultDesktop
  const historyFolder = path.join(currentTarget, '문서 보관함')

  if (!fs.existsSync(historyFolder)) {
    return {
      restored: 0,
      logs: ['선택한 폴더 내에 문서 보관함 폴더가 없습니다.'],
      canUndo: lastMovedHistory.length > 0
    }
  }

  let restored = 0

  function traverseAndRestore(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        traverseAndRestore(fullPath)
      } else if (entry.isFile()) {
        if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'desktop.ini') continue

        const originalName = entry.name.replace(/^\d{4}-\d{2}-\d{2}_/, '')
        const destination = getUniquePath(currentTarget, originalName)

        try {
          fs.renameSync(fullPath, destination)
          restored += 1
          logs.push(`[복원 완료] ${originalName}`)
        } catch (unknownError) {
          const err = unknownError as NodeJS.ErrnoException
          logs.push(`[오류] ${originalName}\n${err.message || String(unknownError)}`)
        }
      }
    }
  }

  traverseAndRestore(historyFolder)
  cleanEmptyFolders(historyFolder)

  if (!fs.existsSync(historyFolder)) {
    logs.push('[정리 완료] 비어있는 문서 보관함 폴더를 삭제했습니다.')
  }

  // 전체 복원 시 해당 폴더와 관련된 직전 히스토리 초기화
  lastMovedHistory = lastMovedHistory.filter((item) => item.targetFolder !== currentTarget)

  return { restored, logs, canUndo: lastMovedHistory.length > 0 }
}
