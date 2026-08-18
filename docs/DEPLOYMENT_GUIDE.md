# Campus Connect — Production Deployment Guide

## Overview
This document covers deploying the compiled Campus Connect frontend SPA and connecting it to your independent Supabase production instance.

---

## 1. Frontend Build Architecture
- **Framework**: React 18 + Vite (SPA)
- **Output**: Static files in `/dist` (`index.html`, `assets/`, `sw.js`)
- **Routing**: Client-side React Router (Catch-all fallback to `/index.html` required on hosting provider)

---

## 2. Hosting Provider Deployment Options

### Option A: Cloud Run / Docker Container
A standard production static server container serving `dist/`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### Option B: Vercel / Netlify
1. Connect GitHub repository.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Configure SPA rewrite rule (redirect `/*` to `/index.html`).
5. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

---

## 3. Post-Deployment Verification Checklist
1. **Health Check**: Verify `/functions/v1/health-check` returns `{ status: "ok" }`.
2. **Auth Flow**: Sign in as Super Admin (`/auth`) and verify dashboard load.
3. **Public Certificate Verification**: Scan or navigate to `/verify/<ref>?t=<token>` and verify instant verification modal.
4. **Attendance QR Code Generation**: In faculty portal, create a lecture and verify TOTP QR rotation.
5. **Realtime**: Mark test attendance and observe instant counter update in admin live view.
