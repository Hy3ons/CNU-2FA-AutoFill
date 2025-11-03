import { useEffect, useState } from 'react'
import { startMicrosoftOAuth, getAuthStatus } from '../logic/auth'

import './Popup.css'

export const Popup = () => {
  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [loggedIn, setLoggedIn] = useState<boolean>(false)
  const [expiresAt, setExpiresAt] = useState<number | undefined>(undefined)

  useEffect(() => {
    (async () => {
      try {
        const s = await getAuthStatus()
        setLoggedIn(s.hasTokens && s.valid)
        setExpiresAt(s.expiresAtMs)
        setMessage(s.hasTokens && s.valid ? '로그인됨' : '로그인이 필요합니다')
      } catch (e) {
        setMessage('상태 확인 실패')
      }
    })()
  }, [])

  const connect = async () => {
    try {
      setStatus('working')
      setMessage('로그인 진행 중...')
      await startMicrosoftOAuth()
      setStatus('ok')
      const s = await getAuthStatus()
      setLoggedIn(s.hasTokens && s.valid)
      setExpiresAt(s.expiresAtMs)
      setMessage('연결 완료')
    } catch (e) {
      setStatus('error')
      setMessage(String(e))
    }
  }

  const openHowTo = () => {
    chrome.runtime.openOptionsPage()
  }

  return (
    <main>
      <h3>Auto Sign</h3>
      <p style={{ marginTop: 4, color: '#666' }}>현재는 Microsoft만 지원합니다.</p>
      <p>
        {loggedIn ? '로그인됨' : '로그인이 필요합니다'}
        {loggedIn && expiresAt ? ` (만료: ${new Date(expiresAt).toLocaleString()})` : ''}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={connect} disabled={status === 'working'}>
          {status === 'working' ? '연결 중...' : 'Microsoft 계정 연결'}
        </button>
        <button onClick={openHowTo} style={{ background: '#eee', color: '#333' }}>
          사용 방법
        </button>
      </div>
      {message && <p>{message}</p>}

      <hr style={{ margin: '12px 0', opacity: 0.2 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a
          href="https://github.com/Hy3ons/CNU-2FA-Autofill"
          target="_blank"
          rel="noreferrer"
          title="GitHub 저장소 열기"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <img src="/icons/logo-github-w.png" width={18} height={18} alt="GitHub" />
          <span>소스 코드 (GitHub)</span>
        </a>
      </div>
      <p style={{ color: '#666', marginTop: 6 }}>
        업데이트는 수동으로 설치해야 합니다. 작동하지 않으면 저장소에서 안내를 확인해 주세요.
      </p>
    </main>
  )
}

export default Popup
