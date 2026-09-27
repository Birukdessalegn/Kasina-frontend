import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Coffee,
  ClipboardList,
  Flame,
  CheckCircle2,
  LogOut,
  X,
  User,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import UserProfileModal from "../components/UserProfileModal";

const menuItems = [
  {
    name: "Coffee Station",
    path: "/barista",
    icon: Coffee,
  },
  {
    name: "New Tickets",
    path: "/barista/new",
    icon: ClipboardList,
  },
  {
    name: "Brewing Now",
    path: "/barista/preparing",
    icon: Flame,
  },
  {
    name: "Ready for Pickup",
    path: "/barista/ready",
    icon: CheckCircle2,
  },
];

function BaristaLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const normalizedRole = (user?.role || "BARISTA").replace(/_/g, " ").toUpperCase();

  const getPageTitle = () => {
    const p = location.pathname.toLowerCase();
    if (p.endsWith("/new")) return "New Coffee Tickets";
    if (p.endsWith("/preparing")) return "Brewing In Progress";
    if (p.endsWith("/ready")) return "Ready for Pickup";
    return "Coffee Station & Barista Display";
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 shadow-md shadow-amber-600/30">
              <Coffee className="h-5 w-5 text-white" />
            </div>

            <div>
              <h1 className="text-sm font-black tracking-wide">KASINA CAFE</h1>
              <p className="text-xs text-amber-400 font-medium">Barista Station</p>
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
            Station Operations
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/barista"}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
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

        {/* User Sidebar Footer */}
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800/80 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 font-bold text-white">
              {user?.name?.charAt(0) || "B"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name || "Barista"}</p>
              <p className="text-xs text-amber-400 uppercase font-bold">{normalizedRole}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ml-0 lg:ml-64">
        {/* ================= TOP HEADER ================= */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 sm:px-6 backdrop-blur-md">
          {/* Left Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden shrink-0"
              aria-label="Open sidebar"
            >
              <Coffee className="h-5 w-5 text-amber-600" />
            </button>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {getPageTitle()}
              </h2>
              <p className="hidden xs:block text-[11px] text-slate-500 font-medium">
                Live espresso & beverage preparation display
              </p>
            </div>
          </div>

          {/* Right User Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 rounded-xl p-1.5 text-left transition hover:bg-slate-100 cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-700 to-amber-600 text-sm font-bold text-white shadow-xs">
                {user?.name?.charAt(0) || "B"}
              </div>
              <div className="hidden flex-col md:flex">
                <span className="text-xs font-bold text-slate-900">{user?.name || "Barista"}</span>
                <span className="text-[10px] font-semibold text-amber-700 uppercase">
                  {normalizedRole}
                </span>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
            </button>

            {/* Profile Dropdown (RBMS Style) */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-bold text-slate-900">{user?.name || "Barista"}</p>
                  <p className="truncate text-[11px] text-slate-500">{user?.email || "No email"}</p>
                  <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase">
                    {normalizedRole}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowProfileModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    My Profile
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ================= PAGE CONTENT ================= */}
        <main className="min-w-0 max-w-full flex-1 px-3 py-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onLogout={logout}
      />
    </div>
  );
}

export default BaristaLayout;
