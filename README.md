# EduManage SMS — Multi-School Management System (Phase 1)

> **Phase 1: Foundation Scaffolding & UI Groundwork**  
> Built with React (Vite), TypeScript, Tailwind CSS, shadcn/ui conventions, Lucide React, Chart.js, Node.js with Express, MongoDB/Mongoose architecture, JWT authentication, and third-party integration scaffolding (Socket.IO, Nodemailer, Cloudinary).

---

## 📌 Phase 1 Scope & Architecture Highlights

Phase 1 focuses exclusively on the scaffolding, layout architecture, reusable UI design system, multi-tenant data isolation patterns, and role-based dashboard shells. Business logic mutations and real persistent databases are decoupled and planned for Phase 2.

- **Role-Aware Dashboards:** Four dedicated dashboards (**Admin**, **Teacher**, **Student**, **Parent**) with instant role-switching via the top header.
- **Enterprise Dashboard Layout:** Responsive collapsible sidebar, dynamic breadcrumbs, notification panel, global search, and user profile drawer.
- **Multi-Tenant Scoping:** Built-in multi-school isolation pattern using `x-school-id` headers, JWT token payload scoping, and a Mongoose `tenantIsolationPlugin` query hook.
- **Role-Based Access Control (RBAC):** Server-enforced middleware (`requireRole(['admin', ...])`) and frontend `RoleGuard` route wrappers.
- **Reusable UI Component System:** Built following shadcn/ui conventions (`Button`, `Card`, `Badge`, `Input`, `Label`, `Select`, `Table`, `Dialog`, `Skeleton`, `EmptyState`, `Tabs`).
- **Data Isolation:** All UI preview data is strictly isolated in `client/src/data/previewData.ts`. No fake records are returned by backend APIs as production data.
- **Third-Party Integration Stubs:** Configured architectural wrappers for **Socket.IO** (room scoping by school & user), **Nodemailer** (SMTP transporter), and **Cloudinary** (media CDN).

---

## 📂 Project Folder Structure

