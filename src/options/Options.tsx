import { useState, useEffect } from 'react'

import './Options.css'

export const Options = () => {
  return (
    <main style={{ maxWidth: 680, margin: '24px auto', lineHeight: 1.6 }}>
      <h2>Auto Sign 사용 방법</h2>
      <p style={{ color: '#666' }}>현재는 Microsoft 계정만 지원합니다.</p>

      <ol>
        <li>팝업에서 “Microsoft 계정 연결” 버튼을 눌러 로그인합니다.</li>
        <li>로그인이 완료되면 토큰이 확장 프로그램에 안전하게 저장됩니다.</li>
        <li>OTP가 필요한 페이지로 이동하면 자동으로 메일을 확인하여 입력합니다.</li>
      </ol>

      <h3>문제 해결</h3>
      <ul>
        <li>로그인이 반복되면 팝업에서 상태를 확인하고 다시 연결하세요.</li>
        <li>브라우저에서 팝업 차단/사설망 보안툴이 로그인 창을 막지 않는지 확인하세요.</li>
      </ul>
    </main>
  )
}

export default Options
