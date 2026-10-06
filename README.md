# Customer Management Frontend

React + Vite web client for the EP-01 sign-in flow.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Set `VITE_API_BASE_URL` in `.env.local` to the backend origin if it is not `http://localhost:8000`.

The frontend sends JSON requests to the backend, keeps the short-lived bearer token in the browser session, and checks `/api/auth/me` on page reload. After sign-in it opens `/dashboard/<role>`; role-specific business dashboards can be added when the roles and requirements are confirmed.

Build for deployment with `npm run build`.
