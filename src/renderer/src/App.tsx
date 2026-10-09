import React, { useState } from 'react'

function App(): React.ReactElement {
  // 화면에 보여줄 상태들 (로그 기록, 로딩 상태, 결과 요약)
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<{
    total?: number
    success?: number
    skip?: number
    error?: number
    restored?: number
  } | null>(null)

  // 1. [문서 정리] 버튼을 눌렀을 때 실행될 함수
  const handleClean = async (): Promise<void> => {
    setIsLoading(true)
    setStats(null)
    setLogs(['문서 정리를 시작합니다...'])
    try {
      // window.api를 통해 cleaner.ts에 명령을 내립니다!
      const result = await window.api.cleanFiles()
      // 돌아온 결과를 화면 상태에 저장합니다.
      setStats({ total:
        result.total, 
        success: result.success, 
        skip: result.skip, 
        error: 
        result.error })
      setLogs(result.logs)
    } catch (err) {
      setLogs([`오류가 발생했습니다: ${String(err)}`])
    } finally {
      setIsLoading(false)
    }
  }

  // 2. [문서 복원] 버튼을 눌렀을 때 실행될 함수
  const handleRestore = async (): Promise<void> => {
    setIsLoading(true)
    setStats(null)
    setLogs(['문서 복원을 시작합니다...'])
    
    try {
      const result = await window.api.restoreFiles()
      setStats({ restored: result.restored })
      setLogs(result.logs)
    } catch (err) {
      setLogs([`오류가 발생했습니다: ${String(err)}`])
    } finally {
      setIsLoading(false)
    }
  }

  // 화면 디자인 (HTML 구조)
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>바탕화면 문서 자동 정리기</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleClean} disabled={isLoading} style={{ marginRight: '10px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          {isLoading ? '처리 중...' : '바탕화면 문서 정리'}
        </button>
        <button onClick={handleRestore} disabled={isLoading} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          {isLoading ? '처리 중...' : '바탕화면으로 복원'}
        </button>
      </div>

      {stats && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px', color: '#333' }}>
          <h3 style={{ marginTop: 0 }}>결과 요약</h3>
          {stats.restored !== undefined ? (
            <p style={{ margin: 0 }}>복원 성공: {stats.restored}건</p>
          ) : (
            <p style={{ margin: 0 }}>
              대상: {stats.total}건 / <strong>성공: {stats.success}건</strong> / 건너뜀: {stats.skip}건 / 오류: {stats.error}건
            </p>
          )}
        </div>
      )}

      <div>
        <h3>작업 로그</h3>
        {/* 개발자들 좋아하는 검은색 터미널 스타일 로그창 */}
        <div style={{ height: '300px', overflowY: 'auto', backgroundColor: '#1e1e1e', color: '#00ff00', padding: '15px', borderRadius: '8px', fontFamily: 'monospace' }}>
          {logs.length === 0 && <span style={{ color: '#888' }}>대기 중...</span>}
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App