# Cloud / Deployment Notes

- New backend endpoint: `GET /api/profile`
  - Requires an authenticated request (send `Authorization: Bearer <accessToken>`)
  - Returns JSON: `{ success: true, message: "Profile", data: { user, hamaraUserProfileData } }`
  - `user` is the local DB user record (password excluded).
  - `hamaraUserProfileData` contains the remote Hamara player data when available, otherwise `null`.

- Implementation details:
  - Uses `src/utils/hamaraEngageService.ts` to query the Hamara Engage service.
  - The Hamara service key from `HAMARA_ENGAGE_BACKEND` is sent as `x-service-key` for service-to-service calls (configured via `SERVICE_SHARED_KEY` env var).

- Frontend integration:
  - Call `GET /api/profile` from the frontend with the user's access token in the `Authorization` header.
  - Example fetch:

  ```http
  GET /api/profile
  Authorization: Bearer <access-token>
  ```

- Environment variables to verify:
  - `HAMARA_ENGAGE_BACKEND` (base URL)
  - `SERVICE_SHARED_KEY` (shared service key)

- Testing locally:
  - Start backend: `npm run dev` (or your usual start command) and ensure env vars are set.
  - Curl example:

  ```bash
  curl -H "Authorization: Bearer <token>" http://localhost:5001/api/profile
  ```

- Notes:
  - The endpoint attempts to fetch Hamara data using the local user id as the player id. If your Hamara installation uses a different id (email/username), adjust the mapping in `src/route/profile.routes.ts` accordingly.
