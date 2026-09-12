import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Utensils,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  FileText,
  BedDouble,
  ChevronRight,
  Radio,
  CheckCircle2,
} from "lucide-react";
import api from "../../../services/api";

export default function FinanceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Data States
  const [dashboardStats, setDashboardStats] = useState(null);
  const [roomReservations, setRoomReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [cashierShifts, setCashierShifts] = useState([]);

  // Timeframe switch: "all" | "today"
  const [timeframe, setTimeframe] = useState("all");

  const fetchFinanceData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);
      setError("");

      const [dashRes, roomsRes, ordersRes, pmtsRes, expRes, purRes, shiftsRes] = await Promise.all([
        api("/dashboard").catch(() => ({})),
        api("/room-reservations").catch(() => api("/rooms/reservations").catch(() => ([]))),
        api("/pos/orders").catch(() => api("/orders").catch(() => ([]))),
        api("/payments").catch(() => ([])),
        api("/expenses").catch(() => ([])),
        api("/purchasing").catch(() => ({ purchases: [] })),
        api("/finance/cashier-shifts").catch(() => api("/pos/shifts").catch(() => ([]))),
      ]);

      if (dashRes && (dashRes.success || dashRes.stats || dashRes.data)) {
        setDashboardStats(dashRes.stats || dashRes.data || dashRes);
      }

      setRoomReservations(roomsRes.reservations || roomsRes.data || (Array.isArray(roomsRes) ? roomsRes : []));
      setOrders(ordersRes.orders || ordersRes.data || (Array.isArray(ordersRes) ? ordersRes : []));
      setPayments(pmtsRes.payments || pmtsRes.data || (Array.isArray(pmtsRes) ? pmtsRes : []));
      setExpenses(Array.isArray(expRes) ? expRes : expRes.expenses || expRes.data || []);
      setPurchases(purRes.purchases || purRes.data || (Array.isArray(purRes) ? purRes : []));

      const sList = shiftsRes.data?.shifts || shiftsRes.shifts || (Array.isArray(shiftsRes) ? shiftsRes : []);
      setCashierShifts(sList);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load finance dashboard data:", err);
      if (isInitial) setError(err.message || "Failed to load financial records");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData(true);
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => fetchFinanceData(false), 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchFinanceData]);

  const formatMoney = (val) => `${Number(val || 0).toLocaleString()} ETB`;

  // ============================================================
  // FINANCIAL METRICS CALCULATION
  // ============================================================
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. ROOM LODGING REVENUE
    const totalRoomSales = Math.max(
      (roomReservations || []).reduce((sum, r) => sum + Number(r.paid_amount || r.total_amount || 0), 0),
      Number(dashboardStats?.room_sales_all_time || 0)
    );

    const todayRoomSales = (roomReservations || []).reduce((sum, r) => {
      const d = r.created_at || r.check_in_date;
      if (!d) return sum;
      return String(d).split(/[T ]/)[0] === todayStr ? sum + Number(r.paid_amount || r.total_amount || 0) : sum;
    }, 0);

    // 2. RESTAURANT & BAR POS SETTLED SALES
    const totalPosSales = Math.max(
      (payments || []).reduce((sum, p) => {
        const st = String(p.status || "").toLowerCase();
        return (st === "paid" || st === "completed" || !st) ? sum + Number(p.amount || 0) : sum;
      }, 0),
      Number(dashboardStats?.pos_sales_all_time || 0)
    );

    const todayPosSales = Math.max(
      (payments || []).reduce((sum, p) => {
        const d = p.paid_at || p.created_at || p.date;
        if (!d) return sum + Number(p.amount || 0);
        return String(d).split(/[T ]/)[0] === todayStr ? sum + Number(p.amount || 0) : sum;
      }, 0),
      Number(dashboardStats?.today_pos_sales || dashboardStats?.today_sales || 0)
    );

    // 3. WHOLE HOTEL GRAND TOTAL
    const wholeHotelLifetimeRevenue = Math.max(
      totalRoomSales + totalPosSales,
      Number(dashboardStats?.grand_total_revenue || dashboardStats?.all_time_sales || 0)
    );

    const wholeHotelTodayRevenue = Math.max(
      todayRoomSales + todayPosSales,
      Number(dashboardStats?.grand_today_revenue || dashboardStats?.today_sales || 0)
    );

    // 4. ACTIVE FLOOR UNPAID TABS
    const totalPendingFloorTabs = Math.max(
      (orders || []).reduce((sum, o) => {
        const st = String(o.status || "").toLowerCase();
        const paySt = String(o.payment_status || "").toLowerCase();
        if (st === "cancelled" || st === "void" || st === "completed" || paySt === "paid" || o.is_paid === true) {
          return sum;
        }
        return sum + Number(o.total_amount || o.total || 0);
      }, 0),
      Number(dashboardStats?.active_orders_amount || 0)
    );

    // 5. TOTAL HOTEL BUSINESS VOLUME
    const totalHotelPipeline = Math.max(
      wholeHotelLifetimeRevenue + totalPendingFloorTabs,
      Number(dashboardStats?.total_hotel_business_volume || 0)
    );

    // 6. OPERATING OUTFLOW (EXPENSES + PURCHASES)
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || e.total || 0), 0);
    const todayExpenses = (expenses || []).reduce((sum, e) => {
      const d = e.date || e.created_at || e.expense_date;
      return String(d).split(/[T ]/)[0] === todayStr ? sum + Number(e.amount || 0) : sum;
    }, 0);

    const totalPurchases = (purchases || []).reduce((sum, p) => sum + Number(p.total_amount || p.total || 0), 0);
    const totalOutflow = totalExpenses + totalPurchases;

    // 7. TAX & NET PROFIT
    const activeGrossRevenue = timeframe === "today" ? wholeHotelTodayRevenue : wholeHotelLifetimeRevenue;
    const activeOutflow = timeframe === "today" ? todayExpenses : totalOutflow;

    const totalVat = Math.round((activeGrossRevenue / 1.25) * 0.15 * 100) / 100;
    const totalService = Math.round((activeGrossRevenue / 1.25) * 0.10 * 100) / 100;
    const netProfit = Math.max(activeGrossRevenue - totalVat - totalService - activeOutflow, 0);

    // 8. CASHIER DRAWER AUDIT STATS
    const pendingShiftVerifications = (cashierShifts || []).filter(
      (s) => String(s.status || s.verification_status || "pending").toLowerCase() === "pending"
    ).length;

    return {
      wholeHotelLifetimeRevenue,
      wholeHotelTodayRevenue,
      totalRoomSales,
      todayRoomSales,
      totalPosSales,
      todayPosSales,
      totalPendingFloorTabs,
      totalHotelPipeline,
      totalExpenses,
      totalPurchases,
      totalOutflow,
      totalVat,
      totalService,
      netProfit,
      activeGrossRevenue,
      pendingShiftVerifications,
      totalReservationsCount: (roomReservations || []).length,
      totalOrdersCount: (orders || []).length,
    };
  }, [roomReservations, orders, payments, expenses, purchases, cashierShifts, dashboardStats, timeframe]);

  // Combined Multi-Department Recent Transactions
  const recentTransactions = useMemo(() => {
    const list = [];

    // Room payments
    (roomReservations || []).forEach((r) => {
      const amt = Number(r.paid_amount || r.total_amount || 0);
      if (amt > 0) {
        list.push({
          id: `room-${r.id || r.reservation_code}`,
          code: r.reservation_code || `RES-${r.id}`,
          title: `Room ${r.room_number || "Suite"} - ${r.guest_name || "Guest"}`,
          department: "Hotel Room Lodging",
          deptIcon: BedDouble,
          deptColor: "text-blue-700 bg-blue-50 border-blue-200",
          amount: amt,
          method: r.payment_method || "Paid",
          date: r.created_at || r.check_in_date,
          status: r.payment_status || "paid",
        });
      }
    });

    // POS payments
    (payments || []).forEach((p) => {
      const amt = Number(p.amount || 0);
      if (amt > 0) {
        list.push({
          id: `pos-${p.id}`,
          code: p.order_number || `ORD-${p.order_id || p.id}`,
          title: p.table_number ? `Table ${p.table_number}` : "Dining / Bar Order",
          department: "Restaurant & Bar POS",
          deptIcon: Utensils,
          deptColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
          amount: amt,
          method: p.payment_method || "Cash",
          date: p.paid_at || p.created_at,
          status: p.status || "paid",
        });
      }
    });

    return list
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 8);
  }, [roomReservations, payments]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Connecting to Hotel Finance Core Ledger...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 text-slate-900 min-h-screen">
      {/* ============================================================
          FINANCE COMMAND HEADER
      ============================================================ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-xs">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
              HOTEL FINANCE CORE ACTIVE
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Finance Executive & Auditor View
            </span>
          </div>

          <h1 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
            <span>💼 Hotel Finance & Revenue Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Unified multi-field financial monitoring: Room lodging receipts, restaurant/bar POS collections, cashier drawer audits, and P&L statements.
          </p>
        </div>

        {/* Action Buttons & Timeframe Switch */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/finance/sales"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer"
          >
            <TrendingUp className="h-4 w-4" />
            Sales Audit
          </Link>

          <Link
            to="/finance/cashier-reconciliation"
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            Cashier Drawer Reconciliation
          </Link>

          <Link
            to="/finance/reports"
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            Financial P&L Reports
          </Link>

          <div className="flex items-center gap-1 rounded-xl bg-white p-1 border border-slate-200 text-xs font-extrabold shadow-xs">
            <button
              type="button"
              onClick={() => setTimeframe("today")}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === "today"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === "all"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              👑 All-Time
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchFinanceData(false)}
            disabled={isRefreshing}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* ============================================================
          UNIFIED HOTEL REVENUE COMMAND BANNER
      ============================================================ */}
      <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-inner">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/30">
                ALL REVENUE DEPARTMENTS LINKED
              </span>
              <span className="text-xs font-bold text-slate-300">
                Live PostgreSQL Finance Aggregator
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
              Whole Hotel Grand Collections: <span className="text-amber-400 font-mono tracking-tight">{formatMoney(metrics.wholeHotelLifetimeRevenue)}</span>
            </h2>
          </div>
        </div>

        {/* Quick Department Live Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 shadow-2xs">
            <BedDouble className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-slate-300 font-medium">Rooms:</span>
            <span className="font-black text-blue-300 font-mono">{formatMoney(metrics.totalRoomSales)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 shadow-2xs">
            <Utensils className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-300 font-medium">Food & Bar:</span>
            <span className="font-black text-emerald-300 font-mono">{formatMoney(metrics.totalPosSales)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-300 font-medium">Floor Tabs:</span>
            <span className="font-black text-amber-300 font-mono">{formatMoney(metrics.totalPendingFloorTabs)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 shadow-2xs">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-amber-200 font-medium">Total Pipeline:</span>
            <span className="font-black text-amber-300 font-mono">{formatMoney(metrics.totalHotelBusinessVolume)}</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          5 EXECUTIVE FINANCIAL KPI CARDS (COMPACT & SMALL)
      ============================================================ */}
      <div className="grid gap-2 sm:gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Whole Hotel Grand Collections */}
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-2.5 sm:p-3 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              👑 Whole Hotel Revenue
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
            {formatMoney(metrics.wholeHotelLifetimeRevenue)}
          </p>
          <div className="mt-1 flex items-center justify-between border-t border-amber-200/60 pt-1 text-[10px]">
            <span className="text-slate-500 font-semibold">Today:</span>
            <span className="font-extrabold text-amber-900 font-mono">{formatMoney(metrics.wholeHotelTodayRevenue)}</span>
          </div>
        </div>

        {/* Card 2: Hotel Room Lodging Revenue */}
        <div className="relative overflow-hidden rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-500/10 via-white to-blue-500/5 p-2.5 sm:p-3 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">
              🏨 Room Lodging Sales
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
              <BedDouble className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
            {formatMoney(metrics.totalRoomSales)}
          </p>
          <div className="mt-1 flex items-center justify-between border-t border-blue-200/60 pt-1 text-[10px]">
            <span className="text-slate-500 font-semibold">{metrics.totalReservationsCount} Bookings</span>
            <span className="font-extrabold text-blue-900">100% Settled</span>
          </div>
        </div>

        {/* Card 3: Restaurant & Bar POS Sales */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 p-2.5 sm:p-3 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              🍽️ Food & Bar Settled
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Utensils className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
            {formatMoney(metrics.totalPosSales)}
          </p>
          <div className="mt-1 flex items-center justify-between border-t border-emerald-200/60 pt-1 text-[10px]">
            <span className="text-slate-500 font-semibold">Today: {formatMoney(metrics.todayPosSales)}</span>
            <span className="font-extrabold text-emerald-900">POS Paid</span>
          </div>
        </div>

        {/* Card 4: Operating Outflow (Expenses + Purchases) */}
        <div className="relative overflow-hidden rounded-xl border border-rose-200/90 bg-gradient-to-br from-rose-500/10 via-white to-rose-500/5 p-2.5 sm:p-3 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
              💸 Operating Outflow
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black text-rose-700 tracking-tight font-mono">
            {formatMoney(metrics.totalOutflow)}
          </p>
          <div className="mt-1 flex items-center justify-between border-t border-rose-200/60 pt-1 text-[10px]">
            <span className="text-slate-500 font-semibold">Spend: {formatMoney(metrics.totalExpenses)}</span>
            <span className="font-extrabold text-rose-800">Outflow</span>
          </div>
        </div>

        {/* Card 5: Net Profit Margin */}
        <div className="relative overflow-hidden rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-2.5 sm:p-3 text-white shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
              💵 Net Operating Profit
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black text-emerald-400 tracking-tight font-mono">
            {formatMoney(metrics.netProfit)}
          </p>
          <div className="mt-1 flex items-center justify-between border-t border-slate-800 pt-1 text-[10px] text-slate-400">
            <span>Net of Costs</span>
            <span className="font-bold text-emerald-300">Audited</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          LOWER SECTION: RECENT MULTI-DEPARTMENT TRANSACTIONS & CASHIER AUDIT
      ============================================================ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Live Multi-Department Ledger Stream */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Live Multi-Department Audit Stream
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time stream of verified payments across Rooms, Dining, and Bar.
              </p>
            </div>
            <Link
              to="/finance/sales"
              className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All Sales
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Code / Ref</th>
                  <th className="px-3 py-2.5">Department</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5">Method</th>
                  <th className="px-3 py-2.5 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                      No recorded multi-department transactions found.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => {
                    const DeptIcon = tx.deptIcon;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-3 py-3 font-mono font-bold text-slate-900">
                          {tx.code}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${tx.deptColor}`}>
                            <DeptIcon className="h-3 w-3" />
                            {tx.department}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-700">
                          {tx.title}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 uppercase">
                            {tx.method}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-black text-slate-900 font-mono">
                          {formatMoney(tx.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Cashier Drawer Reconciliation Status */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  Cashier Drawer Verification
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audits of POS cashier shifts & cash balances.
                </p>
              </div>
            </div>

            {/* Pending Badge */}
            <div className="mt-4 rounded-2xl bg-purple-50 p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">Pending Shift Audits:</span>
                <span className="rounded-full bg-purple-200 text-purple-900 px-2.5 py-0.5 text-xs font-black">
                  {metrics.pendingShiftVerifications} Shifts
                </span>
              </div>
              <p className="text-[11px] text-purple-700 mt-1">
                Cashiers closed shifts awaiting financial sign-off.
              </p>
            </div>

            {/* Recent Shift list */}
            <div className="mt-4 space-y-3">
              {(cashierShifts || []).slice(0, 3).map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-100 p-3 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-extrabold text-slate-900">{s.cashier_name || `Shift #${s.id}`}</p>
                    <p className="text-[10px] text-slate-500">Terminal {s.terminal_id || 1} • Expected: {formatMoney(s.expected_cash)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    String(s.status || "pending").toLowerCase() === "verified"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {s.status || "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/finance/cashier-reconciliation"
            className="w-full text-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white py-2.5 text-xs font-extrabold transition shadow-xs cursor-pointer block mt-4"
          >
            Open Cashier Reconciliation Tool →
          </Link>
        </div>
      </div>
    </div>
  );
}
