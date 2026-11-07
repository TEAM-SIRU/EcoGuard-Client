import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { createOAuthAuthorizationRequest } from '../api'
import { InfoIcon, SproutIcon } from '../components/icons'

export function Login({
  onLogin,
  loading,
  error,
}: {
  onLogin: (code: string, redirectUri: string) => void
  loading: boolean
  error: string
}) {
  const [loginError, setLoginError] = useState(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.has('error')) return 'DataGSM 로그인에 실패했어요. 다시 시도해 주세요.'
    const receivedCode = query.get('code')
    const receivedState = query.get('state')
    if (!receivedCode && !receivedState) return ''
    const expectedState = sessionStorage.getItem('ecoguard.oauth-state')
    const redirectUri = sessionStorage.getItem('ecoguard.oauth-redirect-uri')
    return receivedCode &&
      receivedState &&
      expectedState &&
      receivedState === expectedState &&
      redirectUri
      ? ''
      : '로그인 확인 정보가 일치하지 않아요. 다시 로그인해 주세요.'
  })
  const [startingLogin, setStartingLogin] = useState(false)

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const receivedCode = query.get('code')
    const receivedState = query.get('state')
    const expectedState = sessionStorage.getItem('ecoguard.oauth-state')
    const redirectUri = sessionStorage.getItem('ecoguard.oauth-redirect-uri')
    const oauthError = query.get('error')

    if (oauthError) {
      sessionStorage.removeItem('ecoguard.oauth-state')
      sessionStorage.removeItem('ecoguard.oauth-redirect-uri')
      history.replaceState({}, '', window.location.pathname)
      return
    }

    if (!receivedCode && !receivedState) return

    history.replaceState({}, '', window.location.pathname)
    if (
      receivedCode &&
      receivedState &&
      expectedState &&
      receivedState === expectedState &&
      redirectUri
    ) {
      sessionStorage.removeItem('ecoguard.oauth-state')
      sessionStorage.removeItem('ecoguard.oauth-redirect-uri')
      onLogin(receivedCode, redirectUri)
      return
    }

    sessionStorage.removeItem('ecoguard.oauth-state')
    sessionStorage.removeItem('ecoguard.oauth-redirect-uri')
  }, [onLogin])

  function startLogin() {
    setStartingLogin(true)
    setLoginError('')
    try {
      const state = crypto.randomUUID()
      const request = createOAuthAuthorizationRequest(state)
      if (!request) {
        setLoginError(
          'VITE_GSM_CLIENT_ID를 배포 환경변수에 설정하고 다시 빌드해 주세요. 인가 URL에 client_id를 포함해도 됩니다.',
        )
        return
      }
      sessionStorage.setItem('ecoguard.oauth-state', state)
      sessionStorage.setItem('ecoguard.oauth-redirect-uri', request.redirectUri)
      window.location.assign(request.url)
    } catch {
      setLoginError('로그인 주소를 준비하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setStartingLogin(false)
    }
  }

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div className="admin-login-screen">
        <section className="login-brand-panel">
          <div className="login-brand">
            <SproutIcon />
            <b>환경지킴이</b>
          </div>
          <div className="login-hero">
            <h1>
              학교를 깨끗하게,
              <br />
              함께 만드는 습관
            </h1>
            <p>
              학생들의 아침 청소 인증을 확인하고,
              <br />
              구역과 공지를 한곳에서 관리해요.
            </p>
          </div>
          <p className="login-footer">교사용 관리자 페이지</p>
        </section>
        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="login-greeting">
              <h2>선생님, 안녕하세요</h2>
              <p>학교 교사 계정으로 로그인해 주세요.</p>
            </div>
            <button
              className="button primary login-oauth"
              onClick={() => startLogin()}
              disabled={loading || startingLogin}
            >
              {loading || startingLogin ? '로그인 중…' : 'dataGSM으로 로그인'}
            </button>
            <div className={`login-info ${error || loginError ? 'has-error' : ''}`}>
              <InfoIcon />
              <p>
                {error ||
                  loginError ||
                  '교사 계정만 들어올 수 있어요. 학생은 모바일 앱에서 인증해 주세요.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