```text
School/
├── package.json                         # Root monorepo orchestrator (npm workspaces)
├── README.md                            # Comprehensive setup & architecture documentation
│
├── client/                              # Frontend React + Vite + TypeScript application
│   ├── index.html                       # HTML entry point with Inter font
│   ├── package.json                     # Client dependencies & scripts
│   ├── vite.config.ts                   # Vite configuration with @ path alias & API proxy
│   ├── tsconfig.json                    # Bundler-mode TypeScript configuration
│   ├── tsconfig.node.json               # Node-mode TypeScript configuration
│   ├── tailwind.config.js               # Tailwind CSS theme tokens & shadcn/ui color variables
│   ├── postcss.config.js                # PostCSS configuration
│   ├── .env.example                     # Client environment template
│   └── src/
│       ├── main.tsx                     # React DOM root hydration
│       ├── App.tsx                      # App provider tree (BrowserRouter, AuthProvider)
│       ├── index.css                    # Tailwind CSS directives & theme HSL variables
│       ├── vite-env.d.ts                # Vite client TypeScript definitions
│       │
│       ├── components/
│       │   ├── layout/                  # Responsive dashboard shell components
│       │   │   ├── DashboardLayout.tsx  # Layout container combining Sidebar & Header
│       │   │   ├── Sidebar.tsx          # Collapsible desktop sidebar & mobile drawer
│       │   │   ├── Header.tsx           # Top navigation bar with search & controls
│       │   │   ├── Breadcrumbs.tsx      # Dynamic route hierarchy breadcrumbs
│       │   │   ├── NotificationArea.tsx # Real-time notification drawer & counter
│       │   │   ├── RoleSwitcher.tsx     # One-click persona switcher (Admin/Teacher/Student/Parent)
│       │   │   └── ProfileMenu.tsx      # User menu, status badge, and sign-out
│       │   │
│       │   ├── shared/                  # Reusable composite components
│       │   │   ├── PageHeader.tsx       # Standardized page headers with actions
│       │   │   ├── StatCard.tsx         # Metric card with icons & percentage trend badges
│       │   │   ├── RoleGuard.tsx        # Client-side role-based route guard
│       │   │   └── ModulePlaceholder.tsx# High-grade placeholder shell for Phase 2 modules
│       │   │
│       │   └── ui/                      # Reusable shadcn/ui-style atomic components
│       │       ├── Badge.tsx            # Status badges (success, warning, info, etc.)
│       │       ├── Button.tsx           # Button with variants, sizes & loading spinner
│       │       ├── Card.tsx             # Card, CardHeader, CardTitle, CardContent, CardFooter
│       │       ├── Dialog.tsx           # Accessible modal dialog with backdrop & escape key
│       │       ├── EmptyState.tsx       # Empty placeholder with icon, description, and action
│       │       ├── Input.tsx            # Form input with icon & error state support
│       │       ├── Label.tsx            # Form label with required indicator
│       │       ├── Select.tsx           # Custom select dropdown
│       │       ├── Skeleton.tsx         # Pulse loading skeleton placeholder
│       │       ├── Table.tsx            # Table, TableHeader, TableBody, TableRow, TableCell
│       │       └── Tabs.tsx             # Accessible tab views (TabsList, TabsTrigger, TabsContent)
│       │
│       ├── config/
│       │   └── navigation.ts            # Role-specific navigation manifests
│       ├── context/
│       │   └── AuthContext.tsx          # Authentication & active role state manager
│       ├── data/
│       │   └── previewData.ts           # Isolated UI mock dataset with clear Phase 1 labels
│       ├── hooks/
│       │   └── useAuth.ts               # Hook to access user, tokens, and active role
│       ├── lib/
│       │   ├── api.ts                   # Axios service client with JWT & schoolId interceptors
│       │   ├── chart.ts                 # Chart.js element registration
│       │   └── utils.ts                 # Class merger (cn) and currency/number formatters
│       ├── pages/
│       │   ├── auth/
│       │   │   └── Login.tsx            # Login screen with one-click role persona preview
│       │   ├── dashboards/
│       │   │   ├── AdminDashboard.tsx   # Admin overview: metrics, Chart.js charts, live feed
│       │   │   ├── TeacherDashboard.tsx # Teacher portal: classes today, grading queue, roster
│       │   │   ├── StudentDashboard.tsx # Student hub: timetable, assignments, report card
│       │   │   └── ParentDashboard.tsx  # Guardian view: ward overview, fee dues, remarks
│       │   ├── placeholders/            # 15 Phase 1 Module Pages with API & schema specs
│       │   │   ├── StudentsPage.tsx
│       │   │   ├── TeachersPage.tsx
│       │   │   ├── ParentsPage.tsx
│       │   │   ├── ClassesPage.tsx
│       │   │   ├── SubjectsPage.tsx
│       │   │   ├── AttendancePage.tsx
│       │   │   ├── FeesPage.tsx
│       │   │   ├── HomeworkPage.tsx
│       │   │   ├── TimetablePage.tsx
│       │   │   ├── ExamsPage.tsx
│       │   │   ├── StudyMaterialsPage.tsx
│       │   │   ├── AiAssistantPage.tsx
│       │   │   ├── MessagesPage.tsx
│       │   │   ├── ReportsPage.tsx
│       │   │   └── SettingsPage.tsx
│       │   └── NotFound.tsx             # 404 handler with return home navigation
│       ├── routes/
│       │   └── AppRoutes.tsx            # Central router grouping routes by role
│       └── types/
│           ├── api.ts                   # Standard API response & error envelopes
│           ├── auth.ts                  # User, UserRole, and AuthState interfaces
│           └── navigation.ts            # Navigation items & sections interfaces
│
└── server/                              # Backend Node.js + Express + TypeScript API engine
    ├── package.json                     # Server dependencies & scripts
    ├── tsconfig.json                    # NodeNext ES-module TypeScript configuration
    ├── .env.example                     # Comprehensive server environment template
    └── src/
        ├── app.ts                       # Express setup: CORS, Helmet, JSON parsing, error handling
        ├── server.ts                    # HTTP server entrypoint, Socket.IO, DB listener
        │
        ├── config/
        │   ├── env.ts                   # Typed environment validator and loader
        │   ├── db.ts                    # Mongoose database connector with graceful shutdown
        │   ├── socket.ts                # Socket.IO real-time engine with tenant room scoping
        │   ├── mailer.ts                # Nodemailer SMTP transporter architecture
        │   └── cloudinary.ts            # Cloudinary v2 media asset architecture
        │
        ├── controllers/
        │   ├── auth.controller.ts       # Phase 1 architectural JWT login, /me, and logout stubs
        │   └── health.controller.ts     # Health-check endpoint reporting uptime, db, and memory
        │
        ├── middlewares/
        │   ├── auth.middleware.ts       # JWT Bearer token verification
        │   ├── rbac.middleware.ts       # Server-enforced Role-Based Access Control
        │   ├── tenant.middleware.ts     # Multi-tenant x-school-id partition enforcement
        │   └── error.middleware.ts      # Centralized 404 & error handler (ApiError envelope)
        │
        ├── models/
        │   ├── School.model.ts          # Tenant School schema (code, name, address, settings)
        │   ├── User.model.ts            # User schema with schoolId, bcrypt password hook & RBAC
        │   └── plugins/
        │       └── tenantIsolation.plugin.ts # Mongoose plugin auto-scoping queries to schoolId
        │
        ├── routes/
        │   └── v1/
        │       ├── index.ts             # API v1 route aggregator
        │       ├── auth.routes.ts       # /api/v1/auth routes
        │       └── health.routes.ts     # /api/v1/health route
        │
        ├── types/
        │   └── express.d.ts             # Express Request extension (req.user, req.schoolId)
        │
        └── utils/
            ├── apiError.ts              # Custom operational ApiError class
            ├── apiResponse.ts           # Standardized success response envelope
            ├── jwt.ts                   # Access & refresh token signing/verification
            └── logger.ts                # Structured log output formatter
```

