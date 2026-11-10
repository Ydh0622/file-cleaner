import { useState, useEffect, type ReactElement } from 'react'
import {
  FolderKanban,
  Settings,
  RotateCcw,
  Sparkles,
  Terminal,
  Plus,
  X,
  FolderOpen,
  ExternalLink,
  Eye,
  ArrowRight,
  Moon,
  Sun,
  Check,
  Trash2,
  Undo2
} from 'lucide-react'

interface CleanStats {
  total?: number
  success?: number
  skip?: number
  error?: number
  restored?: number
}

interface PreviewItem {
  filepath: string
  filename: string
  category: string
}

interface PreviewResult {
  items: PreviewItem[]
  errorMessage?: string
}

const EXTENSION_PRESETS: Array<{ label: string; exts: string[] }> = [
  { label: '문서 세트', exts: ['.pdf', '.docx', '.pptx', '.hwp', '.xlsx', '.txt', '.csv'] },
  { label: '이미지 세트', exts: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] },
  { label: '압축파일 세트', exts: ['.zip', '.7z', '.rar', '.tar', '.gz'] },
  { label: '미디어 세트', exts: ['.mp4', '.mkv', '.avi', '.mp3', '.wav'] }
]

function App(): ReactElement {
  const [activeTab, setActiveTab] = useState<string>('clean')
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [stats, setStats] = useState<CleanStats | null>(null)
  const [canUndo, setCanUndo] = useState<boolean>(false)

  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [selectedFilepaths, setSelectedFilepaths] = useState<string[]>([])

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cleaner_dark_mode')
    return saved ? (JSON.parse(saved) as boolean) : false
  })

  const [targetFolder, setTargetFolder] = useState<string>(() => {
    return localStorage.getItem('cleaner_target_folder') || ''
  })

  const [keywords, setKeywords] = useState<string[]>(() => {
    const saved = localStorage.getItem('cleaner_keywords')
    return saved ? (JSON.parse(saved) as string[]) : ['최종', '수정', '완성']
  })
  const [newKeyword, setNewKeyword] = useState<string>('')

  const [extensions, setExtensions] = useState<string[]>(() => {
    const saved = localStorage.getItem('cleaner_extensions')
    return saved ? (JSON.parse(saved) as string[]) : ['.pdf', '.docx', '.pptx', '.hwp', '.xlsx']
  })
  const [newExtension, setNewExtension] = useState<string>('')

  const [includeUnmatched, setIncludeUnmatched] = useState<boolean>(() => {
    const saved = localStorage.getItem('cleaner_include_unmatched')
    return saved ? (JSON.parse(saved) as boolean) : false
  })

  useEffect((): void => {
    if (!targetFolder) {
      window.electron.ipcRenderer
        .invoke('get-default-folder')
        .then((defaultPath: unknown): void => {
          if (typeof defaultPath === 'string' && defaultPath) {
            setTargetFolder(defaultPath)
          }
        })
        .catch((): void => {
          // 초기 경로 로드 실패 시 무시
        })
    }
  }, [targetFolder])

  useEffect((): void => {
    localStorage.setItem('cleaner_dark_mode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  useEffect((): void => {
    if (targetFolder) {
      localStorage.setItem('cleaner_target_folder', targetFolder)
    }
  }, [targetFolder])

  useEffect((): void => {
    localStorage.setItem('cleaner_keywords', JSON.stringify(keywords))
  }, [keywords])

  useEffect((): void => {
    localStorage.setItem('cleaner_extensions', JSON.stringify(extensions))
  }, [extensions])

  useEffect((): void => {
    localStorage.setItem('cleaner_include_unmatched', JSON.stringify(includeUnmatched))
  }, [includeUnmatched])

  const handleSelectFolder = async (): Promise<void> => {
    const selected = (await window.electron.ipcRenderer.invoke('select-folder')) as string | null
    if (selected) {
      setTargetFolder(selected)
    }
  }

  const handleOpenFolder = async (): Promise<void> => {
    if (targetFolder) {
      await window.electron.ipcRenderer.invoke('open-folder', targetFolder)
    }
  }

  const handleAddKeyword = (): void => {
    if (newKeyword.trim() === '') return
    if (!keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
    }
    setNewKeyword('')
  }

  const handleRemoveKeyword = (keywordToRemove: string): void => {
    setKeywords(keywords.filter((k) => k !== keywordToRemove))
  }

  const handleAddExtension = (): void => {
    let ext = newExtension.trim().toLowerCase()
    if (ext === '') return
    if (!ext.startsWith('.')) ext = `.${ext}`
    if (!extensions.includes(ext)) {
      setExtensions([...extensions, ext])
    }
    setNewExtension('')
  }

  const handleRemoveExtension = (extToRemove: string): void => {
    setExtensions(extensions.filter((e) => e !== extToRemove))
  }

  const handleTogglePreset = (presetExts: string[]): void => {
    const isAllIncluded = presetExts.every((ext) => extensions.includes(ext))
    if (isAllIncluded) {
      setExtensions(extensions.filter((ext) => !presetExts.includes(ext)))
    } else {
      const merged = Array.from(new Set([...extensions, ...presetExts]))
      setExtensions(merged)
    }
  }

  const handlePreview = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const result = (await window.electron.ipcRenderer.invoke(
        'preview-files',
        keywords,
        extensions,
        targetFolder,
        includeUnmatched
      )) as PreviewResult

      if (result.errorMessage) {
        setLogs([result.errorMessage])
        return
      }

      setPreviewItems(result.items)
      setSelectedFilepaths(result.items.map((item) => item.filepath))
      setIsPreviewOpen(true)
    } catch (err) {
      setLogs([`미리보기 중 오류가 발생했습니다: ${String(err)}`])
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleSelectFile = (filepath: string): void => {
    if (selectedFilepaths.includes(filepath)) {
      setSelectedFilepaths(selectedFilepaths.filter((path) => path !== filepath))
    } else {
      setSelectedFilepaths([...selectedFilepaths, filepath])
    }
  }

  const handleToggleSelectAll = (): void => {
    if (selectedFilepaths.length === previewItems.length) {
      setSelectedFilepaths([])
    } else {
      setSelectedFilepaths(previewItems.map((item) => item.filepath))
    }
  }

  const handleClean = async (onlySelected: boolean = false): Promise<void> => {
    const selectedItemsToClean = onlySelected
      ? previewItems.filter((item) => selectedFilepaths.includes(item.filepath))
      : undefined

    setIsPreviewOpen(false)
    setIsLoading(true)
    setStats(null)
    setLogs(['문서 정리를 시작합니다...'])
    try {
      const result = await window.electron.ipcRenderer.invoke(
        'clean-files',
        keywords,
        extensions,
        targetFolder,
        includeUnmatched,
        selectedItemsToClean
      )
      setStats({
        total: result.total,
        success: result.success,
        skip: result.skip,
        error: result.error
      })
      setLogs(result.logs)
      setCanUndo(Boolean(result.canUndo))
    } catch (err) {
      setLogs([`오류가 발생했습니다: ${String(err)}`])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUndo = async (): Promise<void> => {
    setIsLoading(true)
    setStats(null)
    setLogs(['직전 정리 작업을 되돌립니다...'])
    try {
      const result = await window.electron.ipcRenderer.invoke('undo-clean')
      setStats({ restored: result.restored })
      setLogs(result.logs)
      setCanUndo(Boolean(result.canUndo))
    } catch (err) {
      setLogs([`오류가 발생했습니다: ${String(err)}`])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (): Promise<void> => {
    setIsLoading(true)
    setStats(null)
    setLogs(['전체 문서 복원을 시작합니다...'])
    try {
      const result = await window.electron.ipcRenderer.invoke('restore-files', targetFolder)
      setStats({ restored: result.restored })
      setLogs(result.logs)
      setCanUndo(Boolean(result.canUndo))
    } catch (err) {
      setLogs([`오류가 발생했습니다: ${String(err)}`])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`flex h-screen font-sans overflow-hidden transition-colors duration-200 ${
        isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-800'
      }`}
    >
      <aside
        className={`w-40 sm:w-52 md:w-60 shrink-0 border-r flex flex-col shadow-sm z-10 transition-colors duration-200 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}
      >
        <div
          className={`p-3 sm:p-5 flex items-center gap-2.5 border-b ${
            isDarkMode ? 'border-slate-700' : 'border-gray-100'
          }`}
        >
          <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl shadow-sm shrink-0">
            <Sparkles className="text-white" size={18} />
          </div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
            File Cleaner
          </h1>
        </div>
        <nav className="flex-1 p-2 sm:p-3 space-y-1">
          <button
            onClick={(): void => setActiveTab('clean')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-medium text-xs sm:text-sm ${
              activeTab === 'clean'
                ? isDarkMode
                  ? 'bg-blue-900/40 text-blue-400 border border-blue-800/60'
                  : 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                : isDarkMode
                  ? 'hover:bg-slate-700/60 text-slate-400'
                  : 'hover:bg-gray-50 text-gray-500'
            }`}
          >
            <FolderKanban size={16} />
            <span className="truncate">파일 정리</span>
          </button>
          <button
            onClick={(): void => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-medium text-xs sm:text-sm ${
              activeTab === 'settings'
                ? isDarkMode
                  ? 'bg-blue-900/40 text-blue-400 border border-blue-800/60'
                  : 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                : isDarkMode
                  ? 'hover:bg-slate-700/60 text-slate-400'
                  : 'hover:bg-gray-50 text-gray-500'
            }`}
          >
            <Settings size={16} />
            <span className="truncate">맞춤 설정</span>
          </button>
        </nav>

        <div
          className={`p-2 sm:p-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}
        >
          <button
            onClick={(): void => setIsDarkMode(!isDarkMode)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              isDarkMode
                ? 'bg-slate-700/70 hover:bg-slate-700 text-slate-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              {isDarkMode ? (
                <Sun size={15} className="text-amber-400 shrink-0" />
              ) : (
                <Moon size={15} className="text-slate-600 shrink-0" />
              )}
              <span className="truncate">{isDarkMode ? '라이트 모드' : '다크 모드'}</span>
            </span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-3 sm:p-5 md:p-6 min-w-0 h-full overflow-hidden">
        {activeTab === 'clean' && (
          <div className="flex flex-col h-full max-w-5xl w-full mx-auto gap-2.5 sm:gap-3.5">
            <div className="shrink-0">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight">폴더를 깨끗하게</h2>
              <p
                className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}
              >
                지정한 폴더의 어지러운 문서들을 스마트하게 정리해보세요.
              </p>
            </div>

            <div
              className={`shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border shadow-sm flex items-center justify-between gap-2 transition-colors ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen size={16} className="text-blue-500 shrink-0" />
                <span
                  className={`text-xs shrink-0 hidden sm:inline ${
                    isDarkMode ? 'text-slate-400' : 'text-gray-400'
                  }`}
                >
                  대상 폴더:
                </span>
                <span
                  className={`text-xs sm:text-sm font-medium truncate ${
                    isDarkMode ? 'text-slate-200' : 'text-gray-700'
                  }`}
                  title={targetFolder}
                >
                  {targetFolder || '경로 불러오는 중...'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleOpenFolder}
                  disabled={!targetFolder}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 ${
                    isDarkMode
                      ? 'bg-blue-900/40 hover:bg-blue-900/60 text-blue-400'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                  }`}
                  title="윈도우 탐색기로 폴더 열기"
                >
                  <ExternalLink size={13} />
                  <span>폴더 열기</span>
                </button>
                <button
                  onClick={handleSelectFolder}
                  disabled={isLoading}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    isDarkMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  폴더 변경
                </button>
              </div>
            </div>

            <div className="shrink-0 grid grid-cols-2 gap-2.5 sm:gap-4">
              <div
                className={`p-3 sm:p-4 rounded-xl shadow-sm border flex flex-col justify-between hover:shadow-md transition-all ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
                      isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <FolderKanban size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold truncate">문서 정리하기</h3>
                    <p
                      className={`text-xs truncate hidden sm:block ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-400'
                      }`}
                    >
                      지정된 파일을 보관함으로 이동
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreview}
                    disabled={isLoading}
                    className={`flex-1 font-semibold py-2 px-2.5 rounded-lg transition-colors text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      isDarkMode
                        ? 'bg-slate-700 hover:bg-slate-600 text-blue-400'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }`}
                  >
                    <Eye size={15} />
                    <span>미리보기</span>
                  </button>
                  <button
                    onClick={(): Promise<void> => handleClean(false)}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-2.5 rounded-lg transition-colors shadow-sm text-xs sm:text-sm"
                  >
                    {isLoading ? '처리 중...' : '정리 시작'}
                  </button>
                </div>
              </div>

              <div
                className={`p-3 sm:p-4 rounded-xl shadow-sm border flex flex-col justify-between hover:shadow-md transition-all ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
                      isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <RotateCcw size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold truncate">원래대로 복원</h3>
                    <p
                      className={`text-xs truncate hidden sm:block ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-400'
                      }`}
                    >
                      직전 작업 취소 또는 보관함 전체 복구
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={isLoading || !canUndo}
                    title={
                      canUndo
                        ? '방금 정리한 파일만 원래대로 되돌립니다'
                        : '되돌릴 직전 작업이 없습니다'
                    }
                    className={`flex-1 font-semibold py-2 px-2.5 rounded-lg transition-colors text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDarkMode
                        ? 'bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border border-amber-800/50'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60'
                    }`}
                  >
                    <Undo2 size={15} />
                    <span>되돌리기</span>
                  </button>
                  <button
                    onClick={handleRestore}
                    disabled={isLoading}
                    className={`flex-1 font-semibold py-2 px-2.5 rounded-lg transition-colors shadow-sm text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDarkMode
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-900 text-white'
                    }`}
                  >
                    {isLoading ? '처리 중...' : '전체 복원'}
                  </button>
                </div>
              </div>
            </div>

            {stats && (
              <div
                className={`shrink-0 p-2.5 sm:p-3.5 border rounded-xl shadow-sm ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'
                }`}
              >
                {stats.restored !== undefined ? (
                  <div
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${
                      isDarkMode
                        ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                        : 'bg-green-50 border-green-100 text-green-800'
                    }`}
                  >
                    <span className="font-medium text-xs sm:text-sm">복원 성공</span>
                    <span className="text-sm sm:text-base font-bold">{stats.restored}건</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    <div
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-between ${
                        isDarkMode ? 'bg-slate-700/60' : 'bg-gray-50'
                      }`}
                    >
                      <span
                        className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}
                      >
                        총 대상
                      </span>
                      <span className="text-xs sm:text-sm font-bold">{stats.total}건</span>
                    </div>
                    <div
                      className={`py-1.5 px-2 border rounded-lg flex items-center justify-between ${
                        isDarkMode
                          ? 'bg-blue-950/50 border-blue-800/60 text-blue-300'
                          : 'bg-blue-50 border-blue-100 text-blue-700'
                      }`}
                    >
                      <span className="text-xs">성공</span>
                      <span className="text-xs sm:text-sm font-bold">{stats.success}건</span>
                    </div>
                    <div
                      className={`py-1.5 px-2 border rounded-lg flex items-center justify-between ${
                        isDarkMode
                          ? 'bg-amber-950/50 border-amber-800/60 text-amber-300'
                          : 'bg-yellow-50 border-yellow-100 text-yellow-700'
                      }`}
                    >
                      <span className="text-xs">건너뜀</span>
                      <span className="text-xs sm:text-sm font-bold">{stats.skip}건</span>
                    </div>
                    <div
                      className={`py-1.5 px-2 border rounded-lg flex items-center justify-between ${
                        isDarkMode
                          ? 'bg-red-950/50 border-red-800/60 text-red-300'
                          : 'bg-red-50 border-red-100 text-red-700'
                      }`}
                    >
                      <span className="text-xs">오류</span>
                      <span className="text-xs sm:text-sm font-bold">{stats.error}건</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-h-[120px] bg-[#1e1e1e] rounded-xl overflow-hidden shadow-md border border-gray-800 flex flex-col">
              <div className="shrink-0 bg-[#2d2d2d] px-3 py-1.5 flex items-center gap-2 border-b border-gray-700">
                <Terminal size={13} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-300">작업 로그 (Console)</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                {logs.length === 0 ? (
                  <span className="text-gray-500">대기 중... (실행 버튼을 눌러주세요)</span>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-green-400 mb-1 leading-relaxed break-all">
                      <span className="text-gray-500 mr-2">
                        [{new Date().toLocaleTimeString()}]
                      </span>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex flex-col h-full max-w-5xl w-full mx-auto gap-3 sm:gap-4">
            <div className="shrink-0">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight">맞춤 설정</h2>
              <p
                className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}
              >
                나만의 파일 정리 규칙을 만들어보세요. (자동 저장됩니다)
              </p>
            </div>

            <div
              className={`p-4 sm:p-6 rounded-xl shadow-sm border flex-1 min-h-0 overflow-y-auto space-y-6 transition-colors ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm sm:text-base font-bold">정리할 파일명 키워드</h3>
                  {keywords.length > 0 && (
                    <button
                      type="button"
                      onClick={(): void => setKeywords([])}
                      className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                    >
                      <Trash2 size={12} />
                      <span>전체 비우기</span>
                    </button>
                  )}
                </div>
                <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  아래 키워드가 파일명에 포함되어 있으면 정리 대상이 됩니다.
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e): void => setNewKeyword(e.target.value)}
                    onKeyDown={(e): void => {
                      if (e.key === 'Enter') handleAddKeyword()
                    }}
                    placeholder="예: 초안, 복사본"
                    className={`flex-1 px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                        : 'bg-gray-50 border-gray-200 text-gray-800'
                    }`}
                  />
                  <button
                    onClick={handleAddKeyword}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={16} />
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                        isDarkMode
                          ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                    >
                      <span className="font-medium text-xs">{keyword}</span>
                      <button
                        onClick={(): void => handleRemoveKeyword(keyword)}
                        className="text-blue-400 hover:text-blue-500 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {keywords.length === 0 && (
                    <span className="text-gray-400 text-xs italic">등록된 키워드가 없습니다.</span>
                  )}
                </div>
              </div>

              <div
                className={`pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-0.5">
                      <h3 className="text-sm sm:text-base font-bold">정리할 파일 확장자</h3>
                      {extensions.length > 0 && (
                        <button
                          type="button"
                          onClick={(): void => setExtensions([])}
                          className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                        >
                          <Trash2 size={12} />
                          <span>전체 비우기</span>
                        </button>
                      )}
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      프리셋 버튼을 누르면 세트가 추가되고, 한 번 더 누르면 해당 세트가 빠집니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EXTENSION_PRESETS.map((preset, idx) => {
                      const isAllIncluded = preset.exts.every((ext) => extensions.includes(ext))
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={(): void => handleTogglePreset(preset.exts)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                            isAllIncluded
                              ? isDarkMode
                                ? 'bg-blue-900/50 text-blue-300 border-blue-700 hover:bg-blue-900/70'
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : isDarkMode
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {isAllIncluded ? <Check size={12} /> : <Plus size={12} />}
                          <span>{preset.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newExtension}
                    onChange={(e): void => setNewExtension(e.target.value)}
                    onKeyDown={(e): void => {
                      if (e.key === 'Enter') handleAddExtension()
                    }}
                    placeholder="예: png, zip"
                    className={`flex-1 px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                        : 'bg-gray-50 border-gray-200 text-gray-800'
                    }`}
                  />
                  <button
                    onClick={handleAddExtension}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={16} />
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {extensions.map((ext, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                        isDarkMode
                          ? 'bg-slate-700 text-slate-200 border-slate-600'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <span className="font-medium text-xs">{ext}</span>
                      <button
                        onClick={(): void => handleRemoveExtension(ext)}
                        className="text-gray-400 hover:text-gray-300 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {extensions.length === 0 && (
                    <span className="text-gray-400 text-xs italic">등록된 확장자가 없습니다.</span>
                  )}
                </div>
              </div>

              <div
                className={`pt-4 border-t flex items-center justify-between gap-4 ${
                  isDarkMode ? 'border-slate-700' : 'border-gray-100'
                }`}
              >
                <div>
                  <h3 className="text-sm sm:text-base font-bold mb-0.5">
                    키워드 미포함 문서도 정리하기
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    파일명에 키워드가 없더라도 지정된 확장자라면 &apos;기타 문서&apos; 폴더로 묶어서
                    이동합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(): void => setIncludeUnmatched(!includeUnmatched)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    includeUnmatched ? 'bg-blue-600' : isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      includeUnmatched ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`rounded-2xl shadow-xl border w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-100'
                : 'bg-white border-gray-100 text-gray-800'
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                isDarkMode ? 'border-slate-700' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-blue-500" />
                <h3 className="font-bold text-base">
                  정리 대상 미리보기 ({selectedFilepaths.length} / {previewItems.length}건 선택됨)
                </h3>
              </div>
              <button
                onClick={(): void => setIsPreviewOpen(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {previewItems.length > 0 && (
              <div
                className={`px-5 py-2 border-b flex items-center justify-between text-xs ${
                  isDarkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-gray-50/80 border-gray-100'
                }`}
              >
                <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>
                  정리에서 제외할 파일은 체크를 해제하세요.
                </span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-blue-500 hover:text-blue-600 font-semibold"
                >
                  {selectedFilepaths.length === previewItems.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {previewItems.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  현재 설정된 규칙으로 정리할 수 있는 파일이 없습니다.
                </div>
              ) : (
                previewItems.map((item, idx) => {
                  const isSelected = selectedFilepaths.includes(item.filepath)
                  return (
                    <label
                      key={idx}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-xs sm:text-sm cursor-pointer transition-colors ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-slate-900/80 border-blue-800/70 text-slate-100'
                            : 'bg-blue-50/30 border-blue-200 text-gray-800'
                          : isDarkMode
                            ? 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-60'
                            : 'bg-gray-50/60 border-gray-100 text-gray-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(): void => handleToggleSelectFile(item.filepath)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <span className="font-medium truncate" title={item.filename}>
                          {item.filename}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ArrowRight size={14} className="text-gray-400" />
                        <span
                          className={`border px-2 py-0.5 rounded-md font-semibold text-xs ${
                            isDarkMode
                              ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}
                        >
                          {item.category} 폴더
                        </span>
                      </div>
                    </label>
                  )
                })
              )}
            </div>

            <div
              className={`px-5 py-3.5 border-t flex justify-end gap-2 ${
                isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <button
                onClick={(): void => setIsPreviewOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'text-slate-300 hover:bg-slate-700'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                닫기
              </button>
              {previewItems.length > 0 && (
                <button
                  onClick={(): Promise<void> => handleClean(true)}
                  disabled={selectedFilepaths.length === 0}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white shadow-xs transition-colors"
                >
                  선택 항목 정리 ({selectedFilepaths.length}건)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
