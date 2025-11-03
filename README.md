# CNU 2FA Autofill (충남대학교 포털 OTP 자동 입력)

이 확장 프로그램은 충남대학교 포털(o.cnu.ac.kr)의 2차 인증(OTP) 입력을 자동화합니다. Microsoft 계정을 연결하면 최신 메일의 OTP 코드를 확인하여 로그인 필드에 자동 입력합니다.

## 배포 정책 안내

- Chrome Web Store 정책상 외부 배포가 어려워 현재는 “코드 공개”만 진행합니다.
- 사용을 원하시면 저장소 코드를 직접 참조하여 로컬에서 빌드 후 설치하세요. 자세한 내용은 정책상 서술하지 않습니다.

## 개인정보 보호 및 권한

- 데이터 사용 목적: OTP 코드 추출 및 로그인 필드 자동 입력 전용.
- 저장: 이메일 본문/제목은 저장하지 않으며, 인증 토큰은 브라우저 저장소(`chrome.storage.local`)에만 보관됩니다.
- 필수 권한: Microsoft Graph `Mail.Read` (핵심 기능 수행을 위한 최소 권한)
- 자세한 내용은 [PRIVACY.md](./PRIVACY.md)를 확인하세요.

## 보안 경고 및 책임 부인 (Disclaimer)

1) 악성 확장 프로그램 및 토큰 탈취 위험
- 동일 브라우저 프로필에 설치된 악성 확장 프로그램이 `chrome.storage.local`에 보관된 Refresh Token에 접근할 수 있다면, 토큰이 탈취될 수 있습니다. 신뢰할 수 없는 확장 설치를 금지하세요.

2) PC 시스템 감염으로 인한 데이터 유출
- OS 레벨 악성코드(바이러스/트로이 목마 등)에 감염된 경우, 저장소/메모리에서 토큰이 유출될 수 있습니다. 운영체제와 백신을 최신 상태로 유지하세요.

3) CLIENT_ID 남용 가능성(관리적 책임)
- CLIENT_ID는 공개되어 있으며, 이를 악용한 피싱/남용이 발생할 경우 Microsoft가 해당 앱의 접근을 차단할 수 있습니다. 선의의 사용자도 영향을 받을 수 있으니, 정책 위반 행위를 금합니다.

핵심 안내: 이 확장은 Refresh Token을 브라우저에 저장합니다. 다른 확장 프로그램을 신뢰할 수 있는지 사용자 본인이 책임지고 확인해야 합니다.

## 도움말 및 소스 코드

- GitHub: https://github.com/Hy3ons/CNU-2FA-Autofill
- 문제가 발생하면 저장소 이슈를 통해 알려주세요.

---

## 개발자용 문서 (구현 개요)

### 아키텍처
- Manifest V3 + Vite + React
- Background Service Worker: 인증(OAuth/PKCE), 토큰 저장/갱신, 메시지 라우팅
- Content Script: 대상 페이지에서 OTP 입력란 탐색 및 자동 입력
- Popup(React): OAuth 트리거, 상태 표시(로그인됨/필요), 가이드/링크 노출

### 인증 흐름 (OAuth 2.0 + PKCE)
- 팝업 → BG 메시지 `AUTH_START`
- BG: `code_verifier` 생성 → `code_challenge(S256)`로 `authorize` URL 구성 → `chrome.identity.launchWebAuthFlow`
- Redirect 수신 후 `code` 추출 → `token` 엔드포인트로 `authorization_code + code_verifier` 교환
- 응답으로 AT/RT 획득 후 `chrome.storage.local` 저장, 만료 5분 전 `chrome.alarms`로 갱신 예약

관련 코드
- `src/background/index.ts`: PKCE 생성, 코드 교환, 리프레시, 알람 스케줄, `GET_AUTH_STATUS`/`GET_ACCESS_TOKEN`
- `src/logic/auth.ts`: 팝업-백그라운드 메시지 헬퍼
- 상수: `src/constant/constant.ts` (`CLIENT_ID`, `MS_TENANT`, `MS_SCOPES` 등)

### 토큰 저장/갱신
- 저장소: `chrome.storage.local.oauthTokens { accessToken, refreshToken, expiresAtMs }`
- 만료 체크: `isExpired(expiresAtMs, skew)`
- 갱신: `refresh_token` 그랜트로 AT 재발급 → 재저장 → 재예약

### OTP 파싱 및 자동 입력
- Graph API: `/me/messages`에서 최근 메일 조회(정렬/필드 제한)
- 필터: 발신자 `SENDER_EMAIL`에 해당하는 최신 메일 선택, 수신시각이 호출 이후인 메일만 사용
- 파싱: 정규식 `/OTP\s*:\s*(\d{6})/i`
- 입력: `contentScript`에서 `input[name="otpNum"]`에 값 주입 후 버튼 스타일/텍스트 업데이트

### 개발/빌드
- 개발 서버(HMR) 사용 시: `npm run dev` (Vite), 확장 개발 모드에서 로컬 포트 연결 필요
- 배포: `npm run build` → `build/` 폴더를 “압축해제된 확장 프로그램 로드”
- 키/아이콘: `public/icons/` 경로 참고, 확장 ID 고정을 원하면 개인 키를 유지

### 상수(설정) 파일 안내: `src/constant/constant.ts`
- `SENDER_EMAIL`: OTP 메일 발신자 이메일. 최신 메일에서 OTP를 추출할 때 필터에 사용됩니다.
- `CLIENT_ID`: Microsoft Entra 앱 등록의 클라이언트 ID(공개값). 정책 위반 사용 금지.
- `MS_TENANT`: 테넌트 식별자. 기본 `common`, 조직 전용이면 테넌트 ID로 교체.
- `MS_SCOPES`: OAuth 범위 배열. 최소 권한 원칙으로 `offline_access`, `Mail.Read`를 포함.

### 상수(설정)2 : `src/manifest.config.ts`
- `PUBLIC_KEY`: 확장 공개 키. 확장 ID 고정용. 개인 키는 절대 커밋 금지.

### 보안 주의 (요약)
- RT는 로컬 저장됩니다. 동일 프로필의 악성 확장/OS 침해에 주의
- CLIENT_ID는 공개값이며, 정책 위반 사용은 전체 차단으로 이어질 수 있음
