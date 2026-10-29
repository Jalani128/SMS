# EduManage Multi-Tenant SMS — DevOps & Technical Operational Handover Guide

**System:** EduManage Multi-Tenant School Management System  
**Document Version:** 1.0.0 (Phase 22 Operational Handover)  
**Target Audience:** DevOps Engineers, Site Reliability Engineers (SRE), and System Maintainers  
**Classification:** Technical / Confidential  

---

## 1. System Architecture & Component Overview

```
                                  EDUMANAGE PRODUCTION TOPOLOGY
                                  
                         ┌─────────────────────────────────────────┐
                         │   Web Browser & Mobile PWA Clients      │
                         └────────────────────┬────────────────────┘
                                              │ HTTPS (Port 443)
                                              ▼
           ┌─────────────────────────────────────────────────────────────────────┐
           │                     Vercel Edge CDN / Hosting                       │
           │  - React 18 SPA compiled via Vite (client/dist)                     │
           │  - Rewrite fallback: /* -> /index.html (client/vercel.json)         │
           │  - Security headers: nosniff, DENY frame options, strict-origin     │
           └──────────────────────────────────┬──────────────────────────────────┘
                                              │ HTTPS & WSS (Port 443)
                                              ▼
           ┌─────────────────────────────────────────────────────────────────────┐
           │                   Render / Railway Web Service                      │
           │  - Persistent Node.js 20+ runtime (server/dist/server.js)           │
           │  - Socket.IO engine with school/user room scoping                   │
           │  - Trust Proxy: 1 enabled for reverse-proxy IP and secure cookies   │
           │  - Operational Probes: GET /api/v1/health & GET /api/v1/health/ready│
           └──────────────┬───────────────────┬───────────────────┬──────────────┘
                          │ TLS 1.3           │ SMTP (TLS 587)    │ HTTPS
                          ▼                   ▼                   ▼
           ┌────────────────────────┐  ┌──────────────┐  ┌────────────────────────┐
           │  MongoDB Atlas (M10+)  │  │ SendGrid /   │  │ Cloudinary CDN         │
           │  - 3-node replica set  │  │ AWS SES      │  │ - Avatar & homework    │
           │  - Compound indexes    │  │ Transactional│  │   asset transformations│
           │  - Continuous oplog    │  │ Email Engine │  │ - Signed URLs          │
           └────────────────────────┘  └──────────────┘  └────────────────────────┘
```

---

## 2. Monorepo Repository Structure & Key Commands

```text
School/
├── package.json                         # Monorepo root workspace orchestrator
├── DEPLOYMENT.md                        # Production deployment guide
├── Dockerfile                           # Production container image specification
├── docker-compose.yml                   # Containerized local production topology
├── .env.example                         # Production environment template (placeholders only)
├── .env.staging.example                 # Staging environment template
│
├── client/                              # Frontend React 18 + Vite SPA
│   ├── package.json                     # Client dependencies
│   ├── vite.config.ts                   # Bundler config & path aliases (@/*)
│   ├── vercel.json                      # Vercel SPA routing & security headers
│   └── src/                             # Pages, components, hooks, stores
│
├── server/                              # Backend Node.js Express API & WebSocket
│   ├── package.json                     # Server dependencies
│   ├── src/
│   │   ├── config/                      # env.ts, db.ts, socket.ts
│   │   ├── controllers/                 # Business logic controllers
│   │   ├── middlewares/                 # Auth, RBAC, tenant, rateLimiter, error
│   │   ├── models/                      # 27 Mongoose schemas & indexes
│   │   ├── routes/                      # Versioned Express routers
│   │   ├── scripts/buildIndexes.ts      # Non-destructive production index migration
│   │   └── test/                        # 20 verification & smoke test suites
│
└── docs/                                # Technical & administrator specifications
    ├── database-schema.md               # Complete Mongoose schemas & indexes
    ├── OPERATIONAL_HANDOVER.md          # Technical operational runbook (This Document)
    └── ADMINISTRATOR_HANDOVER.md        # School administrator user manual
```

### 2.1 Essential Build & Test Commands
```bash
# 1. Install all monorepo dependencies
npm run install:all

# 2. Run entire 20-suite automated test suite (535+ assertions)
npm test

# 3. Compile production frontend client (Vite bundle)
npm run build:client

# 4. Compile production backend server (TypeScript tsc)
npm run build:server

# 5. Execute production index migration (Safe & non-destructive)
npm run build:indexes

# 6. Run post-deployment production smoke test suite
npm run test:prod-smoke
```

---

## 3. Production Environment Variables Reference

Store these securely in your hosting provider's Secret Manager (e.g. Render Environment Variables, Vercel Project Environment Variables). **Never commit real values to version control.**

