# Kasina Hotel - Hotel Management System (Frontend)

A modern, full-featured web-based Hotel Management System (HMS) built for **Kasina Hotel**. This application manages end-to-end hotel operations including Front Desk & Reservations, Multi-outlet Point of Sale (POS), Kitchen Display Systems (KDS), Bar Management, Inventory & Purchasing, Finance & Accounting, HR & Attendance, and Executive Dashboards with fine-grained Role-Based Access Control (RBAC).

---

## 🚀 Tech Stack

- **Framework & Core**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Routing**: [React Router DOM v7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/vite`
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Server State & Caching**: [TanStack React Query v5](https://tanstack.com/query)
- **HTTP Client**: [Axios](https://axios-http.com/) & Custom Fetch API wrapper with JWT authentication
- **Real-Time Communication**: [Socket.io Client](https://socket.io/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Linter**: [Oxlint](https://oxc.rs/)

---

## 🌟 Modules & Features

### 🏨 1. Front Desk & Reservations
- **Room Management**: Real-time room status grid (Occupied, Available, Cleaning, Maintenance).
- **Guest Reservations**: Create and update bookings, manage check-in and check-out workflows.
- **Reservation History**: Detailed lookup of past and upcoming guest stays.

### 🍽️ 2. Point of Sale (POS) & Dining
- **Order Handling**: Dynamic order creation for dining rooms, terrace, and takeaway.
- **Table Selector**: Visual floor table layout with live status indicators.
- **Waiter Assignment**: Track orders taken and served by specific wait staff.
- **Payment & Split Bills**: Full cash/card/digital payments, split bill settlements, and payment proof attachment.

### 👨‍🍳 3. Kitchen Display System (KDS)
- **Live Ticket Board**: Real-time incoming food orders grouped by preparation stage.
- **Sound Alerts**: Audio chime notifications for incoming orders.
- **Stock Audit & Live Assets**: Kitchen stock reconciliation, ingredients usage, and F&B audit reports.

### 🍸 4. Bar Operations
- **Beverage Ordering**: Dedicated quick-service bar ordering interface.
- **Bar Inventory & Audits**: Real-time tracking of bottles, drinks, and daily bar reports.

### 📦 5. Inventory & Storekeeper
- **Stock Tracking**: Raw materials, drinks, ingredients, and consumables.
- **Stock Requisitions & Transfers**: Storekeeper approval workflows for transfers between central store, kitchen, and bar.
- **Low Stock Alerts & Valuation**: Automated threshold warnings and inventory valuation.

### 🛒 6. Purchasing
- **Purchase Orders (POs)**: Create, review, and track orders from suppliers.
- **Receiving & Invoices**: Verify delivered goods against purchase orders.

### 💰 7. Finance, Expenses & Reconciliation
- **Sales & Revenue Tracking**: Daily, weekly, and monthly revenue metrics.
- **Cashier Reconciliation**: Shift closures, cash balancing, and payment method breakdowns.
- **Expense Management**: Categorized expenditure recording and approval workflows.
- **Financial Statements**: Master financial statements and summary reporting.

### 👥 8. Human Resources (HR) & Staff Management
- **Employee Directory**: Manage staff records, contact info, job titles, and roles.
- **Attendance Tracking**: Shift logging, clock-in / clock-out records, and monthly attendance reports.

### 👑 9. Customer Relationship Management (CRM)
- **Guest Profiles**: Directory of regular and VIP guests with stay history and preferences.

### 📊 10. Master Reporting & Analytics
- Multi-dimensional reporting across sales, inventory consumption, bar, kitchen audits, staff attendance, and finance.

---

## 🔐 Role-Based Access Control (RBAC)

The system enforces permissions per user role across routes and actions:

| Role | Primary Access |
| :--- | :--- |
| `ADMIN` | Unrestricted full-system access (`*`) |
| `MANAGER` | Front desk, POS, kitchen, bar, inventory, purchasing, finance, reports |
| `RECEPTIONIST` | Front desk, rooms, reservations, guest payments, attendance |
| `WAITER` | POS ordering, table views, served order tracking |
| `CASHIER` | POS, bill payments, split payments, shift reconciliation |
| `CHEF` | Kitchen display system, kitchen stock audit, food orders |
| `BARTENDER` | Bar orders, beverage preparation, bar stock audits |
| `STOREKEEPER` | Inventory stock, transfer requests, stock counts |
| `PURCHASING` | Purchase orders, suppliers, goods received |
| `ACCOUNTANT` / `FINANCE` | Finance reports, sales verification, expense tracking, reconciliations |
| `HR` | Employee records, attendance, staff logs |
| `FB_CONTROLLER` | Food & beverage audit reports, kitchen/bar stock controls |

---

## 📂 Project Structure

```text
Kasina-frontend/
├── public/                 # Static assets, logos, and PWA manifest
├── src/
│   ├── assets/             # Images, sound effects (audio chimes), styles
│   ├── components/         # Shared UI components (Modals, Tables, Cards, Inputs)
│   ├── config/             # Role definitions & permission matrices
│   ├── context/            # React context providers (e.g., AuthContext)
│   ├── layouts/            # Layout shells (Dashboard, POS, Kitchen, Bar, Finance)
│   ├── modules/            # Feature-based domain modules
│   │   ├── auth/           # Login & credential management
│   │   ├── bar/            # Bar order board & audits
│   │   ├── customers/      # VIP and customer profiles
│   │   ├── dashboard/      # Admin & Manager KPI dashboards
│   │   ├── employees/      # HR & attendance tracking
│   │   ├── expense/        # Expense tracking & categories
│   │   ├── finance/        # Finance reports & cashier settlement
│   │   ├── frontdesk/      # Rooms, bookings, and check-in/out
│   │   ├── inventory/      # Storekeeper stock management
│   │   ├── kitchen/        # Kitchen display & audit
│   │   ├── pos/            # Point of Sale & billing
│   │   ├── products/       # Menu item & product management
│   │   ├── purchasing/     # Supplier orders & purchases
│   │   ├── reports/        # Executive & master reports
│   │   └── reservation/    # Room reservation calendar
│   ├── routes/             # App routing, ProtectedRoute, PermissionRoute
│   ├── services/           # API wrapper, socket client, audio notifications
│   ├── store/              # Zustand global state stores
│   ├── utils/              # Formatting helpers, date tools, currency helpers
│   ├── App.jsx             # Main application component
│   ├── index.css           # Tailwind CSS imports & global rules
│   └── main.jsx            # React root mount entry point
├── .cpanel.yml             # cPanel automatic deployment configuration
├── .htaccess               # Apache SPA URL rewriting rules
├── index.html              # HTML template with PWA meta tags
├── package.json            # Dependencies and npm scripts
├── vite.config.js          # Vite build and plugin configuration
└── README.md               # Project documentation
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher (Node `20+` recommended)
- **npm**: `v9.0.0` or higher (or `pnpm` / `yarn`)
- **Backend API**: The [Kasina Backend API](https://github.com/Birukdessalegn/Kasina-backend) running locally or remotely.

### 1. Clone the repository

```bash
git clone https://github.com/Birukdessalegn/Kasina-frontend.git
cd Kasina-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
# Local Development API:
VITE_API_URL=http://localhost:5000/api

# Production API (Remote):
# VITE_API_URL=https://kasinahotelapi.ambbatech.com/api
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

---

## 📜 Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Runs the Vite development server with Hot Module Replacement (HMR). |
| `build` | `npm run build` | Compiles and bundles production-ready assets into the `dist/` folder. |
| `preview` | `npm run preview` | Locally serves the production build from `dist/` for testing. |
| `lint` | `npm run lint` | Runs [Oxlint](https://oxc.rs/) for high-speed JavaScript/React linting. |

---

## 🚢 Deployment

### Production Build
To create a production bundle:
```bash
npm run build
```
This will generate optimized static assets in the `dist/` directory.

### cPanel Git Deployment
The project includes a `.cpanel.yml` file configured for automated deployment:
```yaml
---
deployment:
  tasks:
    - export DEPLOYPATH=/home/ambbatxv/kasinahotel.ambbatech.com/
    - /bin/cp -R dist/. $DEPLOYPATH
```

### Apache Single-Page Application (SPA) Routing
An `.htaccess` file is provided to route all HTTP requests to `index.html` so that React Router can handle client-side routing properly:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 🔒 Security & Best Practices

- **Token Storage**: JWT authentication token stored in `localStorage` with automatic Authorization header injection via `src/services/api.js`.
- **Protected Navigation**: Protected route guards and role permission checks verify user access prior to rendering views.
- **Input Sanitization & Form Handling**: Clean state management via controlled inputs and dedicated modal forms.

---

## 📄 License

This project is proprietary and confidential software developed for **Kasina Hotel**. All rights reserved.
