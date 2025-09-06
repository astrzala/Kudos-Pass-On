# Kudos Pass (Azure)

Next.js + Azure App Service + Cosmos DB + Web PubSub.

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
Set in App Service Configuration:
- `COSMOS_CONN_STRING`
- `COSMOS_DB_NAME=kudos`
- `COSMOS_CONTAINER_NAME=items`
- `WEBPUBSUB_CONN_STRING` (optional; enables realtime)
- `WEBPUBSUB_HUB=kudos`
- `ORIGIN_URL=https://<your-app>.azurewebsites.net`
- `NODE_ENV=production`

## Local
```bash
npm i
npm run build
npm start
```

## Deploy
- Build in CI, deploy `.next/standalone` to App Service or use `next start`

## API
- POST `/api/session`
- POST `/api/join`
- POST `/api/round/start`
- POST `/api/note`
- POST `/api/moderation/softDelete`
- POST `/api/session/lock?code=...&lock=1`
- POST `/api/session/end?code=...`
- GET  `/api/session?code=...`
- GET  `/api/now`
- GET  `/api/export/csv?code=...`
- GET  `/api/export/pdf?code=...&me=...`