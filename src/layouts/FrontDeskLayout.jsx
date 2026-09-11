import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BedDouble,
  CalendarCheck,
  DoorClosed,
  History,
  BarChart3,
  Clock,
  LogOut,
  User,
  ChevronDown,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import AppHeader from "./AppHeader";

const menuItems = [
  {
    name: "Room Front Desk",
    path: "/frontdesk",
    icon: BedDouble,
    end: true,
  },
  {
    name: "Reservations",
    path: "/frontdesk/reservations",
    icon: CalendarCheck,
  },
  {
    name: "Reservation History",
    path: "/frontdesk/history",
    icon: History,
  },
  {
    name: "Rooms & Categories",
    path: "/frontdesk/rooms",
    icon: DoorClosed,
  },
  {
    name: "Front Desk Reports",
    path: "/frontdesk/reports",
    icon: BarChart3,
  },
  {
    name: "My Attendance",
    path: "/employees/attendance",
    icon: Clock,
  },
];

function FrontDeskLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/frontdesk/reservations":
        return { title: "Room Reservations", desc: "Manage bookings, check-ins, and guest stays" };
      case "/frontdesk/history":
        return { title: "Reservation History", desc: "View past stays, checked-out guests, and stay records" };
      case "/frontdesk/rooms":
        return { title: "Room Management", desc: "Manage room inventory, pricing, and housekeeping" };
      case "/frontdesk/reports":
        return { title: "Front Desk Reports", desc: "Room occupancy, daily revenue, and hotel analytics" };
      case "/employees/attendance":
        return { title: "Staff Attendance", desc: "Clock in / out and view daily attendance" };
      default:
        return { title: "Front Desk & Room POS", desc: "Live room status, quick walk-ins, and check-out" };
    }
  };

  const { title, desc } = getPageTitle();

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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white shadow-xl transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <img
              src="/kasina-hotel-logo.png"
              alt="Kasina Hotel"
              className="h-9 w-9 object-contain rounded-lg bg-white/10 p-1"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextSibling.style.display = "flex";
              }}
            />
            <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 font-bold text-slate-950">
              KH
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wider text-white">KASINA HOTEL</h1>
              <p className="text-[11px] font-medium text-amber-400">Front Desk / Reception</p>
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
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Front Office
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20"
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

        {/* User Card */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-amber-400 font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || "R"}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-semibold text-white">{user?.name || "Receptionist"}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role || "Front Desk"}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ml-0 lg:ml-64">
        <AppHeader
          title={title}
          description={desc}
          onMenuClick={() => setIsMobileOpen(true)}
        />
        <main className="min-w-0 max-w-full flex-1 px-3 py-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default FrontDeskLayout;
