# EcoGuard teacher web

## Local setup

1. The client uses `https://ecoguard.https.gsmsv.site/api/v1` by default. Set `VITE_API_BASE_URL` only when pointing to another EcoGuard API (such as a local server).
2. Copy `.env.example` to `.env.local` for the DataGSM OAuth client settings.
3. Set the OAuth client ID and web callback URI. Register the callback URI with DataGSM and add it to the server's allowed redirect URI configuration. The OAuth authorization response must return `code` and `state` to the web app.
4. Run `npm ci` and `npm run dev`.

The teacher web uses the server's `/api/v1` API with bearer access tokens, refreshes access tokens through `/auth/refresh`, and clears the session on logout. Access and refresh tokens are kept in the current browser tab's session storage. No mock data is used for operational screens.

The server currently does not expose a teacher endpoint for the complete per-student **today** roster. The dashboard therefore shows the live review queue, pending appeals, recruitment list, and area configuration available from the current API. Add a dedicated dashboard endpoint before showing daily submitted / approved / rejected / missing totals.