### 3.1 Backend Variables (`server`)
| Variable | Mandatory | Minimum Spec | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enforces production security, disables stack traces, and enforces secure cookies. |
| `PORT` | Yes | `5000` | Port assigned by hosting runtime. |
| `API_PREFIX` | Yes | `/api/v1` | URL path prefix for versioned endpoints. |
| `CLIENT_URL` | Yes | `https://app.yourdomain.com` | Allowed frontend origin for CORS and password reset links. |
| `ALLOWED_ORIGINS` | Yes | `https://app.yourdomain.com` | Comma-separated CORS allowlist. Never include wildcards. |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | MongoDB Atlas cluster connection string with TLS enabled. |
| `JWT_SECRET` | Yes | 32+ characters | High-entropy key for signing short-lived 15m access tokens. |
| `JWT_REFRESH_SECRET` | Yes | 32+ characters | High-entropy key for signing 7d refresh tokens. |
| `COOKIE_SECRET` | Yes | 32+ characters | Cookie signature secret for HttpOnly cookie validation. |
| `AUTO_ACTIVATE_SCHOOLS` | Yes | `false` | Requires real OTP email verification before activating schools. |
| `SMTP_HOST` | Yes | e.g. `smtp.sendgrid.net` | Outgoing transactional email host. |
| `SMTP_PORT` | Yes | `587` | Outgoing SMTP port (587 TLS or 465 SSL). |
| `SMTP_USER` | Yes | `apikey` | SMTP account username. |
| `SMTP_PASS` | Yes | Secret token | SMTP account password or API key. |
| `SMTP_FROM_EMAIL` | Yes | `no-reply@yourdomain.com` | Verified domain sender address. |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloud account name | Cloudinary asset cloud name. |
| `CLOUDINARY_API_KEY` | Yes | API key | Cloudinary access key. |
| `CLOUDINARY_API_SECRET` | Yes | Secret token | Cloudinary API secret. |
| `SOCKET_CORS_ORIGIN` | Yes | `https://app.yourdomain.com` | Permitted WebSocket origin. |
| `AI_PROVIDER` | No | `gemini` | AI assistant provider (`gemini` or `openai`). |
| `AI_API_KEY` | No | Secret token | API key for AI assistant features. |

### 3.2 Frontend Variables (`client`)
| Variable | Mandatory | Example | Purpose |
|---|---|---|---|
| `VITE_API_URL` | Yes | `https://api.yourdomain.com/api/v1` | Backend REST API endpoint. |
| `VITE_SOCKET_URL` | Yes | `https://api.yourdomain.com` | Backend WebSocket endpoint for Socket.IO. |
| `VITE_APP_NAME` | No | `EduManage SMS` | Public application branding. |
| `VITE_ENABLE_MOCK_AUTH` | Yes | `false` | Disables demo role switcher in production. |

---

## 4. Controlled Production Release Runbook

### Step 1: Pre-Deployment Verification
1. Ensure all 20 test suites pass: `npm test`.
2. Compile production artifacts: `npm run build:client && npm run build:server`.
3. Verify that all production secrets in the secret store match or exceed 32 characters.

### Step 2: Database Preparation & Index Migration
1. Verify latest MongoDB Atlas backup snapshot is completed (within last 1 hour).
2. Execute the non-destructive index migration script:
   ```bash
   npm run build:indexes
   ```
   *Expected Effect:* Builds all unique and compound tenant indexes (`{ schoolId: 1, ... }`) without dropping any collections or records.

### Step 3: Application Deployment
1. Deploy the backend service to Render/Railway.
2. Verify backend liveness: `curl -I https://api.yourdomain.com/health` (HTTP 200).
3. Verify backend readiness: `curl -I https://api.yourdomain.com/ready` (HTTP 200).
4. Deploy the frontend client to Vercel/Netlify.
5. Verify frontend loading over HTTPS: `curl -I https://app.yourdomain.com` (HTTP 200).

### Step 4: Post-Deployment Smoke Testing
Run the automated production smoke test suite against the target environment:
```bash
npm run test:prod-smoke
```
Execute the 15-point production checklist (Section 5 of `DEPLOYMENT.md`).

---

## 5. Monitoring, Alerting & Metrics Specification

### 5.1 Operational Logging Guidelines
All server logs follow a structured format with sanitized metadata:
- **Format:** `[LEVEL] [ISO_TIMESTAMP] Message { sanitized_metadata }`
- **Levels:** `INFO`, `WARN`, `ERROR`, `DEBUG` (disabled in production).
- **Automatic Redaction:** Passwords, tokens, OTPs, session cookies, and API keys are automatically stripped by `redactSensitiveData()`.