---

## 🚀 Installation & Running the Application

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher (Tested on Node `v22.16.0`)
- **npm:** v9.0.0 or higher (Tested on npm `11.6.2`)
- *(Optional for Phase 1)* **MongoDB:** Running locally or via MongoDB Atlas URI

### 2. Install Dependencies
You can install dependencies for both `client` and `server` from the root directory:

```bash
# Option A: Root workspace command
npm run install:all

# Option B: Or install individually in each folder
cd client && npm install
cd ../server && npm install
```

### 3. Run the Development Servers
Open two terminal windows (or use the root scripts):

#### Terminal 1 — Start the Backend Server:
```bash
# From the root directory:
npm run dev:server

# Or inside the server folder:
cd server
npm run dev
```
*The server will start at `http://localhost:5000`.*  
*Health Check endpoint: `http://localhost:5000/api/v1/health`*

#### Terminal 2 — Start the Frontend Client:
```bash
# From the root directory:
npm run dev:client

# Or inside the client folder:
cd client
npm run dev
```
*The client will start at `http://localhost:5173`.*

---

## 🛠️ Configuration & Environment Variables

### Client (`client/.env.example`)
Copy `.env.example` to `.env` inside the `client` directory:
```bash
cp client/.env.example client/.env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:5000/api/v1` | URL for backend API v1 endpoints |
| `VITE_APP_NAME` | `"EduManage SMS"` | Brand name displayed in client |
| `VITE_ENABLE_MOCK_AUTH` | `true` | Allows instant persona switching for testing |
| `VITE_SOCKET_URL` | `http://localhost:5000` | Real-time WebSocket server endpoint |

### Server (`server/.env.example`)
Copy `.env.example` to `.env` inside the `server` directory:
```bash
cp server/.env.example server/.env
```

| Variable | Default / Placeholder | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP port Express listens on |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `API_PREFIX` | `/api/v1` | Base route prefix for all endpoints |
| `CLIENT_URL` | `http://localhost:5173` | Allowed origin for CORS |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated CORS allowed origins |
| `MONGODB_URI` | `mongodb://localhost:27017/edumanage_db` | MongoDB connection URI |
| `JWT_SECRET` | `[min 32 char string]` | Signing key for short-lived access tokens |
| `JWT_EXPIRES_IN` | `7d` | Access token lifespan |
| `JWT_REFRESH_SECRET` | `[min 32 char string]` | Signing key for refresh tokens |
| `JWT_REFRESH_EXPIRES_IN`| `30d` | Refresh token lifespan |
| `DEFAULT_DEMO_SCHOOL_ID`| `school_demo_greenwood_001` | Fallback tenant identifier in dev mode |
| `SMTP_HOST` | `smtp.mailtrap.io` | SMTP server for transactional emails |
| `SMTP_PORT` | `2525` | SMTP port |
| `SMTP_USER` | *(empty string)* | SMTP username (e.g., Mailtrap or Sendgrid) |
| `SMTP_PASS` | *(empty string)* | SMTP password |
| `CLOUDINARY_CLOUD_NAME`| *(empty string)* | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | *(empty string)* | Cloudinary API key |
| `CLOUDINARY_API_SECRET`| *(empty string)* | Cloudinary API secret |

