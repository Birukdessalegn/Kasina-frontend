import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BedDouble,
  CalendarCheck,
  DoorClosed,
  Users,
  Clock,
  LogOut,
  User,
  ChevronDown
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";
import AppHeader from "./AppHeader";

const menuItems = [
  {
    name: "Room Front Desk",
    path: "/reception/frontdesk",
    icon: BedDouble,
    end: true,
  },
  {
    name: "Reservations",
    path: "/reception/reservations",
    icon: CalendarCheck,
  },
  {
    name: "Rooms & Categories",
    path: "/reception/rooms",
    icon: DoorClosed,
  },
  {
    name: "Guests",
    path: "/reception/guests",
    icon: Users,
  },
  {
    name: "My Attendance",
    path: "/reception/attendance",
    icon: Clock,
  },
];

function FrontDeskLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/reception/reservations":
        return { title: "Room Reservations", desc: "Manage bookings, check-ins, and guest stays" };
      case "/reception/rooms":
        return { title: "Room Management", desc: "Manage room inventory, pricing, and housekeeping" };
      case "/reception/guests":
        return { title: "Guest Directory", desc: "View and manage guest profiles and contact history" };
      case "/reception/attendance":
        return { title: "Staff Attendance", desc: "Clock in / out and view daily attendance" };
      default:
        return { title: "Front Desk & Room POS", desc: "Live room status, quick walk-ins, and check-out" };
    }
  };

  const { title, desc } = getPageTitle();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ================= SIDEBAR ================= */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white shadow-xl">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <img
            src="/kasina-hotel-logo.png"
            alt="Kasina Hotel"
            className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
            }}
          />
          <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-bold text-slate-950">
            KH
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wider text-white">KASINA HOTEL</h1>
            <p className="text-[11px] font-medium text-amber-400">Front Desk / Reception</p>
          </div>
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
      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader title={title} description={desc} />
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default FrontDeskLayout;
