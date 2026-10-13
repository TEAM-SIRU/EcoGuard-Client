# EcoGuard teacher web

## Local setup

1. Set the build-time variable `VITE_API_BASE_URL=https://ecoguard.https.gsmsv.site/api/v1` for production.
2. Set `VITE_GSM_AUTHORIZATION_URL` to the DataGSM authorization endpoint and `VITE_GSM_CLIENT_ID` to the web app's client ID.
3. Register `https://ecoguard-web.https.gsmsv.site` as the DataGSM web redirect URI and configure the same URI in the server's web OAuth settings. Do not add a trailing slash or callback path. The app reads `code` and `state` from the root page and sends the same URI as `redirectUri` to `/auth/login`.
4. Run `npm ci` and `npm run dev`.

The teacher web uses the server's `/api/v1` API with bearer access tokens, refreshes access tokens through `/auth/refresh`, and clears the session on logout. Access and refresh tokens are kept in the current browser tab's session storage. No mock data is used for operational screens. OAuth and API variables are embedded at build time; configure them in the deployment environment before building.

The server currently does not expose a teacher endpoint for the complete per-student **today** roster. The dashboard therefore shows the live review queue, pending appeals, recruitment list, and area configuration available from the current API. Add a dedicated dashboard endpoint before showing daily submitted / approved / rejected / missing totals.
