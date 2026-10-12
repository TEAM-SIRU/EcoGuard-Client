# EcoGuard teacher web

## Local setup

1. Start `EcoGuard-Server` on port 8080 with its local database and OAuth settings configured.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_GSM_AUTHORIZATION_URL` to the authorize URL for the DataGSM OAuth client. Register the web app URL as its redirect URI and set the exact same value in the server's `GSM_OAUTH_REDIRECT_URI`. The authorize URL must return `code` and `state` query parameters to the web app.
4. Run `npm ci` and `npm run dev`.

The teacher web uses the server's `/api/v1` API with bearer access tokens, refreshes access tokens through `/auth/refresh`, and clears the session on logout. Access and refresh tokens are kept in the current browser tab's session storage. No mock data is used for operational screens.

The server currently does not expose a teacher endpoint for the complete per-student **today** roster. The dashboard therefore shows the live review queue, pending appeals, recruitment list, and area configuration available from the current API. Add a dedicated dashboard endpoint before showing daily submitted / approved / rejected / missing totals.
