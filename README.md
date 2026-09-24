# TRC Ads Server — Render Ready

This is the standalone backend for TRC VIDEO ADS STORE.
It accepts video ad submissions, stores pending campaigns, and lets the admin approve/reject/delete ads.

## Deploy on Render

1. Put this folder into a GitHub repository.
2. In Render choose **New → Web Service** and connect the repository.
3. Runtime: **Node**
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Health Check Path: `/api/health`
7. Add environment variables:
   - `ADMIN_USER` = your admin username
   - `ADMIN_PASSWORD` = your strong admin password
8. Deploy.
9. Render gives the service a public `https://YOUR-SERVICE.onrender.com` address.
10. Test `https://YOUR-SERVICE.onrender.com/api/health`.
11. Paste that base URL into TRC VIDEO ADS STORE → **TRC Ads Server** → Server URL.

## Important storage note

The current app stores the JSON database and uploaded videos on the server filesystem. Render's default filesystem is ephemeral, so uploaded ads can disappear after a restart/redeploy unless you attach a persistent disk or move storage to a persistent database/object-storage service.

For a paid Render web service, you can attach a persistent disk mounted at `/var/data` and set:
- `DATA_DIR=/var/data/data`
- `UPLOAD_DIR=/var/data/uploads`

For a first connection test, the default filesystem is enough to verify that the API and public URL work.

## Admin

Open the root URL to see the admin panel. Use the `ADMIN_USER` and `ADMIN_PASSWORD` environment variables you set in Render.

## API

- `GET /api/health`
- `POST /api/ads`
- `GET /api/ads`
- `GET /api/ads?public=1` — approved ads only
- `GET /api/admin/stats` — admin auth
- `PATCH /api/admin/ads/:id` — admin auth
- `DELETE /api/admin/ads/:id` — admin auth
- `POST /api/ads/:id/view`
