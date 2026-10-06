# Customer Management Frontend

React + Vite web client for the EP-01 sign-in flow.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Set `VITE_API_BASE_URL` in `.env.local` to the backend origin if it is not `http://localhost:8000`.

The frontend sends JSON requests to the backend and keeps the bearer token in the browser session. It checks `/api/auth/me` on page reload, refreshes the session near expiry when there has been browser activity within the last five minutes, and calls the server logout endpoint so a signed-out session is revoked immediately. An expired session is cleared and the user is sent back to sign-in with a message. After sign-in it opens `/dashboard/<role>`; role-specific business dashboards can be added when the roles and requirements are confirmed.

## Backend API contract

The frontend and backend repositories share one API contract:

| Request | Success response |
| --- | --- |
| `POST /api/auth/login` with `{ "email": "...", "password": "..." }` | `{ "access_token": "...", "token_type": "bearer", "expires_in": 3600, "user": { "id": 1, "email": "...", "role": "..." } }` |
| `GET /api/auth/me` with `Authorization: Bearer <token>` | `{ "id": 1, "email": "...", "role": "...", "expires_in": 3600 }` |
| `POST /api/auth/refresh` with `Authorization: Bearer <token>` | `{ "access_token": "...", "token_type": "bearer", "expires_in": 3600 }` |
| `POST /api/auth/logout` with `Authorization: Bearer <token>` | `204 No Content` |

An invalid or expired session returns `401`; the frontend clears the saved token and displays the backend's error message on the sign-in page.

Build for deployment with `npm run build`.
