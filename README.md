# Kudos Pass (Azure)

Next.js + Azure App Service + Cosmos DB (Mongo API) + Azure Web PubSub.

## Features
- 24h sessions (Cosmos TTL)
- Real-time via Web PubSub (fallback polling)
- Client-driven timer
- PDF/CSV exports

## Azure Resources
- App Service (Free/F1)
- Cosmos DB (API for NoSQL)
  - Database: `kudos`
  - Container: `items`, partition key `/sessionCode`, default TTL 86400
- Web PubSub (Free), Hub `kudos`

## Environment
Set these in your environment (locally via `.env.local`, in Azure via Configuration):
- `COSMOS_CONN_STRING` (Mongo connection string for Cosmos DB API for Mongo)
- `COSMOS_DB_NAME` (default `kudos`)
- `COSMOS_CONTAINER_NAME` (default `items`)
- `WEBPUBSUB_CONN_STRING` (optional; enables realtime via Azure Web PubSub)
- `WEBPUBSUB_HUB` (default `kudos`)
- `ORIGIN_URL` (optional; e.g. `https://<your-app>.azurewebsites.net`)
- `NODE_ENV` (`development` locally, `production` in Azure)

## Local
```bash
npm i
npm run dev
# or build and start
npm run build && npm run start
```

When `WEBPUBSUB_CONN_STRING` is not set, the app automatically falls back to ETag-based polling.

## Deploy
- Build in CI. Deploy using `next start` on Azure App Service, or deploy `.next/standalone` if preferred.

## API
- POST `/api/session` — create session
- POST `/api/join` — join by code
- POST `/api/round/start` — start next round (admin-only)
- POST `/api/note` — submit KUDOs for current round
- POST `/api/moderation/softDelete` — remove a note (admin-only)
- POST `/api/session/lock?code=...&lock=1` — lock/unlock submissions (admin-only)
- POST `/api/session/end?code=...` — end session (admin-only)
- GET  `/api/session?code=...` — hydrate session state
- GET  `/api/now` — server time
- GET  `/api/export/csv?code=...` — export all notes as CSV
- GET  `/api/export/pdf?code=...&me=...` — export personal notes as PDF

## Realtime behavior
- The client negotiates Azure Web PubSub and joins group `session:<code>`.
- On failures, it falls back to polling every ~3.5s with ETag to minimize payload.
- Events published: `session:update`, `round:start`, `note:submitted`, `moderation:update`.
- Lobby auto-redirects to `/s/<code>/round/<i>` when a round starts, even under polling.
