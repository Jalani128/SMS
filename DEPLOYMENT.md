# EduManage Multi-Tenant School Management System — Production Deployment Guide

This guide documents the production deployment architecture, security hardening, database setup, environment variables, CI/CD pipelines, smoke-testing checklist, and operational disaster-recovery procedures for the **EduManage MERN School Management System**.

---

## 1. Recommended Production Hosting Architecture

```
                   ┌──────────────────────────────────────┐
                   │    Web Browser / Mobile Client       │
                   └──────────────────┬───────────────────┘
                                      │ HTTPS
                                      ▼
           ┌──────────────────────────────────────────────────────┐
           │        Frontend Hosting (Vercel / Netlify)           │
           │  - React 18 SPA static assets compiled by Vite      │
           │  - Global Edge CDN caching                           │
           │  - Rewrite fallback: /* -> /index.html               │
           └──────────────────────────┬───────────────────────────┘
                                      │ HTTPS / WSS
                                      ▼
           ┌──────────────────────────────────────────────────────┐
           │       Backend Web Service (Render / Railway / VPS)   │
           │  - Node.js 20+ Express Engine (TypeScript binary)   │
           │  - Persistent WebSocket Engine (Socket.IO)           │
           │  - Trust Proxy: 1 enabled for secure cookies/IPs    │
           │  - Process Liveness (/api/health) & Readiness (/ready)│
           └──────────────┬───────────────────┬───────────────────┘
                          │ TLS 1.3           │ HTTPS
                          ▼                   ▼
           ┌────────────────────────┐  ┌────────────────────────┐
           │  Database (Atlas M10+) │  │ Media Asset Storage    │
           │  - Multi-region replica│  │  - Cloudinary Storage  │
           │  - Automated snapshots │  │  - Face crop transform │
           │  - autoIndex: false    │  │  - Signed destruction  │
           └────────────────────────┘  └────────────────────────┘
```

| Component | Recommended Provider | Alternative | Justification |
|---|---|---|---|
| **Frontend** | **Vercel** | Netlify / Cloudflare Pages | Optimized for Vite React SPAs, automatic branch previews, instant global CDN invalidation. |
| **Backend** | **Render** | Railway / Fly.io / AWS ECS | Persistent process runtime supporting HTTP and long-lived WebSockets for Socket.IO without disconnections. |
| **Database** | **MongoDB Atlas (M10+)** | AWS DocumentDB | Automated daily backup snapshots, point-in-time recovery, VPC peering, and enterprise TLS 1.3 encryption. |
| **Media Storage** | **Cloudinary** | AWS S3 / Cloudflare R2 | Built-in face-detection transformations, asset size optimization, and automatic CDN delivery. |
| **Email Service** | **SendGrid / AWS SES** | Mailgun / Postmark | Reliable transactional deliverability with DKIM/SPF alignment. |
| **CI/CD** | **GitHub Actions** | GitLab CI | Native automated workflow running all 18 test suites and production builds on push/PR. |

---

## 2. Prerequisites & Runtime Versions

- **Node.js:** `v20.10.0` or higher (LTS recommended)
- **npm:** `v10.0.0` or higher
- **MongoDB:** `v7.0+` (MongoDB Atlas cluster with replica set)
- **Docker (Optional):** Docker Engine `v24+` & Docker Compose `v2+`

---

## 3. Production Environment Variables Reference

### 3.1 Backend Variables (`server/.env`)

