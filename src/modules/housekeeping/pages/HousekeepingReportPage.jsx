import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  BedDouble,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Search,
  User,
  ShieldCheck,
  Calendar,
  Printer,
  ArrowLeft,
  Filter,
  CheckCheck,
  Building,
  DoorClosed,
  Layers,
  Award
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../services/api";

function HousekeepingReportPage() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("crosscheck"); // 'crosscheck' | 'cleaned_tasks'
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");

  const fetchReport = async (date) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/housekeeping/report?date=${date || selectedDate}`);
      if (res.data?.success) {
        setReportData(res.data.data);
      } else {
        setError(res.data?.message || "Failed to load housekeeping report");
      }
    } catch (err) {
      console.error("Error fetching housekeeping report:", err);
      setError(err.response?.data?.message || err.message || "Network error loading report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  const stats = reportData?.stats || {
    totalRooms: 0,
    cleanedOnDate: 0,
    totalCleanedTasks: 0,
    availableReady: 0,
    occupiedNow: 0,
    cleaningNow: 0,
    maintenanceNow: 0,
    reservedNow: 0
  };

  const roomMatrix = reportData?.roomMatrix || [];
  const completedTasks = reportData?.completedTasks || [];
  const cleanerBreakdown = reportData?.cleanerBreakdown || [];

  // Floors list for filtering
  const floors = useMemo(() => {
    const set = new Set();
    roomMatrix.forEach((r) => {
      if (r.floor !== null && r.floor !== undefined) set.add(r.floor);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [roomMatrix]);

  // Filtered rooms in cross-check matrix
  const filteredRooms = useMemo(() => {
    return roomMatrix.filter((r) => {
      // Search
      const matchSearch =
        !searchQuery ||
        r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.room_type_name && r.room_type_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.cleaner_name && r.cleaner_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      // Floor filter
      if (floorFilter !== "all" && String(r.floor) !== String(floorFilter)) {
        return false;
      }

      // Status filter
      if (statusFilter === "cleaned_today") {
        return r.task_status === "completed" || r.task_status === "inspected";
      }
      if (statusFilter === "ready_available") {
        return r.reception_status === "available";
      }
      if (statusFilter === "occupied") {
        return r.reception_status === "occupied";
      }
      if (statusFilter === "cleaning") {
        return r.reception_status === "cleaning";
      }
      if (statusFilter === "maintenance") {
        return r.reception_status === "maintenance";
      }
      if (statusFilter === "discrepancy") {
        const isCleaned = r.task_status === "completed" || r.task_status === "inspected";
        const isAvailable = r.reception_status === "available";
        return (isCleaned && !isAvailable) || (!isCleaned && isAvailable);
      }

      return true;
    });
  }, [roomMatrix, searchQuery, statusFilter, floorFilter]);

  const handlePrint = () => {
    window.print();
  };

  const setDateOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:border-b-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/housekeeping"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition print:hidden"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Housekeeping
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <CheckCheck className="w-6 h-6" />
            </span>
            Housekeeping & Reception Cross-Check Report
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Audit daily room cleaning completions against reception readiness and room reservations.
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setDateOffset(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDate === todayStr
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateOffset(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDate === new Date(Date.now() - 86400000).toISOString().split("T")[0]
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Yesterday
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => fetchReport(selectedDate)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Printable Report Header (Visible on print) */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">HOTEL HOUSEKEEPING & RECEPTION AUDIT</h2>
            <p className="text-sm text-slate-600">Daily Cross-Check and Reconciliation Summary</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-700">Audit Date: {selectedDate}</p>
            <p className="text-xs text-slate-500">Printed: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards: Housekeeping vs Reception Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Cleaned Today (Housekeeping) */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              Cleaned ({selectedDate === todayStr ? "Today" : selectedDate})
            </span>
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-950">
              {stats.cleanedOnDate}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              of {stats.totalRooms} rooms
            </span>
          </div>
          <p className="text-xs font-semibold text-emerald-800 mt-2">
            {stats.totalCleanedTasks} total cleaning tasks done
          </p>
        </div>

        {/* 2. Ready to Reserve (Reception Available) */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-800">
              Ready to Reserve
            </span>
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-blue-950">
              {stats.availableReady}
            </span>
            <span className="text-xs font-bold text-blue-700">
              available rooms
            </span>
          </div>
          <p className="text-xs font-semibold text-blue-800 mt-2">
            Reception can immediately reserve
          </p>
        </div>

        {/* 3. Currently Occupied */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
              Occupied
            </span>
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <BedDouble className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-indigo-950">
              {stats.occupiedNow}
            </span>
            <span className="text-xs font-bold text-indigo-700">
              in-house guests
            </span>
          </div>
          <p className="text-xs font-semibold text-indigo-800 mt-2">
            Stay-over or newly checked in
          </p>
        </div>

        {/* 4. Awaiting Cleaning / In Progress */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">
              Dirty / In Progress
            </span>
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-950">
              {stats.cleaningNow}
            </span>
            <span className="text-xs font-bold text-amber-700">
              not ready
            </span>
          </div>
          <p className="text-xs font-semibold text-amber-800 mt-2">
            Pending Housekeeping turnover
          </p>
        </div>

        {/* 5. Maintenance / Reserved */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-800">
              Maintenance / Reserved
            </span>
            <span className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-rose-950">
              {stats.maintenanceNow + stats.reservedNow}
            </span>
            <span className="text-xs font-bold text-rose-700">
              blocked rooms
            </span>
          </div>
          <p className="text-xs font-semibold text-rose-800 mt-2">
            {stats.maintenanceNow} maintenance, {stats.reservedNow} reserved
          </p>
        </div>
      </div>

      {/* Cross-Check Insights Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Reconciliation & Cross-Check Status
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Housekeeping cleaned <strong className="text-emerald-300">{stats.cleanedOnDate}</strong> rooms on {selectedDate}. Reception currently has <strong className="text-blue-300">{stats.availableReady}</strong> rooms ready for guest check-in.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-slate-300 font-medium">Ready Rate</p>
              <p className="text-lg font-black text-emerald-400">
                {stats.totalRooms ? Math.round((stats.availableReady / stats.totalRooms) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-slate-300 font-medium">Occupancy</p>
              <p className="text-lg font-black text-indigo-400">
                {stats.totalRooms ? Math.round((stats.occupiedNow / stats.totalRooms) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cleaner Performance on Selected Date */}
      {cleanerBreakdown.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Cleaner Staff Output ({selectedDate})
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {cleanerBreakdown.length} active cleaners
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cleanerBreakdown.map((cleaner) => (
              <div
                key={cleaner.cleaner_id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {cleaner.cleaner_name[0] || "C"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {cleaner.cleaner_name}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {cleaner.cleaner_position || "Cleaner"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg">
                    {cleaner.distinct_rooms_cleaned} rooms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs and Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 print:hidden">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("crosscheck")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "crosscheck"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            Cross-Check Matrix ({filteredRooms.length})
          </button>
          <button
            onClick={() => setActiveTab("cleaned_tasks")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "cleaned_tasks"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Completed Cleaning Tasks ({completedTasks.length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search room, cleaner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="ready_available">Reception: Ready to Reserve</option>
            <option value="cleaned_today">Housekeeping: Cleaned Today</option>
            <option value="occupied">Reception: Occupied</option>
            <option value="cleaning">Reception: Dirty / In Cleaning</option>
            <option value="maintenance">Maintenance</option>
            <option value="discrepancy">Discrepancy / Attention</option>
          </select>

          {floors.length > 1 && (
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Floors</option>
              {floors.map((f) => (
                <option key={f} value={f}>
                  Floor {f}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: Cross-Check Reconciliation Matrix */}
      {activeTab === "crosscheck" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                Hotel Rooms Reconciliation Table
              </h3>
              <p className="text-xs text-slate-500">
                Direct cross-check: Reception Status (Current) vs. Housekeeping Cleaning Log ({selectedDate})
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              Showing {filteredRooms.length} of {roomMatrix.length} rooms
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Room & Type</th>
                  <th className="py-3.5 px-3">Floor</th>
                  <th className="py-3.5 px-4">Reception Status (Ready?)</th>
                  <th className="py-3.5 px-4">Housekeeping on {selectedDate}</th>
                  <th className="py-3.5 px-4">Assigned / Done By</th>
                  <th className="py-3.5 px-4 text-center">Cross-Check Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      No rooms match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => {
                    const isCleanedToday =
                      room.task_status === "completed" || room.task_status === "inspected";
                    const isReadyToReserve = room.reception_status === "available";
                    const isOccupied = room.reception_status === "occupied";
                    const isCleaning = room.reception_status === "cleaning";
                    const isMaintenance = room.reception_status === "maintenance";

                    return (
                      <tr key={room.room_id} className="hover:bg-slate-50/70 transition">
                        {/* Room & Type */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-800 text-xs">
                              {room.room_number}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                Room {room.room_number}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-500">
                                {room.room_type_name || "Standard Room"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Floor */}
                        <td className="py-3.5 px-3 font-semibold text-slate-700">
                          Floor {room.floor || 1}
                        </td>

                        {/* Reception Status */}
                        <td className="py-3.5 px-4">
                          {isReadyToReserve && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready to Reserve
                            </span>
                          )}
                          {isOccupied && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              <BedDouble className="w-3.5 h-3.5" />
                              Occupied by Guest
                            </span>
                          )}
                          {isCleaning && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              Dirty / Cleaning
                            </span>
                          )}
                          {isMaintenance && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <Wrench className="w-3.5 h-3.5" />
                              Maintenance
                            </span>
                          )}
                          {!isReadyToReserve && !isOccupied && !isCleaning && !isMaintenance && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {room.reception_status || "Unknown"}
                            </span>
                          )}
                        </td>

                        {/* Housekeeping on Date */}
                        <td className="py-3.5 px-4">
                          {isCleanedToday ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-800">
                                <Sparkles className="w-3 h-3" /> Cleaned
                              </span>
                              {room.completed_at && (
                                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                  {new Date(room.completed_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              )}
                            </div>
                          ) : room.task_status ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                              {room.task_status}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold italic text-xs">
                              Not cleaned on {selectedDate}
                            </span>
                          )}
                        </td>

                        {/* Assigned Cleaner */}
                        <td className="py-3.5 px-4">
                          {room.cleaner_name ? (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-bold text-slate-800">
                                {room.cleaner_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold italic text-xs">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Cross-Check Verification */}
                        <td className="py-3.5 px-4 text-center">
                          {isCleanedToday && isReadyToReserve && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs">
                              <CheckCheck className="w-3.5 h-3.5" />
                              VERIFIED READY
                            </span>
                          )}
                          {!isCleanedToday && isReadyToReserve && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Ready (Prior Clean)
                            </span>
                          )}
                          {isOccupied && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600">
                              Guest In-House
                            </span>
                          )}
                          {isCleaning && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800">
                              Awaiting Clean
                            </span>
                          )}
                          {isMaintenance && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800">
                              Out of Order
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Detailed Completed Tasks Log */}
      {activeTab === "cleaned_tasks" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                Completed Housekeeping Tasks ({selectedDate})
              </h3>
              <p className="text-xs text-slate-500">
                All room cleanings finished by the housekeeping team with timestamps and cleaner attribution.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
              {completedTasks.length} tasks completed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Room #</th>
                  <th className="py-3.5 px-4">Room Type</th>
                  <th className="py-3.5 px-4">Cleaner Staff</th>
                  <th className="py-3.5 px-3">Task Type</th>
                  <th className="py-3.5 px-3">Priority</th>
                  <th className="py-3.5 px-4">Completed At</th>
                  <th className="py-3.5 px-4">Current Room Status</th>
                  <th className="py-3.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                      No cleaning tasks completed on {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  completedTasks.map((task) => (
                    <tr key={task.task_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        Room {task.room_number}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {task.room_type_name || "Standard Room"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                            {task.cleaner_name ? task.cleaner_name[0] : "?"}
                          </div>
                          <span className="font-bold text-slate-800">
                            {task.cleaner_name || "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700 capitalize">
                        {task.task_type?.replace(/_/g, " ")}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            task.priority === "urgent"
                              ? "bg-rose-100 text-rose-800"
                              : task.priority === "high"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {task.priority || "normal"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {task.completed_at
                          ? new Date(task.completed_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            task.current_room_status === "available"
                              ? "bg-blue-100 text-blue-800"
                              : task.current_room_status === "occupied"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {task.current_room_status === "available"
                            ? "Ready to Reserve"
                            : task.current_room_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {task.task_notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Footer for Sign-Off */}
      <div className="hidden print:grid grid-cols-2 gap-8 mt-12 pt-8 border-t-2 border-slate-300">
        <div>
          <p className="text-xs font-bold text-slate-800 uppercase mb-8">
            Housekeeping Supervisor Sign-Off
          </p>
          <div className="border-b border-slate-400 w-48 mb-1"></div>
          <p className="text-[11px] text-slate-500">Name / Signature & Date</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800 uppercase mb-8">
            Reception / Front Desk Manager Sign-Off
          </p>
          <div className="border-b border-slate-400 w-48 mb-1"></div>
          <p className="text-[11px] text-slate-500">Name / Signature & Date</p>
        </div>
      </div>
    </div>
  );
}

export default HousekeepingReportPage;
