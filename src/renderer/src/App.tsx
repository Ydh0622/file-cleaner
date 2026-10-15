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

  // 1. 키워드 및 확장자 상태 관리 (localStorage에서 불러오기)
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

  // 2. 상태가 바뀔 때마다 localStorage에 자동 저장
  useEffect(() => {
    localStorage.setItem('cleaner_keywords', JSON.stringify(keywords))
  }, [keywords])

  useEffect(() => {
    localStorage.setItem('cleaner_extensions', JSON.stringify(extensions))
  }, [extensions])

  // 추가/삭제 핸들러
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
    if (!ext.startsWith('.')) ext = `.${ext}` // 점(.)이 없으면 자동으로 붙여줌
    if (!extensions.includes(ext)) setExtensions([...extensions, ext])
    setNewExtension('')
  }
  const handleRemoveExtension = (extToRemove: string): void =>
    setExtensions(extensions.filter((e) => e !== extToRemove))

  // 3. 백엔드로 키워드와 확장자 모두 전송
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
      <aside className="w-48 md:w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 transition-all">
        <div className="p-4 md:p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="bg-blue-600 p-2 rounded-xl shadow-blue-200 shadow-sm shrink-0">
            <Sparkles className="text-white" size={20} />
          </div>
          <h1 className="text-lg md:text-xl font-extrabold text-gray-800 tracking-tight truncate">
            File Cleaner
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('clean')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm md:text-base ${activeTab === 'clean' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'hover:bg-gray-50 text-gray-500'}`}
          >
            <FolderKanban size={18} />
            <span className="truncate">파일 정리</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm md:text-base ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'hover:bg-gray-50 text-gray-500'}`}
          >
            <Settings size={18} />
            <span className="truncate">맞춤 설정</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 min-w-0">
        {activeTab === 'clean' && (
          <div className="flex flex-col h-full max-w-5xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="shrink-0 mb-4 md:mb-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight">
                바탕화면을 깨끗하게
              </h2>
              <p className="text-gray-500 text-sm md:text-base">
                어지러운 바탕화면의 문서들을 스마트하게 정리해보세요.
              </p>
            </div>
            <div className="shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-all group">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    <FolderKanban size={28} />
                  </div>
                  <h3 className="text-lg font-bold mb-1">문서 정리하기</h3>
                  <p className="text-gray-500 text-xs md:text-sm mb-4 leading-relaxed hidden sm:block">
                    설정된 키워드와 확장자가 포함된 파일을 안전하게 보관함으로 이동합니다.
                  </p>
                  <button
                    onClick={handleClean}
                    disabled={isLoading}
                    className="w-full mt-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm"
                  >
                    {isLoading ? '처리 중...' : '정리 시작'}
                  </button>
                </div>
                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-all group">
                  <div className="bg-gray-50 text-gray-700 p-3 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    <RotateCcw size={28} />
                  </div>
                  <h3 className="text-lg font-bold mb-1">원래대로 복원</h3>
                  <p className="text-gray-500 text-xs md:text-sm mb-4 leading-relaxed hidden sm:block">
                    보관함으로 이동했던 파일들을 다시 바탕화면으로 꺼내옵니다.
                  </p>
                  <button
                    onClick={handleRestore}
                    disabled={isLoading}
                    className="w-full mt-auto bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm"
                  >
                    {isLoading ? '처리 중...' : '복원하기'}
                  </button>
                </div>
              </div>
              {stats && (
                <div className="mb-4 md:mb-6 p-4 md:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-500" />
                    작업 결과
                  </h3>
                  {stats.restored !== undefined ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                      <span className="font-medium text-sm text-green-800">복원 성공</span>
                      <span className="text-lg font-bold text-green-700">{stats.restored}건</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 md:gap-4">
                      <div className="p-2 md:p-3 bg-gray-50 rounded-xl text-center">
                        <p className="text-xs text-gray-500">총 대상</p>
                        <p className="text-base md:text-lg font-bold">{stats.total}건</p>
                      </div>
                      <div className="p-2 md:p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                        <p className="text-xs text-blue-600">성공</p>
                        <p className="text-base md:text-lg font-bold text-blue-700">
                          {stats.success}건
                        </p>
                      </div>
                      <div className="p-2 md:p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-center">
                        <p className="text-xs text-yellow-600">건너뜀</p>
                        <p className="text-base md:text-lg font-bold text-yellow-700">
                          {stats.skip}건
                        </p>
                      </div>
                      <div className="p-2 md:p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                        <p className="text-xs text-red-600">오류</p>
                        <p className="text-base md:text-lg font-bold text-red-700">
                          {stats.error}건
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-lg border border-gray-800 flex flex-col">
              <div className="shrink-0 bg-[#2d2d2d] px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                <Terminal size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-300">작업 로그 (Console)</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs md:text-sm">
                {logs.length === 0 ? (
                  <span className="text-gray-500">대기 중... (실행 버튼을 눌러주세요)</span>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-green-400 mb-1 leading-relaxed">
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
          <div className="flex flex-col h-full max-w-5xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="shrink-0 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight">맞춤 설정</h2>
              <p className="text-gray-500 text-sm md:text-base">
                나만의 파일 정리 규칙을 만들어보세요. (자동 저장됩니다)
              </p>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex-1 min-h-0 overflow-y-auto">
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-2">정리할 파일명 키워드</h3>
                <p className="text-gray-500 text-sm mb-4">
                  아래 키워드가 파일명에 포함되어 있으면 정리 대상이 됩니다.
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="예: 초안, 복사본"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleAddKeyword}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-xl transition-colors font-medium flex items-center gap-2"
                  >
                    <Plus size={18} />
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 animate-in zoom-in duration-200"
                    >
                      <span className="font-medium text-sm">{keyword}</span>
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="text-blue-400 hover:text-blue-600 hover:bg-blue-100 p-0.5 rounded-md transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {keywords.length === 0 && (
                    <span className="text-gray-400 text-sm italic">등록된 키워드가 없습니다.</span>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2">정리할 파일 확장자</h3>
                <p className="text-gray-500 text-sm mb-4">
                  입력한 확장자를 가진 파일만 검사합니다. (예: png, mp4)
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newExtension}
                    onChange={(e) => setNewExtension(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExtension()}
                    placeholder="예: png, zip"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleAddExtension}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-xl transition-colors font-medium flex items-center gap-2"
                  >
                    <Plus size={18} />
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extensions.map((ext, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 animate-in zoom-in duration-200"
                    >
                      <span className="font-medium text-sm">{ext}</span>
                      <button
                        onClick={() => handleRemoveExtension(ext)}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-0.5 rounded-md transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {extensions.length === 0 && (
                    <span className="text-gray-400 text-sm italic">등록된 확장자가 없습니다.</span>
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
