import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Wine,
  ClipboardList,
  Flame,
  CheckCircle2,
  BarChart3,
  LogOut,
  ChevronDown,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

import AppHeader from "../layouts/AppHeader";


const menuItems = [
  {
    name: "Bar Dashboard",
    path: "/bar",
    icon: Wine,
  },
  {
    name: "New Orders",
    path: "/bar/new",
    icon: ClipboardList,
  },
  {
    name: "Preparing",
    path: "/bar/preparing",
    icon: Flame,
  },
  {
    name: "Ready Orders",
    path: "/bar/ready",
    icon: CheckCircle2,
  },
  {
    name: "Reports",
    path: "/bar/reports",
    icon: BarChart3,
  },
];

function BarLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isReportsPage = location.pathname === "/bar/reports";

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600">
              <Wine className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-sm font-black tracking-wide">
                KASINA HOTEL
              </h1>

              <p className="text-xs text-slate-400">
                Bar Management
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

        <nav className="flex-1 space-y-1 p-4">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Bar Operations
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/bar"}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />

                <span>{item.name}</span>
              </NavLink>
            );
          })}

        </nav>


        {/* ================= USER ================= */}

        <div className="border-t border-slate-800 p-4">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800 p-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 font-bold">
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
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />

            Logout
          </button>

        </div>

      </aside>


      {/* ================= MAIN AREA ================= */}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ml-0 lg:ml-64">

        {/* ================= HEADER ================= */}

        <AppHeader
          title="Bar Operations"
          description="Manage bar operations and drink orders"
          onMenuClick={() => setIsMobileOpen(true)}
        />

        {/* ================= PAGE CONTENT ================= */}

        <main className="min-w-0 max-w-full flex-1 px-3 py-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default BarLayout;