| Variable Name | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables production security, disables stack traces, enforces secure cookies. |
| `PORT` | Yes | `5000` (or assigned by host) | HTTP listen port. |
| `API_PREFIX` | Yes | `/api/v1` | Root prefix for API routes. |
| `CLIENT_URL` | Yes | `https://app.yourdomain.com` | Primary frontend origin for CORS and password reset email links. |
| `ALLOWED_ORIGINS` | Yes | `https://app.yourdomain.com,https://admin.yourdomain.com` | Comma-separated CORS allowlist. |
| `MONGODB_URI` | Yes | `mongodb+srv://<user>:<pwd>@<cluster>.mongodb.net/edumanage?retryWrites=true&w=majority` | Production MongoDB Atlas connection string. |
| `JWT_SECRET` | Yes | *Must be 32+ characters* | Cryptographic secret for signing short-lived access tokens (15m). |
| `JWT_REFRESH_SECRET` | Yes | *Must be 32+ characters* | Cryptographic secret for signing refresh tokens (7d). |
| `COOKIE_SECRET` | Yes | *Must be 32+ characters* | Cookie signing secret for cookie-parser. |
| `AUTO_ACTIVATE_SCHOOLS` | No | `false` | In production, must be `false` to require real OTP verification for school registration. |
| `SMTP_HOST` | Yes | `smtp.sendgrid.net` | Outgoing SMTP host. |
| `SMTP_PORT` | Yes | `587` | SMTP port (587 for TLS, 465 for SSL). |
| `SMTP_SECURE` | No | `false` | `true` if port 465, `false` if port 587. |
| `SMTP_USER` | Yes | `apikey` | SMTP username or API key. |
| `SMTP_PASS` | Yes | `your_smtp_secret_token` | SMTP password or secret key. |
| `SMTP_FROM_EMAIL` | Yes | `notifications@yourdomain.com` | Verified sender email address. |
| `SMTP_FROM_NAME` | No | `EduManage Notifications` | Display sender name. |
| `CLOUDINARY_CLOUD_NAME` | Yes | `your_cloud_name` | Cloudinary cloud account name. |
| `CLOUDINARY_API_KEY` | Yes | `your_api_key` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes | `your_api_secret` | Cloudinary API secret. |
| `SOCKET_CORS_ORIGIN` | Yes | `https://app.yourdomain.com` | Allowed WebSocket origin. |
| `AI_PROVIDER` | No | `gemini` | AI assistant provider (`gemini` or `openai`). |
| `AI_API_KEY` | No | `your_gemini_or_openai_key` | API key for AI assistant features. |

### 3.2 Frontend Variables (`client/.env`)

| Variable Name | Required | Default / Example | Purpose |
|---|---|---|---|
| `VITE_API_URL` | Yes | `https://api.yourdomain.com/api/v1` | Public backend API endpoint. |
| `VITE_SOCKET_URL` | Yes | `https://api.yourdomain.com` | Public WebSocket endpoint for real-time messaging. |
| `VITE_APP_NAME` | No | `EduManage SMS` | Public application title. |
| `VITE_ENABLE_MOCK_AUTH` | Yes | `false` | Must be `false` in production. Disables demo role switcher. |

---

## 4. Database Setup & Index Deployment (MongoDB Atlas)

### 4.1 Cluster Configuration
1. Create a MongoDB Atlas cluster (`M10` or higher for production SLA, `M0` for staging).
2. Set up **Database Access**: Create a least-privilege user with `readWrite` role scoped only to the `edumanage` database.
3. Set up **Network Access**: Add the static IP addresses or CIDR blocks of your backend hosting servers (or configure AWS VPC peering). Avoid `0.0.0.0/0` in production whenever possible.

### 4.2 Index Deployment
Because `autoIndex: false` is enforced in production to prevent runtime boot latency, run the automated index migration script once after deploying the database:

```bash
# In the server directory:
npm run build:indexes
```
This builds and verifies all compound and unique indexes across all 26 Mongoose models (such as `{ schoolId: 1, studentId: 1, date: 1 }` on Attendance and `{ schoolId: 1, invoiceNumber: 1 }` on Invoices).

### 4.3 Database Backup & Restoration Procedure
- **Automated Snapshots:** In MongoDB Atlas, enable Continuous Cloud Backups with point-in-time recovery.
- **Manual Backup (mongodump):**
  ```bash
  mongodump --uri="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/edumanage" --out=/backups/$(date +%F)
  ```
