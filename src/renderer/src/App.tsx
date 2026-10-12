import { useState, type ReactElement } from 'react'
import { FolderKanban, Settings, RotateCcw, Sparkles, Terminal } from 'lucide-react'

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

  const handleClean = async (): Promise<void> => {
    setIsLoading(true)
    setStats(null)
    setLogs(['문서 정리를 시작합니다...'])
    try {
      const result = await window.electron.ipcRenderer.invoke('clean-files')
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
    // 전체 화면을 화면 꽉 차게(h-screen) 잡고, 전체 스크롤을 막습니다(overflow-hidden)
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
      {/*  왼쪽 사이드바 */}
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm md:text-base ${
              activeTab === 'clean'
                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                : 'hover:bg-gray-50 text-gray-500'
            }`}
          >
            <FolderKanban size={18} />
            <span className="truncate">파일 정리</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm md:text-base ${
              activeTab === 'settings'
                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                : 'hover:bg-gray-50 text-gray-500'
            }`}
          >
            <Settings size={18} />
            <span className="truncate">설정 (준비중)</span>
          </button>
        </nav>
      </aside>

      {/* 오른쪽 메인 화면 영역 (스크롤은 내부에서만 돌게 설정) */}
      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 min-w-0">
        {activeTab === 'clean' && (
          // flex-col과 h-full을 주어 내부 요소들이 위아래 공간을 나눠 쓰게 만듭니다.
          <div className="flex flex-col h-full max-w-5xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 상단 제목 부분 (공간 고정: shrink-0) */}
            <div className="shrink-0 mb-4 md:mb-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight">
                바탕화면을 깨끗하게 ✨
              </h2>
              <p className="text-gray-500 text-sm md:text-base">
                어지러운 바탕화면의 문서들을 스마트하게 정리해보세요.
              </p>
            </div>

            {/* 가운데 카드 & 요약 영역 (공간 고정: shrink-0) */}
            <div className="shrink-0">
              {/* 버튼 2개 카드 (창이 작아지면 1줄로 변경: md:grid-cols-2) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-all group">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    <FolderKanban size={28} />
                  </div>
                  <h3 className="text-lg font-bold mb-1">문서 정리하기</h3>
                  <p className="text-gray-500 text-xs md:text-sm mb-4 leading-relaxed hidden sm:block">
                    최종, 수정 등의 키워드가 포함된 파일을 안전하게 보관함으로 이동합니다.
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

              {/* 결과 요약 (있을 때만 등장) */}
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

            {/*  하단 작업 로그창 (남은 공간을 모두 차지하도록 flex-1 및 min-h-0 적용) */}
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
          <div className="max-w-3xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2 tracking-tight">맞춤 설정 ⚙️</h2>
            <p className="text-gray-500 mb-10 text-lg">나만의 정리 규칙을 만들어보세요.</p>
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
              <Settings className="mx-auto text-gray-300 mb-4 animate-spin-slow" size={48} />
              <p className="text-gray-500 font-medium">
                현재 키워드 및 확장자 커스텀 기능을 준비 중입니다!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
