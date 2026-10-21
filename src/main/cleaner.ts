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
}

export interface RestoreResult {
  restored: number
  logs: string[]
}

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

export function organizeFiles(
  keywords: string[] = [],
  extensions: string[] = [],
  targetFolder?: string
): CleanResult {
  const logs: string[] = []

  const currentTarget = targetFolder && targetFolder.trim() !== '' ? targetFolder : defaultDesktop
  const historyFolder = path.join(currentTarget, '문서 보관함')

  if (!fs.existsSync(currentTarget)) {
    return {
      total: 0,
      success: 0,
      skip: 0,
      error: 0,
      logs: ['지정된 폴더 경로를 찾을 수 없습니다.']
    }
  }

  if (keywords.length === 0 || extensions.length === 0) {
    return {
      total: 0,
      success: 0,
      skip: 0,
      error: 0,
      logs: ['키워드나 확장자가 설정되지 않았습니다. 설정 탭을 확인해주세요.']
    }
  }

  const extSet = new Set(extensions.map((e) => e.toLowerCase()))

  const entries = fs.readdirSync(currentTarget, { withFileTypes: true })
  const moveList: Array<{ filepath: string; filename: string; category: string }> = []

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

    if (category) {
      moveList.push({
        filepath: path.join(currentTarget, entry.name),
        filename: entry.name,
        category
      })
    }
  }

  if (moveList.length === 0) {
    return {
      total: 0,
      success: 0,
      skip: 0,
      error: 0,
      logs: ['선택한 폴더에 정리할 문서가 없습니다.']
    }
  }

  fs.mkdirSync(historyFolder, { recursive: true })

  let success = 0,
    skip = 0,
    errorCount = 0

  for (const { filepath, filename, category } of moveList) {
    try {
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

  return { total: moveList.length, success, skip, error: errorCount, logs }
}

export function restoreFiles(targetFolder?: string): RestoreResult {
  const logs: string[] = []

  const currentTarget = targetFolder && targetFolder.trim() !== '' ? targetFolder : defaultDesktop
  const historyFolder = path.join(currentTarget, '문서 보관함')

  if (!fs.existsSync(historyFolder)) {
    return { restored: 0, logs: ['선택한 폴더 내에 문서 보관함 폴더가 없습니다.'] }
  }

  let restored = 0

  function traverseAndRestore(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        // 1. 하위 폴더 안으로 들어가서 파일들을 먼저 복원합니다.
        traverseAndRestore(fullPath)

        // 2. 복원 후 해당 하위 폴더에 남은 일반 파일이 있는지 확인하고, 비어있다면 폴더를 삭제합니다.
        try {
          const remaining = fs
            .readdirSync(fullPath)
            .filter((name) => !name.startsWith('.') && name.toLowerCase() !== 'desktop.ini')
          if (remaining.length === 0) {
            fs.rmSync(fullPath, { recursive: true, force: true })
          }
        } catch {
          // 폴더가 이미 삭제되었거나 사용 중인 경우 무시
        }
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

  // 3. 마지막으로 최상위 '문서 보관함' 폴더 자체도 텅 비었다면 깔끔하게 삭제합니다.
  try {
    const remainingRoot = fs
      .readdirSync(historyFolder)
      .filter((name) => !name.startsWith('.') && name.toLowerCase() !== 'desktop.ini')
    if (remainingRoot.length === 0) {
      fs.rmSync(historyFolder, { recursive: true, force: true })
      logs.push('[정리 완료] 비어있는 문서 보관함 폴더를 삭제했습니다.')
    }
  } catch {
    // 무시
  }

  return { restored, logs }
}