- **Restoration (mongorestore):**
  ```bash
  mongorestore --uri="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/edumanage" --drop /backups/2026-10-21/edumanage
  ```

---

## 5. Deployment Step-by-Step

### 5.1 Backend Deployment (Render / Railway)
1. **Connect Repository:** Link your GitHub repository.
2. **Environment:** Choose Node.js.
3. **Build Command:**
   ```bash
   npm run build:server
   ```
4. **Start Command:**
   ```bash
   npm run start --prefix server
   ```
5. **Environment Variables:** Populate all variables from Section 3.1. Ensure `NODE_ENV=production`.
6. **Health Check Path:** Set to `/api/health` or `/ready`.
7. **Scale / Instance:** Select an instance with at least 512MB RAM (1GB+ recommended).

### 5.2 Frontend Deployment (Vercel / Netlify)
1. **Import Project:** Select the `client` directory as the project root.
2. **Framework Preset:** Vite.
3. **Build Command:**
   ```bash
   npm run build
   ```
4. **Output Directory:**
   ```bash
   dist
   ```
5. **Environment Variables:** Set `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_ENABLE_MOCK_AUTH=false`.
6. **Routing Configuration:** The repository includes `client/vercel.json` and `client/public/_redirects` which automatically handle SPA routing rewrites.

---

## 6. Docker Container Deployment (Self-Hosted Alternative)

For deployment to AWS ECS, DigitalOcean App Platform, or a dedicated Ubuntu VPS, use the included production `Dockerfile` and `docker-compose.yml`:

```bash
# 1. Create production environment file
cp .env.example .env
# Edit .env with your real production secrets

# 2. Build and launch container stack
docker compose up -d --build

# 3. Verify container health
docker compose ps
docker compose logs -f api
```

---

## 7. Health & Readiness Probes

The backend exposes four distinct operational probe endpoints:

| Endpoint | Method | Expected Status | Purpose |
|---|---|---|---|
| `/api/health` | `GET` | `200 OK` | Process liveness check. Returns uptime, memory usage, and component status. |
| `/health` | `GET` | `200 OK` | Root liveness alias for load balancers. |
| `/api/ready` | `GET` | `200 OK` / `503 Unavailable` | Process readiness check. Verifies that MongoDB is actively connected before accepting traffic. |
| `/ready` | `GET` | `200 OK` / `503 Unavailable` | Root readiness alias for container orchestrators. |

---

## 8. 15-Point Production Smoke-Test Checklist

Execute this checklist immediately after initial deployment using dedicated test credentials:

- [ ] **1. HTTPS Enforcement:** Client loads cleanly over HTTPS with valid TLS certificate.
- [ ] **2. Health & Readiness:** `GET https://api.yourdomain.com/health` returns status `healthy` and `/ready` returns status `ready`.
- [ ] **3. School Registration & OTP:** Register a test school partition; verify OTP email arrives and activates tenant.
- [ ] **4. Administrator Authentication:** Log in as school admin; verify HttpOnly cookie and JWT Bearer token are issued.
- [ ] **5. Role-Based Route Guards:** Verify unauthorized routes redirect cleanly without exposing dashboard data.
- [ ] **6. Multi-Tenant Isolation:** Verify that School A admin cannot query or mutate records belonging to School B.
- [ ] **7. Student & Teacher Provisioning:** Create a teacher and student record; verify unique IDs are assigned.
- [ ] **8. Attendance Marking:** Mark daily attendance for a class; verify duplicate entries on the same date are rejected.
- [ ] **9. Fee Invoicing & Receipts:** Generate an invoice; simulate payment; verify invoice status updates to `paid` or `partially_paid`.
- [ ] **10. Homework & Submissions:** Publish homework as teacher; submit assignment as student; grade as teacher.
- [ ] **11. Timetable Conflict Detection:** Attempt booking overlapping teacher periods; verify system prevents conflict.
- [ ] **12. Exam Results Publication:** Verify draft exam marks remain hidden until published; verify report cards render.
- [ ] **13. Real-Time Messaging:** Connect two user sessions; verify real-time chat delivery over Socket.IO.
- [ ] **14. Profile & Session Revocation:** Update profile via allowlist; change password; verify older sessions are revoked.
- [ ] **15. Error Handling & Logs:** Verify that 404/500 errors return sanitized JSON without stack traces.

