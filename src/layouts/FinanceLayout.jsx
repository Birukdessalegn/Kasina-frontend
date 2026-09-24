import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Receipt,
  ShoppingCart,
  CreditCard,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  ChevronDown,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AppHeader from "../layouts/AppHeader";

const menuItems = [
  {
    name: "Finance Overview",
    path: "/finance",
    icon: Wallet,
  },
  {
    name: "Sales Ledger",
    path: "/finance/sales",
    icon: TrendingUp,
  },
  {
    name: "Cashier Reconciliation",
    path: "/finance/cashier-reconciliation",
    icon: CreditCard,
  },
  {
    name: "Financial Reports",
    path: "/finance/reports",
    icon: BarChart3,
  },
];

function FinanceLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getPageTitle = () => {
    if (location.pathname === "/finance") {
      return "Finance Overview";
    }

    if (location.pathname === "/finance/cashier-reconciliation") {
      return "Cashier Shift Reconciliation";
    }

    if (location.pathname === "/finance/sales") {
      return "Sales & Revenue Ledger";
    }

    if (location.pathname === "/finance/reports") {
      return "Financial Statements & Reports";
    }

    return "Hotel Finance";
  };

  const getPageDescription = () => {
    if (location.pathname === "/finance") {
      return "Executive financial overview, P&L, and hotel revenue breakdown.";
    }

    if (location.pathname === "/finance/cashier-reconciliation") {
      return "Verify cashier daily cash handovers, shift totals, and digital payment receipts.";
    }

    if (location.pathname === "/finance/sales") {
      return "Comprehensive sales ledger across hotel room lodging and restaurant/bar POS.";
    }

    if (location.pathname === "/finance/reports") {
      return "Income statements, revenue streams, and financial audit reports.";
    }

    return "Manage hotel finances and accounting.";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >

        {/* Logo */}

        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-sm font-black tracking-wide">
                KASINA HOTEL
              </h1>

              <p className="text-xs text-slate-400">
                Finance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>

        </div>


        {/* Navigation */}

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Finance & Accounts
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/finance"}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />

                <span>
                  {item.name}
                </span>
              </NavLink>
            );
          })}

        </nav>


        {/* User */}

        <div className="border-t border-slate-800 p-4">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800 p-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 font-bold">
              {user?.name?.charAt(0)}
            </div>

            <div className="min-w-0">

              <p className="truncate text-sm font-semibold">
                {user?.name}
              </p>

              <p className="text-xs text-slate-400">
                {user?.role}
              </p>

            </div>

          </div>


          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />

            Logout
          </button>

        </div>

      </aside>


      {/* ================= MAIN ================= */}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ml-0 lg:ml-64">

        {/* Header */}
        <AppHeader
          title={getPageTitle()}
          description={getPageDescription()}
          onMenuClick={() => setIsMobileOpen(true)}
        />

        {/* Content */}
        <main className="min-w-0 max-w-full flex-1 px-3 py-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default FinanceLayout;