### 5.2 Alerting Thresholds & On-Call Matrix
| Priority | Incident Scenario | Trigger Condition | Target Response | Escalation Channel |
|---|---|---|---|---|
| **P0** | Database Outage | `/ready` probe returns HTTP 503 for > 1 min | < 5 minutes | Page Primary On-Call Engineer |
| **P0** | Core Service Down | API endpoint serves 502/504 for > 2 mins | < 5 minutes | PagerDuty / SRE Emergency Call |
| **P1** | Elevated Error Rate | 5xx HTTP response rate > 1.0% over 5 mins | < 15 minutes | Slack `#incident-alerts` & SMS |
| **P1** | Brute Force Attacks | Authentication failures > 50 / minute from single IP | < 15 minutes | Automated rate limit & SRE alert |
| **P2** | Resource Exhaustion | Node.js process heap memory > 85% for 10 mins | < 1 hour | Slack `#ops-notifications` |
| **P2** | SMTP Failures | Mailer delivery failure rate > 5.0% over 15 mins | < 2 hours | Email provider status check |

---

## 6. Backup, Recovery & Disaster Recovery (DR) Plan

### 6.1 Targets & Commitments
- **Recovery Point Objective (RPO):** Maximum acceptable data loss = **1 hour** (Supported by MongoDB Atlas continuous oplog backup).
- **Recovery Time Objective (RTO):** Target time to restore service = **30 minutes**.

### 6.2 Backup Schedule & Retention
- **Continuous Backups:** MongoDB Atlas Point-in-Time Recovery (PITR) retained for 7 days.
- **Daily Snapshots:** Taken at 02:00 UTC, retained for 30 days.
- **Weekly Snapshots:** Taken every Sunday, retained for 12 weeks.
- **Monthly Snapshots:** Taken on the 1st of each month, retained for 1 year.

### 6.3 Standalone Manual Backup Command (`mongodump`)
```bash
# Export compressed, timestamped database snapshot
mongodump --uri="mongodb+srv://<admin_user>:<admin_password>@<cluster>.mongodb.net/edumanage" \
  --out="./backups/edumanage_backup_$(date +%Y%m%d_%H%M%S)" \
  --gzip
```

### 6.4 Safe Restoration Procedure (`mongorestore`)
> [!CAUTION]
> Never execute restore commands directly against a live production database while user traffic is flowing. Always restore to an isolated recovery cluster first.

```bash
# Restore snapshot into an isolated verification database
mongorestore --drop \
  --uri="mongodb+srv://<admin_user>:<admin_password>@<recovery-cluster>.mongodb.net/edumanage_recovered" \
  ./backups/edumanage_backup_<timestamp>/edumanage \
  --gzip
```

---

## 7. Incident Response & Rollback Guide

### 7.1 Incident Scenarios & Response Runbooks

#### Scenario 1: Critical Application Outage (502 / 503 HTTP Errors)
1. **Immediate Action:** Check `/ready` and `/health` endpoints.
2. **Investigation:** Inspect backend stdout logs in hosting dashboard (Render / Railway). Check if Node.js event loop crashed or OOM occurred.
3. **Recovery:** If process crashed due to bad release, trigger **Instant Rollback** to previous release commit.

#### Scenario 2: Database Connectivity Outage
1. **Immediate Action:** Verify MongoDB Atlas cluster health and CPU/RAM metrics.
2. **Check IP Allowlist:** Verify hosting provider egress IPs are permitted in Atlas Network Access.
3. **Failover:** If primary node is down, MongoDB Atlas automatically elects a secondary replica within 10–30 seconds.

#### Scenario 3: Suspected Security / Token Exposure
1. **Immediate Action:** In hosting environment settings, immediately rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET` with new 64-character random strings.
2. **Effect:** Instantly revokes all active access tokens and refresh tokens across all schools and roles.
3. **Follow-up:** Check `AuditLog` collection for unauthorized tenant mutation records.

#### Scenario 4: Transactional Email / SMTP Outage
1. **Immediate Action:** Check provider status page (SendGrid / AWS SES).
2. **Resilience:** The application safely catches mailer timeouts without crashing the Node.js event loop.
3. **Recovery:** Reroute SMTP settings to fallback provider (e.g. switch from SendGrid to AWS SES via env variables).

### 7.2 Release Rollback Runbook
If a newly deployed release introduces critical regression:
1. **Vercel Frontend Rollback:** In Vercel Project Overview, locate the previous successful deployment and click **Instant Rollback**. Takes effect immediately across all edge CDNs.
2. **Render Backend Rollback:** In Render Dashboard, select Deploy History, locate the prior stable commit tag, and click **Rollback to this commit**.
3. **Verification:** Confirm health probes respond with 200 OK:
   ```bash
   curl https://api.yourdomain.com/health
   curl https://api.yourdomain.com/ready
   ```

---

## 8. Maintenance & Security Patching Runbook

1. **Monthly Dependency Audit:**
   ```bash
   npm audit
   npm outdated
   ```
2. **Security Fixes:** Run `npm audit fix` in non-breaking mode, verify with `npm test`, and promote through staging.
3. **MongoDB Minor Upgrades:** Scheduled via MongoDB Atlas automated maintenance windows during low-traffic periods (Sunday 03:00 UTC).