---

## ☁️ Third-Party Services Setup (When moving to Phase 2)

For full Phase 2 functionality, you will want accounts with the following services:

1. **MongoDB Atlas (or local MongoDB):**
   - Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
   - Add your IP address to Network Access.
   - Paste the connection string into `server/.env` under `MONGODB_URI`.
2. **Mailtrap / Ethereal (Email Testing):**
   - Create a free development inbox at [mailtrap.io](https://mailtrap.io).
   - Copy the SMTP credentials into `server/.env`.
3. **Cloudinary (File Storage):**
   - Create a free media storage account at [cloudinary.com](https://cloudinary.com).
   - Copy your Cloud Name, API Key, and API Secret into `server/.env`.

---

## 🔒 Multi-School Data Isolation Architecture

To ensure strict tenant boundary enforcement:
1. **Request Ingestion:** The client API service automatically injects `x-school-id: <schoolId>` on all outgoing Axios requests.
2. **Tenant Middleware:** `tenant.middleware.ts` extracts and verifies the tenant context, attaching `req.schoolId` to the Express Request.
3. **Mongoose Plugin:** `tenantIsolation.plugin.ts` automatically attaches `{ schoolId: req.schoolId }` to every query (`find`, `findOne`, `countDocuments`, `findOneAndUpdate`, `deleteMany`), preventing accidental cross-tenant data leaks.
4. **Compound Indexing:** All multi-tenant models (`User`, `Student`, `Class`, etc.) enforce compound indexes such as `{ schoolId: 1, email: 1 }` or `{ schoolId: 1, admissionNumber: 1 }`.

---

## 🛡️ Role-Based Access Control (RBAC) Architecture

| User Role | Accessible Route Group | Permitted Actions |
| :--- | :--- | :--- |
| **Admin** | `/admin/*` | Full institutional oversight, admissions, fee configuration, staff allocation, settings |
| **Teacher** | `/teacher/*` | Class rosters, taking attendance, homework assignment, grading scorecards, materials |
| **Student** | `/student/*` | Timetable viewing, personal attendance, homework submission, exam results, fees |
| **Parent** | `/parent/*` | Ward attendance tracking, exam grades, homework monitoring, fee settlements, PTA |

---

## ⚠️ Known Limitations (Phase 1 Bounded Scope)

- **Authentication Stubs:** The `/api/v1/auth/login` endpoint issues real cryptographic JWT tokens containing role and tenant claims, but does not query persistent users from the database. Password verification against stored bcrypt hashes is reserved for Phase 2.
- **Isolated Preview Data:** Dashboards display realistic UI metrics sourced from `client/src/data/previewData.ts`. They do not fetch records from database collections.
- **Placeholder Pages:** The 15 module pages (Students, Teachers, Classes, Fees, etc.) display fully structured UI shells, filter controls, mock tables, and Phase 2 schema specifications, but do not perform write operations to the database.
- **Offline Server Resilience:** If MongoDB is not running locally, the server gracefully continues in detached preview mode, allowing you to review the health-check and client without crashing.

---

## 🧪 Build & Lint Verification Results

Both the client and server projects build with 0 TypeScript or bundling errors:

- **Client Build (`npm run build --prefix client`):**
  ```text
  > tsc -b && vite build
  vite v6.4.4 building for production...
  ✓ 1691 modules transformed.
  dist/index.html                   0.87 kB │ gzip:   0.49 kB
  dist/assets/index-JMlTPX0u.css   36.41 kB │ gzip:   7.04 kB
  dist/assets/index-DlRjLTrm.js   552.37 kB │ gzip: 176.32 kB
  ✓ built in 13.82s
  ```

- **Server Build (`npm run build --prefix server`):**
  ```text
  > tsc
  Exit code: 0 (Compiled with 0 TypeScript errors)
  ```

- **Root Monorepo Build (`npm run build`):**
  ```text
  > npm run build:client && npm run build:server
  Exit code: 0 (Both packages built successfully)
  ```
#   S M S  
 