---

## 9. Rollback & Disaster Recovery Procedures

### 9.1 Application Rollback
- **Vercel / Netlify:** In the hosting dashboard, click on the previous successful deployment and select **Instant Rollback**.
- **Render / Railway:** Navigate to deployment history and trigger **Rollback to this commit**.
- **Git / Docker:**
  ```bash
  git checkout <previous-stable-tag>
  docker compose up -d --build
  ```

### 9.2 Critical Incident Response Protocol
1. **Database Unavailability:** Check MongoDB Atlas cluster metrics and IP allowlist. The application will serve `503` on `/ready`, preventing broken transactions.
2. **Suspected Credential Leakage:** Immediately rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET` in environment variables and restart backend. This instantly revokes all existing user sessions across all schools.
3. **SMTP Delivery Failure:** Verify SMTP credentials and domain sender reputation (SPF/DKIM/DMARC). The system safely logs failed dispatches to `AuditLog` without crashing the application.

---

## 10. Staging Deployment & Live Environment Verification Procedures (Phase 21)

### 10.1 Dedicated Staging Architecture & Environment Isolation
To guarantee zero-risk deployment verification, a dedicated staging tier must run entirely segregated from production:
- **Staging Frontend:** `https://staging-app.edumanage.example.com` (Vercel Preview / Staging project)
- **Staging Backend:** `https://staging-api.edumanage.example.com` (Render / Railway staging web service)
- **Staging Database:** Dedicated isolated Atlas cluster or database `edumanage_staging` (never co-located or sharing credentials with `edumanage_production`)
- **Staging Secrets:** Separate cryptographic keys (32+ chars) ensuring tokens cannot be replayed across environments.
- **Email Test Sink:** Mailtrap / Ethereal SMTP sandbox ensuring notifications never reach real student/parent mailboxes.
- **Storage Segregation:** Cloudinary staging folder prefix `edumanage_staging/` or dedicated sandbox cloud.

### 10.2 Staging Configuration Files
Three dedicated staging configuration templates are provided in the repository:
1. Root Monorepo: `.env.staging.example`
2. Backend Server: `server/.env.staging.example`
3. Frontend Client: `client/.env.staging.example`

### 10.3 Automated Staging Smoke & Failure Recovery Suite
Execute the dedicated staging verification test suite:
```bash
# In server workspace or from monorepo root:
npm run test:staging
```
The suite verifies 20 deterministic assertions:
1. **Database Isolation Guard:** `assertDatabaseIsolation()` strictly rejects any staging connection string containing `production` or `_prod`.
2. **Secrets Entropy:** Enforces minimum 32-character high-entropy keys for JWT access, refresh, and cookie secrets.
3. **Activation Enforcement:** `AUTO_ACTIVATE_SCHOOLS=false` enforces complete OTP registration workflows.
4. **CORS Hardening:** Strict origin allowlist rejecting all wildcards (`*`).
5. **Operational Probes:** Validates `/api/v1/health` (liveness) and `/api/v1/health/ready` (readiness).
6. **Multi-Tenant Boundaries:** Validates strict cross-tenant rejection (403 Forbidden) and role hierarchy.
7. **Failure Resilience (Chaos Outages):**
   - Simulated database outage: `/ready` returns HTTP 503, preventing traffic routing.
   - Simulated SMTP outage: Caught safely without crashing process; marks notification as failed with retry backoff.
   - Simulated AI timeout: `AbortController` triggers friendly fallback response without hanging event loop.
   - Simulated WebSocket disconnect: Cleans room bindings and prevents memory leaks.
