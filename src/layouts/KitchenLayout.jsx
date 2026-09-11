import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ChefHat,
  BarChart3,
  X,
} from "lucide-react";

import AppHeader from "../layouts/AppHeader";

const menuItems = [
  {
    name: "Kitchen Dashboard",
    path: "/kitchen",
    icon: ChefHat,
  },
  {
    name: "Reports",
    path: "/kitchen/reports",
    icon: BarChart3,
  },
];

function KitchenLayout() {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isReportsPage = location.pathname === "/kitchen/reports";

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
              <ChefHat className="h-5 w-5" />
            </div>

            <div>
              <h1 className="font-black tracking-wide text-sm">
                KASINA HOTEL
              </h1>

              <p className="text-xs text-slate-400">
                Kitchen
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


        {/* ================= NAVIGATION ================= */}

        <nav className="flex-1 space-y-1 p-4">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Kitchen
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/kitchen"}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
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

      </aside>


      {/* ================= MAIN AREA ================= */}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ml-0 lg:ml-64">

        {/* Reusable Header */}

        <AppHeader
          title={
            isReportsPage
              ? "Kitchen Reports"
              : "Kitchen Dashboard"
          }
          description={
            isReportsPage
              ? "View and analyze kitchen performance"
              : "Monitor kitchen orders and operations"
          }
          onMenuClick={() => setIsMobileOpen(true)}
        />


        {/* Page Content */}

        <main className="min-w-0 max-w-full flex-1 px-3 py-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default KitchenLayout;