import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// 1. 바탕화면 및 문서 보관함 경로 설정
const desktop = path.join(os.homedir(), 'Desktop')
const historyFolder = path.join(desktop, '문서 보관함')

// 2. 정리할 파일의 확장자 목록 (이 부분도 추후 커스텀 가능하도록 뺄 수 있습니다)
const EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.hwp', '.xlsx'])

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

// 3. 0개의 인수 에러 해결: keywords 배열을 매개변수로 받도록 수정
export function organizeFiles(keywords: string[] = []): CleanResult {
  const logs: string[] = []

  if (!fs.existsSync(desktop)) {
    return { total: 0, success: 0, skip: 0, error: 0, logs: ['바탕화면 경로를 찾을 수 없습니다.'] }
  }

  // 프론트엔드에서 넘어온 키워드가 하나도 없을 경우의 예외 처리
  if (keywords.length === 0) {
    return {
      total: 0,
      success: 0,
      skip: 0,
      error: 0,
      logs: ['설정된 키워드가 없습니다. 설정 탭에서 키워드를 추가해주세요.']
    }
  }

  const entries = fs.readdirSync(desktop, { withFileTypes: true })
  const moveList: Array<{ filepath: string; filename: string; category: string }> = []

  for (const entry of entries) {
    if (!entry.isFile()) continue

    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTENSIONS.has(ext)) continue

    const lower = entry.name.toLowerCase()
    let category: string | null = null

    // 4. 하드코딩 제거: 사용자가 설정한 키워드 배열을 순회하며 검사
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        category = keyword // 매칭된 키워드 자체를 분류(폴더명)로 사용
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

      // 폴더 구조: 문서 보관함 / 키워드(예: 초안) / 연-월 / 파일들
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
          logs.push(`[오류] ${originalName}\n${err.message || String(unknownError)}`)
        }
      }
    }
  }

  traverseAndRestore(historyFolder)
  return { restored, logs }
}
