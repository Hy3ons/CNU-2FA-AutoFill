import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'
import { PUBLIC_KEY } from './manifest.config'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'icons/otp-logo.png',
    32: 'icons/otp-logo.png',
    48: 'icons/otp-logo.png',
    128: 'icons/otp-logo.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: 'icons/otp-logo.png',
  },
  options_page: 'options.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      // 학교 로그인 홈페이지에 대해 매칭
      matches: [
        'https://portal.cnu.ac.kr/proc/Login.eps',
      ],
      js: ['src/contentScript/index.ts'],
      run_at: 'document_idle',
    },
  ],

  // side_panel removed
  web_accessible_resources: [
    {
      resources: ['icons/otp-logo.png'],
      matches: [],
    },
  ],
  permissions: ['storage', 'alarms', 'identity'],
  host_permissions: [
    'https://login.microsoftonline.com/*',
    'https://graph.microsoft.com/*'
  ],

  // 사용하지 않아, 주석 처리 합니다.
  // chrome_url_overrides: {
  //   newtab: 'newtab.html',
  // },
  "content_security_policy": {
    "extension_pages": "script-src 'self' http://localhost:5174; object-src 'self';"
  },

  key : PUBLIC_KEY,
})
