import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// 1. 바탕화면 및 문서 보관함 경로 설정
const desktop = path.join(os.homedir(), 'Desktop')
const historyFolder = path.join(desktop, '문서 보관함')

// 2. 정리할 파일의 확장자 목록
const EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.hwp', '.xlsx'])

// 3. 파일 이름에 포함되어 있는지 검사할 키워드들
const KEYWORD_MAP: Record<string, string[]> = {
  최종: ['최종', '완성', 'final', 'finished', 'release'],
  수정: ['수정', 'edit', 'edited', 'ver', 'version', 'rev', 'revision', 'update', 'updated'],
  복사본: ['복사본', 'copy', 'backup', 'duplicate']
}

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

export function organizeFiles(): CleanResult {
  const logs: string[] = []

  if (!fs.existsSync(desktop)) {
    return { total: 0, success: 0, skip: 0, error: 0, logs: ['바탕화면 경로를 찾을 수 없습니다.'] }
  }

  const entries = fs.readdirSync(desktop, { withFileTypes: true })
  const moveList: Array<{ filepath: string; filename: string; category: string }> = []

  for (const entry of entries) {
    if (!entry.isFile()) continue

    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTENSIONS.has(ext)) continue

    const lower = entry.name.toLowerCase()
    let category: string | null = null

    for (const [cat, words] of Object.entries(KEYWORD_MAP)) {
      if (words.some((w) => lower.includes(w.toLowerCase()))) {
        category = cat
        break
      }
    }

    if (category) {
      moveList.push({
        filepath: path.join(desktop, entry.name),
        filename: entry.name,
        category
      })
    }
  }

  if (moveList.length === 0) {
    return { total: 0, success: 0, skip: 0, error: 0, logs: ['바탕화면에 정리할 문서가 없습니다.'] }
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
      logs.push(`[이동 완료] ${filename}`)
    } catch (unknownError) {
      const err = unknownError as NodeJS.ErrnoException
      if (err.code === 'EBUSY' || err.code === 'EPERM') {
        skip += 1
        logs.push(`[사용 중/권한 없음] ${filename}`)
      } else {
        errorCount += 1
        logs.push(`[오류] ${filename} - ${err.message || String(unknownError)}`)
      }
    }
  }

  return { total: moveList.length, success, skip, error: errorCount, logs }
}

export function restoreFiles(): RestoreResult {
  const logs: string[] = []

  if (!fs.existsSync(historyFolder)) {
    return { restored: 0, logs: ['문서 보관함 폴더가 없습니다.'] }
  }

  let restored = 0

  function traverseAndRestore(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        traverseAndRestore(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (!EXTENSIONS.has(ext)) continue

        const originalName = entry.name.replace(/^\d{4}-\d{2}-\d{2}_/, '')
        const destination = getUniquePath(desktop, originalName)

        try {
          fs.renameSync(fullPath, destination)
          restored += 1
          logs.push(`[복원 완료] ${originalName}`)
        } catch (unknownError) {
          const err = unknownError as NodeJS.ErrnoException
          logs.push(`[오류] ${originalName} - ${err.message || String(unknownError)}`)
        }
      }
    }
  }

  traverseAndRestore(historyFolder)
  return { restored, logs }
}
