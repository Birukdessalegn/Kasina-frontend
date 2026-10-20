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
  CheckCheck,
  Award,
  Layers,
  History
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../services/api";

function HousekeepingReportPage() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [periodType, setPeriodType] = useState("all"); // 'today' | 'yesterday' | 'week' | 'all' | 'custom'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("crosscheck"); // 'crosscheck' | 'cleaned_tasks'
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");

  const fetchReport = async (pType = periodType, customDate = selectedDate, sDate = startDate, eDate = endDate) => {
    try {
      setLoading(true);
      setError("");

      let endpoint = "/housekeeping/report";

      if (pType === "all") {
        endpoint += "?date=all";
      } else if (pType === "today") {
        endpoint += `?date=${todayStr}`;
      } else if (pType === "yesterday") {
        const yDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        endpoint += `?date=${yDate}`;
      } else if (pType === "week") {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
        endpoint += `?startDate=${weekAgo}&endDate=${todayStr}`;
      } else if (pType === "custom") {
        endpoint += `?startDate=${sDate}&endDate=${eDate}`;
      } else {
        endpoint += `?date=${customDate}`;
      }

      const res = await api(endpoint);
      if (res?.success) {
        setReportData(res.data);
      } else {
        setError(res?.message || "Failed to load housekeeping report");
      }
    } catch (err) {
      console.error("Error fetching housekeeping report:", err);
      setError(err.message || "Network error loading report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(periodType, selectedDate, startDate, endDate);
  }, [periodType, selectedDate, startDate, endDate]);

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
  const periodInfo = reportData?.period || {};

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
      const matchSearch =
        !searchQuery ||
        r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.room_type_name && r.room_type_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.last_cleaner_name && r.last_cleaner_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.period_cleaner_name && r.period_cleaner_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (floorFilter !== "all" && String(r.floor) !== String(floorFilter)) {
        return false;
      }

      if (statusFilter === "cleaned_in_period") {
        return !!r.period_task_id;
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
        const isReady = r.reception_status === "available";
        const wasCleaned = !!r.last_completed_at;
        return (isReady && !wasCleaned) || (!isReady && wasCleaned);
      }

      return true;
    });
  }, [roomMatrix, searchQuery, statusFilter, floorFilter]);

  const handlePrint = () => {
    window.print();
  };

  const periodLabel = useMemo(() => {
    if (periodType === "all") return "All Cleaning History";
    if (periodType === "today") return `Today (${todayStr})`;
    if (periodType === "yesterday") {
      const yDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      return `Yesterday (${yDate})`;
    }
    if (periodType === "week") return "Last 7 Days";
    if (periodType === "custom") return `${startDate} to ${endDate}`;
    return selectedDate;
  }, [periodType, selectedDate, startDate, endDate, todayStr]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">
      {/* Explicit Print Overrides */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body, html, #root, main, div {
            overflow: visible !important;
            height: auto !important;
          }
          aside, nav, header, button, .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/housekeeping"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Housekeeping Operations
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <CheckCheck className="w-6 h-6" />
            </span>
            Housekeeping & Reception Cross-Check Report
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Reconcile room cleaning output from the housekeeping team with front desk room availability.
          </p>
        </div>

        {/* Date / Period Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Period Buttons */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setPeriodType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodType === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All History
            </button>
            <button
              onClick={() => setPeriodType("today")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodType === "today"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriodType("yesterday")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodType === "yesterday"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setPeriodType("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodType === "week"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Last 7 Days
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPeriodType("single");
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
              title="Pick specific date"
            />
          </div>

          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
            title="Refresh Data"
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

      {/* Printable Report Header (Active on print) */}
      <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">
              HOTEL HOUSEKEEPING & RECEPTION AUDIT REPORT
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Daily Room Turnover, Cleaner Performance & Front Desk Readiness Audit
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-900">
              Audit Period: <span className="text-blue-700">{periodLabel}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 no-print">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards: Housekeeping vs Reception Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 print:grid-cols-5 print:gap-2">
        {/* 1. Cleaned Rooms */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 print:p-3 print:rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              Cleaned ({periodType === "all" ? "Total Recorded" : "In Period"})
            </span>
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl no-print">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-950 print:text-2xl">
              {stats.cleanedOnDate}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              of {stats.totalRooms} rooms
            </span>
          </div>
          <p className="text-xs font-semibold text-emerald-800 mt-2 print:text-[10px]">
            {stats.totalCleanedTasks} total cleaning tasks done
          </p>
        </div>

        {/* 2. Ready to Reserve (Reception Available) */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 print:p-3 print:rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-800">
              Ready to Reserve
            </span>
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-xl no-print">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-blue-950 print:text-2xl">
              {stats.availableReady}
            </span>
            <span className="text-xs font-bold text-blue-700">
              available rooms
            </span>
          </div>
          <p className="text-xs font-semibold text-blue-800 mt-2 print:text-[10px]">
            Reception can immediately sell
          </p>
        </div>

        {/* 3. Currently Occupied */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5 print:p-3 print:rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800">
              Occupied
            </span>
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-xl no-print">
              <BedDouble className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-indigo-950 print:text-2xl">
              {stats.occupiedNow}
            </span>
            <span className="text-xs font-bold text-indigo-700">
              in-house guests
            </span>
          </div>
          <p className="text-xs font-semibold text-indigo-800 mt-2 print:text-[10px]">
            Stay-over or checked in
          </p>
        </div>

        {/* 4. Awaiting Cleaning / In Progress */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 print:p-3 print:rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
              Dirty / In Cleaning
            </span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-xl no-print">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-950 print:text-2xl">
              {stats.cleaningNow}
            </span>
            <span className="text-xs font-bold text-amber-700">
              not ready
            </span>
          </div>
          <p className="text-xs font-semibold text-amber-800 mt-2 print:text-[10px]">
            Pending cleaning turnover
          </p>
        </div>

        {/* 5. Maintenance / Reserved */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 sm:p-5 print:p-3 print:rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-800">
              Maintenance / Reserved
            </span>
            <span className="p-1.5 bg-rose-100 text-rose-700 rounded-xl no-print">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-rose-950 print:text-2xl">
              {stats.maintenanceNow + stats.reservedNow}
            </span>
            <span className="text-xs font-bold text-rose-700">
              blocked rooms
            </span>
          </div>
          <p className="text-xs font-semibold text-rose-800 mt-2 print:text-[10px]">
            {stats.maintenanceNow} maintenance, {stats.reservedNow} reserved
          </p>
        </div>
      </div>

      {/* Cross-Check Insights Banner (Screen only) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm no-print">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Reconciliation & Cross-Check Status ({periodLabel})
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Housekeeping has cleaned <strong className="text-emerald-300">{stats.cleanedOnDate}</strong> rooms in this period. Reception currently has <strong className="text-blue-300">{stats.availableReady}</strong> rooms ready for immediate check-in.
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

      {/* Cleaner Output Breakdown (Visible on Screen & Print if cleaners exist) */}
      {cleanerBreakdown.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs print:p-3 print:border print:rounded-lg print-break-inside-avoid">
          <div className="flex items-center justify-between mb-4 print:mb-2">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 print:text-sm">
              <Award className="w-5 h-5 text-amber-500 no-print" />
              Cleaner Staff Output ({periodLabel})
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {cleanerBreakdown.length} active cleaner staff
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            {cleanerBreakdown.map((cleaner) => (
              <div
                key={cleaner.cleaner_id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between print:p-2 print:bg-white print:border-slate-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs print:w-7 print:h-7">
                    {cleaner.cleaner_name[0] || "C"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight print:text-xs">
                      {cleaner.cleaner_name}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 print:text-[10px]">
                      {cleaner.cleaner_position || "Cleaner"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg print:text-[10px] print:px-1.5 print:py-0.5">
                    {cleaner.distinct_rooms_cleaned} rooms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs and Screen Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
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
            Cleaning Tasks Log ({completedTasks.length})
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
            <option value="all">All Room Statuses</option>
            <option value="ready_available">Reception: Ready to Reserve</option>
            <option value="cleaned_in_period">Cleaned in Selected Period</option>
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

      {/* Cross-Check Reconciliation Matrix Table */}
      {(activeTab === "crosscheck" || true) && (
        <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs print:border print:rounded-lg print-break-inside-avoid ${activeTab !== "crosscheck" ? "no-print" : ""}`}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between print:p-2">
            <div>
              <h3 className="font-black text-slate-900 text-sm print:text-xs uppercase">
                Hotel Room Readiness & Cleaning Cross-Check Table
              </h3>
              <p className="text-xs text-slate-500 print:text-[10px]">
                Cross-checking Current Reception Status against Housekeeping Cleaning Records ({periodLabel})
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg print:text-[10px] print:px-2 print:py-0.5">
              Showing {filteredRooms.length} of {roomMatrix.length} rooms
            </span>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs print:text-[10px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 print:text-[9px] print:bg-slate-100">
                <tr>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Room & Type</th>
                  <th className="py-3 px-3 print:py-1.5 print:px-2">Floor</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Reception Status (Ready?)</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Cleaned in Period?</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Last Cleaning Record</th>
                  <th className="py-3 px-4 text-center print:py-1.5 print:px-2">Verification Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      No rooms match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => {
                    const isCleanedInPeriod = !!room.period_task_id;
                    const isReadyToReserve = room.reception_status === "available";
                    const isOccupied = room.reception_status === "occupied";
                    const isCleaning = room.reception_status === "cleaning";
                    const isMaintenance = room.reception_status === "maintenance";

                    return (
                      <tr key={room.room_id} className="hover:bg-slate-50/70 transition">
                        {/* Room & Type */}
                        <td className="py-3 px-4 font-bold text-slate-900 print:py-1.5 print:px-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-800 text-xs print:w-6 print:h-6 print:text-[10px]">
                              {room.room_number}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                Room {room.room_number}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-500 print:text-[9px]">
                                {room.room_type_name || "Standard Room"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Floor */}
                        <td className="py-3 px-3 font-semibold text-slate-700 print:py-1.5 print:px-2">
                          Floor {room.floor || 1}
                        </td>

                        {/* Reception Status */}
                        <td className="py-3 px-4 print:py-1.5 print:px-2">
                          {isReadyToReserve && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 print:border-none print:px-1.5 print:py-0.5 print:text-[9px]">
                              <CheckCircle2 className="w-3.5 h-3.5 no-print" />
                              Ready to Reserve
                            </span>
                          )}
                          {isOccupied && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 print:border-none print:px-1.5 print:py-0.5 print:text-[9px]">
                              <BedDouble className="w-3.5 h-3.5 no-print" />
                              Occupied by Guest
                            </span>
                          )}
                          {isCleaning && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 print:border-none print:px-1.5 print:py-0.5 print:text-[9px]">
                              <Clock className="w-3.5 h-3.5 no-print" />
                              Dirty / Cleaning
                            </span>
                          )}
                          {isMaintenance && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 print:border-none print:px-1.5 print:py-0.5 print:text-[9px]">
                              <Wrench className="w-3.5 h-3.5 no-print" />
                              Maintenance
                            </span>
                          )}
                          {!isReadyToReserve && !isOccupied && !isCleaning && !isMaintenance && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 print:px-1.5 print:py-0.5 print:text-[9px]">
                              {room.reception_status || "Unknown"}
                            </span>
                          )}
                        </td>

                        {/* Cleaned in Period */}
                        <td className="py-3 px-4 print:py-1.5 print:px-2">
                          {isCleanedInPeriod ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 print:text-[9px]">
                                <Sparkles className="w-3 h-3 no-print" /> Cleaned
                              </span>
                              {room.period_completed_at && (
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5 print:text-[9px]">
                                  {new Date(room.period_completed_at).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric"
                                  })}{" "}
                                  {new Date(room.period_completed_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold italic text-xs print:text-[9px]">
                              Not cleaned in period
                            </span>
                          )}
                        </td>

                        {/* Last Cleaning Record */}
                        <td className="py-3 px-4 print:py-1.5 print:px-2">
                          {room.last_completed_at ? (
                            <div>
                              <p className="font-bold text-slate-800 leading-tight">
                                {new Date(room.last_completed_at).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric"
                                })}{" "}
                                {new Date(room.last_completed_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                              <p className="text-[11px] text-slate-500 print:text-[9px]">
                                By: <strong className="text-slate-700">{room.last_cleaner_name || "Staff"}</strong>{" "}
                                ({room.last_task_type?.replace(/_/g, " ") || "Clean"})
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold italic text-xs print:text-[9px]">
                              No recorded cleaning
                            </span>
                          )}
                        </td>

                        {/* Cross-Check Verification */}
                        <td className="py-3 px-4 text-center print:py-1.5 print:px-2">
                          {isCleanedInPeriod && isReadyToReserve && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs print:bg-emerald-100 print:text-emerald-900 print:text-[9px] print:px-1.5 print:py-0.5">
                              <CheckCheck className="w-3.5 h-3.5 no-print" />
                              VERIFIED READY
                            </span>
                          )}
                          {!isCleanedInPeriod && isReadyToReserve && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 print:border-none print:text-[9px] print:px-1.5 print:py-0.5">
                              Ready (Prior Clean)
                            </span>
                          )}
                          {isOccupied && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 print:text-[9px] print:px-1.5 print:py-0.5">
                              Guest In-House
                            </span>
                          )}
                          {isCleaning && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 print:text-[9px] print:px-1.5 print:py-0.5">
                              Awaiting Clean
                            </span>
                          )}
                          {isMaintenance && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 print:text-[9px] print:px-1.5 print:py-0.5">
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

      {/* Completed Tasks Log Table */}
      {(activeTab === "cleaned_tasks" || true) && (
        <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs print:border print:rounded-lg print:mt-6 print-break-inside-avoid ${activeTab !== "cleaned_tasks" ? "no-print" : ""}`}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between print:p-2">
            <div>
              <h3 className="font-black text-slate-900 text-sm print:text-xs uppercase">
                Completed Housekeeping Cleaning Log ({periodLabel})
              </h3>
              <p className="text-xs text-slate-500 print:text-[10px]">
                Finished cleaning assignments by the housekeeping team with timestamps and cleaner attribution.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg print:text-[10px] print:px-2 print:py-0.5">
              {completedTasks.length} tasks recorded
            </span>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs print:text-[10px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 print:text-[9px] print:bg-slate-100">
                <tr>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Room #</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Room Type</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Cleaner Staff</th>
                  <th className="py-3 px-3 print:py-1.5 print:px-2">Task Type</th>
                  <th className="py-3 px-3 print:py-1.5 print:px-2">Priority</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Completed At</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Current Room Status</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {completedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                      No cleaning tasks completed during this period. Switch filter to &quot;All History&quot; to see past cleanings.
                    </td>
                  </tr>
                ) : (
                  completedTasks.map((task) => (
                    <tr key={task.task_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-black text-slate-900 print:py-1.5 print:px-2">
                        Room {task.room_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 print:py-1.5 print:px-2">
                        {task.room_type_name || "Standard Room"}
                      </td>
                      <td className="py-3 px-4 print:py-1.5 print:px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] print:hidden">
                            {task.cleaner_name ? task.cleaner_name[0] : "?"}
                          </div>
                          <span className="font-bold text-slate-800">
                            {task.cleaner_name || "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 capitalize print:py-1.5 print:px-2">
                        {task.task_type?.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-2">
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
                      <td className="py-3 px-4 font-bold text-slate-800 print:py-1.5 print:px-2">
                        {task.completed_at
                          ? `${new Date(task.completed_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric"
                            })} ${new Date(task.completed_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 print:py-1.5 print:px-2">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold print:text-[9px] print:px-1.5 print:py-0.5 ${
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
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate print:py-1.5 print:px-2">
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

      {/* Formal Sign-Off Footer for Physical Audit (Print only) */}
      <div className="print-only mt-10 pt-6 border-t-2 border-slate-300 print-break-inside-avoid">
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase mb-8">
              Housekeeping Supervisor Sign-Off
            </p>
            <div className="border-b border-slate-500 w-56 mb-1"></div>
            <p className="text-[10px] text-slate-500">Name / Signature & Date</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase mb-8">
              Reception / Front Desk Manager Sign-Off
            </p>
            <div className="border-b border-slate-500 w-56 mb-1"></div>
            <p className="text-[10px] text-slate-500">Name / Signature & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HousekeepingReportPage;
