# EchoGuard Frontend convention

## commit message

- 커밋메시지는 각 변경 및 추가 사항마다 다르게 작성합니다.

  > feature: 새 기능 추가 <br>
  > fix: 버그 수정 <br>
  > chore: 빌드 프로세스 또는 기타 설정 수정 <br>
  > docs: 문서 수정 <br>
  > refactor: 기존 코드 리팩터링 작업 <br>
  > test: 테스트 코드 수정

- 올바른 예시:
  feature: 로그인 회원가입 추가
  fix: 마이페이지로 연결이 안되던 문제 해결

- 틀린 예시:
  feature: 로그인 회원가입 기능 추가했습니다
  fix: 버그 해결

커밋 작성 시 꼭 유의해주세요.

## Branch Name

브랜치 명 또한 위의 커밋 메시지 작성과 유사하게 작성합니다.

올바른 예시:

- feature/로그인 회원가입 화면
- fix: 마이페이지에서 보이지 않던 텍스트 수정

틀린 예시:

- feature/ 로그인 회원가입 화면 구현했습니다.
- fix/텍스트 수정했습니다.

## Pull Request & Issue

PR명과 이슈명 또한 비슷하게 작성합니다.

올바른 예시:

- [fix] 텍스트 오타 수정
- [featuer] 마이페이지 기능 구현

틀린 예시:

- [fix] 텍스트 오타 수정했습니다
- [feature] 마이페이지 구현했습니다
# EchoGuard-Client

## Local development

1. Start `EcoGuard-Server` on port `8080` and configure its database, JWT secret, and DataGSM OAuth values as described in the server README.
2. Copy `.env.example` to `.env.local`. Change `ECOGUARD_SERVER_URL` if the server runs at a different address.
3. Run `npm ci` and `npm run dev`.
4. Sign in with a DataGSM authorization code. The client exchanges it with `POST /api/v1/auth/login`; session tokens stay in this browser and access tokens are refreshed through the server when needed.

The Vite development server proxies `/api/v1` to EcoGuard Server, so local development does not require adding the Vite origin to the server CORS allowlist. For a production build, set `VITE_API_BASE_URL` to the server API base and configure the server's `CORS_ALLOWED_ORIGINS` to include the deployed client origin.

The cleaning-area screen uses the server's `GET /cleaning-areas`, `PATCH /cleaning-areas/{areaId}`, `GET /students/activities`, and `POST /cleaning-areas/{areaId}/assignments` endpoints. The server currently has no endpoint for unassigning an individual student, so the client does not show a local-only remove action.

The server has no browser OAuth authorization URL endpoint; the login screen accepts the authorization code supplied by the DataGSM sign-in flow.
