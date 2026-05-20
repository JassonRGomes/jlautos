# 🏎️ J&L Autos — Luxury Car Digital Showroom & CRM Platform

Welcome to **J&L Autos**, a high-end corporate digital showroom and customer relationship management (CRM) platform tailored specifically for exotic, luxury, and hyper-performance vehicles.

This project delivers a premium, immersive user experience with slick dark-mode styling, glassmorphism, dynamic micro-animations, and a highly secure architectural core. 

---

## 🌌 Platform Architecture & Tech Stack

The J&L Autos platform is separated into a dual-module system to achieve clean separation of concerns, fast load times, and high scalability:

1. **Frontend Showroom (`/frontend`)**
   - **Framework:** Next.js 16 (App Router) & React 19.
   - **Styling:** Tailwind CSS v4 & Native Vanilla CSS variables for max performance.
   - **Design Aesthetics:** Deep obsidian theme (`#080810`), premium frosted-glass card layouts (glassmorphism), ultra-smooth transitions, and dynamic entry/exit animations leveraging native CSS `@starting-style`.
   - **Gatekeeping Compliance:** Built-in compliance engine that strictly hides all financing tables, warranty tiers, downpayments, and interest rates for any listing unless its `isFinanceWarrantyActive` attribute is explicitly toggled `true` by an administrator.
   - **Accents:** Electric Blue (`#00E5FF`) reserved strictly for high-priority Primary CTAs to maintain elegant high-contrast premium balance.

2. **Backend API (`/backend`)**
   - **Runtime:** Express.js with TypeScript (`ts-node-dev`).
   - **Database:** Prisma ORM connecting to a local SQLite database (highly portable, migrations fully pre-applied).
   - **Authentication:** Strict JSON Web Tokens (JWT) stored in HTTP-Only secure cookies for browsers, with fallback authorization header parsing (Bearer token) for integration scripts.
   - **Mail Dispatcher:** Dual-email dispatch engine using Nodemailer. Automatically sends tailored aesthetic HTML confirmations to both the client (booking voucher/receipt) and the agency (sales lead alert) upon booking or price submissions.
   - **Report Engines:** Embedded document generators producing stunning vector-designed PDFs (`pdfkit`) and comprehensive spreadsheets (`exceljs`) for administrative data exports.

---

## ⚡ Quick Start & Run Commands

### Prerequisites
Ensure you have **Node.js v20+** installed on your system.

### 1. Initialize and Run the Backend API
```bash
cd backend

# Install dependencies
npm install

# Apply database schema and seed initial luxury assets
npx prisma db push
npm run seed

# Run the development API server (runs on http://localhost:5001)
npm run dev
```

### 2. Initialize and Run the Next.js Frontend
Open a new terminal window or tab and execute:
```bash
cd frontend

# Install dependencies
npm install

# Run the development frontend server (runs on http://localhost:3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser to enter the showroom.

---

## 🔑 Pre-Seeded Access Credentials

The platform's database comes pre-seeded with two dedicated profiles for immediate testing of both user flows:

### 💼 1. Corporate Administrator
* **Role:** Manage showroom fleet, toggle financing features, accept/reject vehicle purchase offers, view booked private showings, and generate administrative reports.
* **Email:** `admin@jlautos.com`
* **Password:** `admin`

### 🌟 2. VIP Private Buyer (Customer)
* **Role:** Browse luxury showroom, toggle favorited cars, submit competitive price offers, and reserve private viewings on specific vehicle models.
* **Email:** `vip.buyer@gmail.com`
* **Password:** `CustomerPass2026!`

---

## 🧪 Automated Integration Verification

To verify that all API components, CRM pipelines, double-booking validation rules, price offer flows, and reporting engines are fully synchronized and working flawlessly, you can run our automated integration suite from the root of the project:

Run the comprehensive multi-step flow test to verify all integration points end-to-end.

```bash
node scripts/integration_test.js
```

**What the script automates:**
1. **Authentication:** Logs in as Customer (`Alexander Stone`) and retrieves authorization tokens.
2. **Browsing:** Fetches showroom inventory and targets specific models (e.g. Porsche 911 GT3 RS).
3. **Booking:** Automates scheduling a VIP test drive.
4. **Acquisition:** Emits an automated price proposal offer against the vehicle reserve.
5. **Administrative Action:** Logins as Admin (`administrador`), pulls pending offers ledger, and approves acquisition requests.
6. **Report Generators:** Tests backend document compilers to output valid, structured PDF inventories, CRM spreadsheet leads, and PDF sales charts.

---

## 📂 Project Structure

```
J L AUTOS/
├── backend/                  # REST API Express + TypeScript
│   ├── prisma/               # Prisma Database Schemas and local SQLite database
│   ├── src/
│   │   ├── config/           # Database and server environments
│   │   ├── controllers/      # Route request controller handlers
│   │   ├── middleware/       # JWT Auth and access checkers
│   │   ├── routes/           # REST endpoints definition
│   │   ├── services/         # Nodemailer mail servers
│   │   └── utils/            # PDF and Excel report compilation logic
│   └── tsconfig.json
│
├── frontend/                 # Next.js 16 App Router
│   ├── src/
│   │   ├── app/              # Views (Showroom, User Dashboard, CRM Console)
│   │   ├── components/       # Premium Navigation, Footer, Modals
│   │   └── context/          # Theme and Session Authentication states
│   └── tailwind.config.ts
│
├── scripts/                  # Global helper & test scripts
│   └── integration_test.js   # Dynamic end-to-end local platform test suite
│
└── docker-compose.yml        # Preconfigured environment for scaling to PostgreSQL
```

---

## 🛡️ Critical Features & Compliance Policies

### 🔒 Financing Compliance Gate (`vehicle.isFinanceWarrantyActive`)
For compliance and luxury exclusivity, the frontend operates on a strict metadata gate. If a vehicle has `isFinanceWarrantyActive: false`:
- The payment breakdown table is **completely suppressed** from the vehicle details layout.
- The interactive interest rate and downpayment calculator is **hidden**.
- No warranty tiers are visible.
- *Only when* the administrator toggles this flag to `true` (e.g., via the Admin settings panel) will these specific financing options become visible and interactive.

### 🛡️ Double-Booking Prevention
The scheduler uses database validations to verify slot availability. If a customer tries to book a date and time slot for a vehicle that already has an approved or active booking, the backend blocks the booking attempt and returns a clean error response (`409 Conflict`), maintaining showroom order.

---

*Engineered with excellence. J&L Autos 2026.*