8. **Backup & Rollback Procedures:** Validates `mongodump` command generation and restore safety blocks.

### 10.4 Staging Database Backup & Restore Runbook
```bash
# 1. Create Staging Backup Snapshot
mongodump --uri="mongodb+srv://staging_user:<staging_password>@staging-cluster.mongodb.net/edumanage_staging" --out="./backups/staging_$(date +%Y%m%d_%H%M%S)" --gzip

# 2. Restore into Isolated Test Database (Safety Guard: Never target production!)
mongorestore --drop --uri="mongodb+srv://staging_user:<staging_password>@staging-cluster.mongodb.net/edumanage_staging" ./backups/staging_<timestamp>/edumanage_staging --gzip
```

### 10.5 Production Go-Live Transition Protocol
Before promoting staging to production:
1. Ensure all 20 test suites pass (`npm test`).
2. Verify production build artifacts (`npm run build`).
3. Confirm that production credentials in hosting provider secrets manager are distinct from staging.
4. Execute initial database index migration on production cluster: `npm run build:indexes`.
5. Run the 15-Point Production Smoke-Test Checklist (Section 8) on live production domains.

---

## 11. Production Launch, Post-Deployment Monitoring & Operational Handover (Phase 22)

### 11.1 Controlled Production Launch Protocol
The deployment of the EduManage School Management System follows a strict, zero-downtime execution order:
1. **Pre-Flight Lock:** Ensure code is tagged on a clean Git commit (e.g. `tags/v1.0.0-release`).
2. **Database Backup Verification:** Confirm that MongoDB Atlas continuous oplog backup is running and a snapshot exists within the last 1 hour.
3. **Non-Destructive Index Migration:** Execute `npm run build:indexes` against the production cluster.
4. **Backend Web Service Deployment:** Deploy compiled TypeScript binary (`npm run build:server`) to persistent host (Render / Railway / VPS).
5. **Operational Probes Verification:** Verify HTTP 200 responses on `/api/v1/health` and `/api/v1/health/ready`.
6. **Frontend Static SPA Deployment:** Deploy compiled Vite bundle (`npm run build:client`) to global CDN (Vercel / Netlify).
7. **Post-Deployment Smoke Test:** Run the automated 20-check verification script:
   ```bash
   npm run test:prod-smoke
   ```

### 11.2 Post-Deployment Operational Visibility & Alert Thresholds
- **Structured JSON Logs:** All server logs output ISO 8601 timestamps, severity levels, and auto-sanitized metadata. Credentials (passwords, tokens, OTPs, session secrets) are automatically redacted via `redactSensitiveData()`.
- **P0 Critical Incidents (RTO < 5m):** Database disconnection (`readyState !== 1`) or total service outage (HTTP 502/504) -> PagerDuty alert to primary SRE.
- **P1 High Priority Incidents (RTO < 15m):** 5xx error rate > 1.0% over 5m, or authentication failure spikes > 50/min (brute-force detection) -> Incident channel notification.
- **P2 Operational Warnings (RTO < 1h):** Node heap memory > 85% for > 10m, or SMTP delivery failure rate > 5.0% -> DevOps notification.

### 11.3 Handover Documentation References
- **DevOps & System Maintainers:** Refer to [`docs/OPERATIONAL_HANDOVER.md`](file:///c:/Users/Jilani/OneDrive/Desktop/School/docs/OPERATIONAL_HANDOVER.md) for architecture, monitoring, backup retention, incident response runbooks, and security patching.
- **School Administrators & Principals:** Refer to [`docs/ADMINISTRATOR_HANDOVER.md`](file:///c:/Users/Jilani/OneDrive/Desktop/School/docs/ADMINISTRATOR_HANDOVER.md) for staff onboarding, student admissions, attendance, fees, exams, and school settings.


