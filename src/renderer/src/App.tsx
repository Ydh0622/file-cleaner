import { useState, useEffect, type ReactElement } from 'react'
import { FolderKanban, Settings, RotateCcw, Sparkles, Terminal, Plus, X } from 'lucide-react'

function App(): ReactElement {
  const [activeTab, setActiveTab] = useState('clean')
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<{
    total?: number
    success?: number
    skip?: number
    error?: number
    restored?: number
  } | null>(null)

  const [keywords, setKeywords] = useState<string[]>(() => {
    const saved = localStorage.getItem('cleaner_keywords')
    return saved ? JSON.parse(saved) : ['최종', '수정', '완성']
  })
  const [newKeyword, setNewKeyword] = useState('')

  const [extensions, setExtensions] = useState<string[]>(() => {
    const saved = localStorage.getItem('cleaner_extensions')
    return saved ? JSON.parse(saved) : ['.pdf', '.docx', '.pptx', '.hwp', '.xlsx']
  })
  const [newExtension, setNewExtension] = useState('')

  useEffect(() => {
    localStorage.setItem('cleaner_keywords', JSON.stringify(keywords))
  }, [keywords])

  useEffect(() => {
    localStorage.setItem('cleaner_extensions', JSON.stringify(extensions))
  }, [extensions])

  const handleAddKeyword = (): void => {
    if (newKeyword.trim() === '') return
    if (!keywords.includes(newKeyword.trim())) setKeywords([...keywords, newKeyword.trim()])
    setNewKeyword('')
  }
  const handleRemoveKeyword = (keywordToRemove: string): void =>
    setKeywords(keywords.filter((k) => k !== keywordToRemove))

  const handleAddExtension = (): void => {
    let ext = newExtension.trim().toLowerCase()
    if (ext === '') return
    if (!ext.startsWith('.')) ext = `.${ext}`
    if (!extensions.includes(ext)) setExtensions([...extensions, ext])
    setNewExtension('')
  }
  const handleRemoveExtension = (extToRemove: string): void =>
    setExtensions(extensions.filter((e) => e !== extToRemove))

  const handleClean = async (): Promise<void> => {
    setIsLoading(true)
    setStats(null)
    setLogs(['문서 정리를 시작합니다...'])
    try {
      const result = await window.electron.ipcRenderer.invoke('clean-files', keywords, extensions)
      setStats({
        total: result.total,
        success: result.success,
        skip: result.skip,
        error: result.error
      })
      setLogs(result.logs)
    } catch (err) {
      setLogs([`오류가 발생했습니다: ${String(err)}`])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (): Promise<void> => {
    setIsLoading(true)
    setStats(null)
    setLogs(['문서 복원을 시작합니다...'])
    try {
      const result = await window.electron.ipcRenderer.invoke('restore-files')
      setStats({ restored: result.restored })
      setLogs(result.logs)
    } catch (err) {
      setLogs([`오류가 발생했습니다: ${String(err)}`])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
      {/* 왼쪽 사이드바 (창이 작아지면 너비도 좁아지게 설정) */}
      <aside className="w-40 sm:w-52 md:w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 transition-all">
        <div className="p-3 sm:p-5 flex items-center gap-2.5 border-b border-gray-100">
          <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl shadow-blue-200 shadow-sm shrink-0">
            <Sparkles className="text-white" size={18} />
          </div>
          <h1 className="text-base sm:text-lg font-extrabold text-gray-800 tracking-tight truncate">
            File Cleaner
          </h1>
        </div>
        <nav className="flex-1 p-2 sm:p-3 space-y-1">
          <button
            onClick={() => setActiveTab('clean')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-medium text-xs sm:text-sm ${activeTab === 'clean' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'hover:bg-gray-50 text-gray-500'}`}
          >
            <FolderKanban size={16} />
            <span className="truncate">파일 정리</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-medium text-xs sm:text-sm ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'hover:bg-gray-50 text-gray-500'}`}
          >
            <Settings size={16} />
            <span className="truncate">맞춤 설정</span>
          </button>
        </nav>
      </aside>

      {/* 오른쪽 메인 화면 영역 (패딩을 줄여서 내부 공간 확보) */}
      <main className="flex-1 flex flex-col p-3 sm:p-5 md:p-6 min-w-0 h-full overflow-hidden">
        {activeTab === 'clean' && (
          <div className="flex flex-col h-full max-w-5xl w-full mx-auto gap-3 sm:gap-4">
            {/* 1. 상단 타이틀 (간격 최소화) */}
            <div className="shrink-0">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight">바탕화면을 깨끗하게</h2>
              <p className="text-gray-500 text-xs sm:text-sm">
                어지러운 바탕화면의 문서들을 스마트하게 정리해보세요.
              </p>
            </div>

            {/* 2. 액션 카드 영역 (세로 공간 절약을 위해 컴팩트한 디자인 적용, 항상 2열 유지) */}
            <div className="shrink-0 grid grid-cols-2 gap-2.5 sm:gap-4">
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                  <div className="bg-blue-50 text-blue-600 p-2 sm:p-2.5 rounded-xl shrink-0">
                    <FolderKanban size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold truncate">문서 정리하기</h3>
                    <p className="text-gray-400 text-xs truncate hidden sm:block">
                      지정된 파일을 보관함으로 이동
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClean}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-colors shadow-sm text-xs sm:text-sm"
                >
                  {isLoading ? '처리 중...' : '정리 시작'}
                </button>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                  <div className="bg-gray-100 text-gray-700 p-2 sm:p-2.5 rounded-xl shrink-0">
                    <RotateCcw size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold truncate">원래대로 복원</h3>
                    <p className="text-gray-400 text-xs truncate hidden sm:block">
                      보관함 파일을 바탕화면으로 복구
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRestore}
                  disabled={isLoading}
                  className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-colors shadow-sm text-xs sm:text-sm"
                >
                  {isLoading ? '처리 중...' : '복원하기'}
                </button>
              </div>
            </div>

            {/* 3. 작업 결과 요약 (높이를 아주 얇게 압축) */}
            {stats && (
              <div className="shrink-0 p-2.5 sm:p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                {stats.restored !== undefined ? (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                    <span className="font-medium text-xs sm:text-sm text-green-800">복원 성공</span>
                    <span className="text-sm sm:text-base font-bold text-green-700">
                      {stats.restored}건
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="py-1.5 px-2 bg-gray-50 rounded-lg flex items-center justify-between">
                      <span className="text-xs text-gray-500">총 대상</span>
                      <span className="text-xs sm:text-sm font-bold">{stats.total}건</span>
                    </div>
                    <div className="py-1.5 px-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                      <span className="text-xs text-blue-600">성공</span>
                      <span className="text-xs sm:text-sm font-bold text-blue-700">
                        {stats.success}건
                      </span>
                    </div>
                    <div className="py-1.5 px-2 bg-yellow-50 border border-yellow-100 rounded-lg flex items-center justify-between">
                      <span className="text-xs text-yellow-600">건너뜀</span>
                      <span className="text-xs sm:text-sm font-bold text-yellow-700">
                        {stats.skip}건
                      </span>
                    </div>
                    <div className="py-1.5 px-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between">
                      <span className="text-xs text-red-600">오류</span>
                      <span className="text-xs sm:text-sm font-bold text-red-700">
                        {stats.error}건
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. 작업 로그창 (최소 높이 min-h-[120px] 보장 및 남은 공간 100% 차지) */}
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
              <p className="text-gray-500 text-xs sm:text-sm">
                나만의 파일 정리 규칙을 만들어보세요. (자동 저장됩니다)
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex-1 min-h-0 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1">
                  정리할 파일명 키워드
                </h3>
                <p className="text-gray-500 text-xs mb-3">
                  아래 키워드가 파일명에 포함되어 있으면 정리 대상이 됩니다.
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="예: 초안, 복사본"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    onClick={handleAddKeyword}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={16} />
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100"
                    >
                      <span className="font-medium text-xs">{keyword}</span>
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="text-blue-400 hover:text-blue-600 p-0.5"
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

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1">
                  정리할 파일 확장자
                </h3>
                <p className="text-gray-500 text-xs mb-3">
                  입력한 확장자를 가진 파일만 검사합니다. (예: png, mp4)
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newExtension}
                    onChange={(e) => setNewExtension(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExtension()}
                    placeholder="예: png, zip"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    onClick={handleAddExtension}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={16} />
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {extensions.map((ext, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md border border-gray-200"
                    >
                      <span className="font-medium text-xs">{ext}</span>
                      <button
                        onClick={() => handleRemoveExtension(ext)}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
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
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
