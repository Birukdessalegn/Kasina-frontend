import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Smartphone,
  Users,
  Search,
  RefreshCw,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Receipt,
  X,
  Eye,
  FileText,
  UtensilsCrossed,
  BedDouble,
  Sparkles,
  Building2,
  Clock,
} from "lucide-react";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";

function StatCard({ title, value, subtext, icon: Icon, color, bg }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900 tracking-tight font-mono">
            {value}
          </h3>
          {subtext && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {subtext}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FinanceSalesPage() {
  const [salesRecords, setSalesRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all"); // "all" | "rooms" | "pos"
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "settled" | "open_tabs"
  const [paymentFilter, setPaymentFilter] = useState("all"); // "all" | "cash" | "digital" | "credit"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePreset, setDatePreset] = useState("all");

  // Selected Transaction for Modal View
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fetch Whole Hotel Sales Data (Room Lodging + Restaurant & Bar POS)
  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Room Reservations, POS orders, and completed payments concurrently
      const [roomsRes, posRes, paymentsRes] = await Promise.all([
        api("/room-reservations").catch(() => ({ data: [] })),
        api("/pos/orders").catch(() => api("/orders").catch(() => ({ orders: [] }))),
        api("/payments").catch(() => ([])),
      ]);

      const rawRooms = roomsRes.reservations || roomsRes.data || (Array.isArray(roomsRes) ? roomsRes : []);
      const rawOrders = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const rawPayments = paymentsRes.payments || paymentsRes.data || (Array.isArray(paymentsRes) ? paymentsRes : []);
      const records = [];

      // 1. HOTEL ROOM LODGING REVENUE (Only Actually Paid Money)
      rawRooms.forEach((r) => {
        const paidAmt = Number(r.paid_amount || 0);
        const amt = paidAmt > 0 ? paidAmt : (r.payment_status === "paid" ? Number(r.total_amount || 0) : 0);

        if (amt > 0) {
          records.push({
            id: `room-${r.id || r.reservation_code || Math.random()}`,
            rawId: r.id,
            type: "room",
            code: r.reservation_code || `#RES-${r.id}`,
            department: "Hotel Room Lodging",
            deptKey: "rooms",
            customer: r.guest_name || r.customer_name || "Hotel Guest",
            customerPhone: r.phone_number || r.guest_phone || r.customer_phone || "-",
            tableOrRoom: r.room_number ? `Room #${r.room_number}` : (r.room_type_name ? `Room (${r.room_type_name})` : "Hotel Suite"),
            staff: r.receptionist_name || r.created_by_name || r.user_name || "Front Desk",
            payment_method: (r.payment_method || "cash").toLowerCase(),
            amount: amt,
            date: r.created_at || r.check_in_date || r.createdAt || r.date,
            status: "paid",
            isSettled: true,
            raw: r,
          });
        }
      });

      // 2. RESTAURANT, CAFE & BAR POS SETTLED PAYMENTS (Only Actually Paid Money)
      const linkedOrderIds = new Set();
      rawPayments.forEach((p) => {
        const amt = Number(p.amount || 0);
        if (amt > 0) {
          const linkedOrder = rawOrders.find((o) => String(o.id) === String(p.order_id));
          if (p.order_id) linkedOrderIds.add(String(p.order_id));

          records.push({
            id: `pos-pay-${p.id}`,
            rawId: p.id,
            type: "pos",
            code: p.order_number || (linkedOrder ? linkedOrder.order_number : `#PAY-${p.id}`),
            department: "Restaurant & Bar POS",
            deptKey: "pos",
            customer: (linkedOrder && (linkedOrder.customer_name || linkedOrder.guest_name)) || "Restaurant Guest",
            customerPhone: (linkedOrder && linkedOrder.customer_phone) || "-",
            tableOrRoom: linkedOrder?.table_number ? `Table #${linkedOrder.table_number}` : (linkedOrder?.table_id ? `Table #${linkedOrder.table_id}` : "Bar / Takeout"),
            staff: p.received_by_first_name ? `${p.received_by_first_name} ${p.received_by_last_name || ""}`.trim() : (linkedOrder?.cashier_name || linkedOrder?.waiter_name || "Cashier Staff"),
            payment_method: (p.payment_method || "cash").toLowerCase(),
            amount: amt,
            date: p.paid_at || p.created_at || (linkedOrder && (linkedOrder.created_at || linkedOrder.createdAt)),
            status: "paid",
            isSettled: true,
            raw: p,
          });
        }
      });

      // 3. UNPAID ACTIVE FLOOR TABS (Tracked separately as Pending / Unsettled)
      rawOrders.forEach((o) => {
        const st = String(o.status || "").toLowerCase();
        const paySt = String(o.payment_status || "").toLowerCase();
        const oId = String(o.id || o.order_id);

        const isFullyPaid = paySt === "paid" || o.is_paid === true;
        const isCancelled = st === "cancelled" || st === "void";

        // Find how much has been paid for this order
        const oPayments = rawPayments.filter((p) => String(p.order_id) === oId);
        const paidSoFar = oPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const orderTotal = Number(o.total || o.total_amount || 0);
        const unpaidBalance = orderTotal - paidSoFar;

        if (!isCancelled && !isFullyPaid && unpaidBalance > 0 && (st !== "completed" || paidSoFar === 0)) {
          records.push({
            id: `tab-${o.id || o.order_id}`,
            rawId: o.id || o.order_id,
            type: "pos",
            code: o.order_number || `#ORD-${o.id}`,
            department: "Restaurant & Bar POS",
            deptKey: "pos",
            customer: o.customer_name || o.guest_name || "Floor Guest",
            customerPhone: o.customer_phone || "-",
            tableOrRoom: o.table_number ? `Table #${o.table_number}` : (o.table_id ? `Table #${o.table_id}` : "Floor Tab"),
            staff: o.cashier_name || o.waiter_name || o.user_name || "Floor Waiter",
            payment_method: (o.payment_method || "unpaid").toLowerCase(),
            amount: unpaidBalance,
            date: o.created_at || o.createdAt || o.date,
            status: "pending",
            isSettled: false,
            raw: o,
          });
        }
      });

      // Sort by newest date descending
      records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setSalesRecords(records);
    } catch (err) {
      console.error("Failed to load whole-hotel sales data:", err);
      setError(err.message || "Failed to load sales transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  // Handle Preset Date Filters
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();

    if (preset === "today") {
      const d = today.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const d = y.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "week") {
      const w = new Date(today);
      w.setDate(today.getDate() - 7);
      setStartDate(w.toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    } else if (preset === "month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(m.toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return salesRecords.filter((r) => {
      const rawDate = r.date;
      const recordDate = rawDate ? String(rawDate).split(/[T ]/)[0] : "";

      // Date Range Filter
      if (startDate && recordDate && recordDate < startDate) return false;
      if (endDate && recordDate && recordDate > endDate) return false;

      // Department Filter
      if (departmentFilter !== "all" && r.deptKey !== departmentFilter) {
        return false;
      }

      // Settlement Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "settled" && !r.isSettled) return false;
        if (statusFilter === "open_tabs" && r.isSettled) return false;
      }

      // Payment Method Filter
      const method = (r.payment_method || "cash").toLowerCase();
      if (paymentFilter !== "all") {
        if (paymentFilter === "cash" && method !== "cash") return false;
        if (
          paymentFilter === "digital" &&
          method !== "card" &&
          method !== "telebirr" &&
          method !== "cbe" &&
          method !== "mobile_money"
        )
          return false;
        if (paymentFilter === "credit" && method !== "credit") return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = String(r.code || "").toLowerCase();
        const customer = String(r.customer || "").toLowerCase();
        const tableOrRoom = String(r.tableOrRoom || "").toLowerCase();
        const staff = String(r.staff || "").toLowerCase();
        const methodStr = String(r.payment_method || "").toLowerCase();
        const dept = String(r.department || "").toLowerCase();

        return (
          code.includes(q) ||
          customer.includes(q) ||
          tableOrRoom.includes(q) ||
          staff.includes(q) ||
          methodStr.includes(q) ||
          dept.includes(q)
        );
      }

      return true;
    });
  }, [salesRecords, startDate, endDate, departmentFilter, statusFilter, paymentFilter, searchQuery]);

  // Aggregate Metrics (Strictly Earned Paid Money)
  const metrics = useMemo(() => {
    let roomPaidSales = 0;
    let posPaidSales = 0;
    let settledSales = 0;
    let floorTabsRevenue = 0;
    let cashSales = 0;
    let digitalSales = 0;
    let creditSales = 0;

    let roomCount = 0;
    let posCount = 0;
    let settledCount = 0;
    let floorTabsCount = 0;

    filteredRecords.forEach((r) => {
      const amt = Number(r.amount || 0);

      if (r.isSettled) {
        settledSales += amt;
        settledCount += 1;

        if (r.deptKey === "rooms") {
          roomPaidSales += amt;
          roomCount += 1;
        } else {
          posPaidSales += amt;
          posCount += 1;
        }

        const method = (r.payment_method || "cash").toLowerCase();
        if (method === "card" || method === "telebirr" || method === "cbe" || method === "mobile_money") {
          digitalSales += amt;
        } else if (method === "credit" || r.status === "credit_approved") {
          creditSales += amt;
        } else {
          cashSales += amt;
        }
      } else {
        floorTabsRevenue += amt;
        floorTabsCount += 1;
      }
    });

    return {
      totalEarnedRevenue: settledSales,
      totalGrossVolume: settledSales,
      roomSales: roomPaidSales,
      posSales: posPaidSales,
      settledSales,
      floorTabsRevenue,
      roomCount,
      posCount,
      settledCount,
      floorTabsCount,
      cashSales,
      digitalSales,
      creditSales,
      totalCount: settledCount,
    };
  }, [filteredRecords]);

  // Parse items helper for POS orders
  const parseItems = (order) => {
    if (!order) return [];
    let items = order.items || order.order_items || order.products || [];
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    if (Array.isArray(items) && items.length > 0) return items;
    return [];
  };

  const formatMoney = (val) => `${Number(val || 0).toLocaleString()} ETB`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
              WHOLE HOTEL FINANCIAL AUDIT
            </span>
            <span className="text-xs font-semibold text-slate-500">Rooms & Suites • Restaurant • Cafe • Bar</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            Whole-Hotel Sales & Revenue Ledger
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Consolidated hotel sales tracking: Room lodging receipts, dining & bar POS collections, and multi-channel payment settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSalesData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-600" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Printer className="h-4 w-4" />
            Print Master Ledger
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards: Whole Hotel Revenue Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Whole Hotel Earned Revenue"
          value={`${metrics.settledSales.toLocaleString()} ETB`}
          subtext={`Paid collections across ${metrics.settledCount} receipts (${metrics.roomCount} Rooms, ${metrics.posCount} POS)`}
          icon={Sparkles}
          color="text-amber-800"
          bg="bg-amber-50 border border-amber-200"
        />

        <StatCard
          title="Room Lodging Revenue"
          value={`${metrics.roomSales.toLocaleString()} ETB`}
          subtext={`${metrics.roomCount} paid bookings recorded`}
          icon={BedDouble}
          color="text-blue-700"
          bg="bg-blue-50 border border-blue-100"
        />

        <StatCard
          title="Restaurant & Bar POS Revenue"
          value={`${metrics.posSales.toLocaleString()} ETB`}
          subtext={`${metrics.posCount} paid receipts • (Unsettled Tabs: ${metrics.floorTabsRevenue.toLocaleString()} ETB)`}
          icon={UtensilsCrossed}
          color="text-emerald-700"
          bg="bg-emerald-50 border border-emerald-100"
        />

        <StatCard
          title="Settled Collections Breakdown"
          value={`${metrics.settledSales.toLocaleString()} ETB`}
          subtext={`Cash: ${metrics.cashSales.toLocaleString()} • Digital: ${metrics.digitalSales.toLocaleString()} • Credit: ${metrics.creditSales.toLocaleString()}`}
          icon={CreditCard}
          color="text-purple-700"
          bg="bg-purple-50 border border-purple-100"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Department Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 px-2">Department:</span>
            <button
              type="button"
              onClick={() => setDepartmentFilter("all")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                departmentFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Whole Hotel ({salesRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter("rooms")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                departmentFilter === "rooms"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" />
              Rooms & Suites ({salesRecords.filter((r) => r.deptKey === "rooms").length})
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter("pos")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                departmentFilter === "pos"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Restaurant, Cafe & Bar ({salesRecords.filter((r) => r.deptKey === "pos").length})
            </button>
          </div>

          {/* Settlement Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 px-2">Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                statusFilter === "all" ? "bg-slate-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("settled")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                statusFilter === "settled" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Settled / Paid
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("open_tabs")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                statusFilter === "open_tabs" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3 w-3" />
              Pending / Floor Tabs
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyDatePreset(preset.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  datePreset === preset.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("custom");
              }}
              className="bg-transparent font-medium text-slate-700 outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("custom");
              }}
              className="bg-transparent font-medium text-slate-700 outline-none"
            />
          </div>
        </div>

        {/* Search & Channel Filters */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Code, Guest name, Room #, Table, or Payment method..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Channels (Cash, Digital, Credit)</option>
              <option value="cash">Cash Only</option>
              <option value="digital">Digital (Telebirr, CBE, Card)</option>
              <option value="credit">VIP Credit Tabs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Recorded Hotel Sales & Receipts</h3>
            <p className="text-xs text-slate-500">
              Showing {filteredRecords.length} transaction{filteredRecords.length === 1 ? "" : "s"} across selected departments
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mr-2" />
            <span>Loading Multi-Department Sales...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No Sales Transactions Found</p>
            <p className="text-xs text-slate-400 mt-1">
              No transactions matched your selected department, date range, or payment filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Ref / Code</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4">Room / Table</th>
                  <th className="px-5 py-4">Guest / Staff</th>
                  <th className="px-5 py-4">Payment Channel</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const rawDate = r.date;
                  const dateStr = rawDate ? new Date(rawDate).toLocaleDateString() : "—";
                  const timeStr = rawDate
                    ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—";

                  const method = (r.payment_method || "cash").toLowerCase();
                  const isRoom = r.type === "room";

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {r.code}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold border ${
                              isRoom
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {isRoom ? <BedDouble className="h-3 w-3" /> : <UtensilsCrossed className="h-3 w-3" />}
                            {r.department}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase border ${
                              r.isSettled || isRoom
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {r.isSettled || isRoom ? (
                              <>
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Settled
                              </>
                            ) : (
                              <>
                                <Clock className="h-2.5 w-2.5" />
                                Floor Tab
                              </>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p className="font-semibold text-slate-800">{dateStr}</p>
                        <p className="text-slate-400">{timeStr}</p>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-800">
                        {r.tableOrRoom}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-700">
                        <p className="font-bold text-slate-900">{r.customer}</p>
                        <p className="text-[10px] text-slate-400">Staff: {r.staff}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                            method === "card"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : method === "mobile_money" || method === "telebirr" || method === "cbe"
                              ? "border-purple-200 bg-purple-50 text-purple-700"
                              : method === "credit"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <CreditCard className="h-3 w-3" />
                          {r.payment_method}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-slate-900 font-mono text-sm">
                        {Number(r.amount || 0).toLocaleString()} ETB
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(r)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINTABLE AREA (HIDDEN EXCEPT WHEN PRINTING) */}
      <div id="finance-sales-printable-area" className="hidden print:block p-8 bg-white text-slate-900">
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight">KASINA HOTEL & SUITES</h1>
          <p className="text-xs text-slate-600 font-medium">Whole-Hotel Master Sales & Revenue Audit Ledger</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Period: {startDate || "All Time"} to {endDate || "All Time"} • Filter: {departmentFilter.toUpperCase()} • Generated: {new Date().toLocaleString()}
          </p>
        </div>

        <div className="my-6 grid grid-cols-4 gap-4 border border-slate-200 p-4 text-xs">
          <div>
            <span className="text-slate-500 block">Total Hotel Revenue</span>
            <span className="font-bold text-base">{metrics.totalGrossVolume.toLocaleString()} ETB</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{metrics.totalCount} transactions total</span>
          </div>
          <div>
            <span className="text-slate-500 block">Rooms Lodging</span>
            <span className="font-bold text-base text-blue-700">{metrics.roomSales.toLocaleString()} ETB</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{metrics.roomCount} guest bookings</span>
          </div>
          <div>
            <span className="text-slate-500 block">Restaurant & Bar POS</span>
            <span className="font-bold text-base text-emerald-700">{metrics.posSales.toLocaleString()} ETB</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{metrics.posCount} orders</span>
          </div>
          <div>
            <span className="text-slate-500 block">Settled Collections</span>
            <span className="font-bold text-base text-purple-700">{metrics.settledSales.toLocaleString()} ETB</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Cash: {metrics.cashSales.toLocaleString()} ETB</span>
          </div>
        </div>

        <table className="w-full text-left text-xs border border-slate-200">
          <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase">
            <tr>
              <th className="p-2">Code</th>
              <th className="p-2">Department</th>
              <th className="p-2">Guest / Table</th>
              <th className="p-2">Channel</th>
              <th className="p-2 text-right">Amount (ETB)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRecords.map((r) => (
              <tr key={r.id}>
                <td className="p-2 font-mono font-bold">{r.code}</td>
                <td className="p-2">{r.department}</td>
                <td className="p-2">{r.customer} ({r.tableOrRoom})</td>
                <td className="p-2 uppercase">{r.payment_method}</td>
                <td className="p-2 text-right font-bold">{Number(r.amount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AUDIT RECEIPT / BILL DETAILS MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">
                  {selectedRecord.type === "room" ? "Hotel Room Booking Receipt" : "Restaurant & Bar Bill"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-200">
                <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">KASINA HOTEL</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedRecord.type === "room" ? "Official Lodging Payment Receipt" : "Customer Bill & Sales Receipt"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Ref: {selectedRecord.code} • {selectedRecord.date ? new Date(selectedRecord.date).toLocaleString() : ""}
                </p>
              </div>

              {/* Detail fields */}
              {selectedRecord.type === "room" ? (
                /* ROOM LODGING DETAILS */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Guest Name:</span>
                      <span className="font-bold text-slate-800">{selectedRecord.customer}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Guest Phone:</span>
                      <span className="font-bold text-slate-800">{selectedRecord.customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Assigned Room:</span>
                      <span className="font-bold text-blue-700">Room #{selectedRecord.raw.room_number || "Suite"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Stay Duration:</span>
                      <span className="font-bold text-slate-800">{selectedRecord.raw.total_nights || 1} Night(s)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Check-in Date:</span>
                      <span className="font-bold text-slate-800">{selectedRecord.raw.check_in_date || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Check-out Date:</span>
                      <span className="font-bold text-slate-800">{selectedRecord.raw.check_out_date || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Payment Method:</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedRecord.payment_method}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Settlement Status:</span>
                      <span className={`font-bold uppercase ${selectedRecord.isSettled ? "text-emerald-700" : "text-amber-700"}`}>
                        {selectedRecord.isSettled ? "Settled / Paid" : "Pending Payment"}
                      </span>
                    </div>
                  </div>

                  {selectedRecord.raw.special_requests && (
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-[11px] text-slate-600">
                      <span className="font-bold block text-slate-500">Special Notes:</span>
                      {selectedRecord.raw.special_requests}
                    </div>
                  )}
                </div>
              ) : (
                /* POS DINING DETAILS */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Table:</span>
                      <span className="font-bold text-slate-800">{selectedRecord.tableOrRoom}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Staff / Cashier:</span>
                      <span className="font-bold text-slate-800">{selectedRecord.staff}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Payment Method:</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedRecord.payment_method}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status:</span>
                      <span className="font-bold text-emerald-700 capitalize">{selectedRecord.status}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="border-t border-b border-slate-100 py-3 space-y-2">
                    <div className="flex justify-between font-bold text-slate-400 uppercase text-[10px]">
                      <span>Item & Qty</span>
                      <span>Amount</span>
                    </div>
                    {parseItems(selectedRecord.raw).length === 0 ? (
                      <p className="text-slate-400 italic">No itemized breakdown recorded</p>
                    ) : (
                      parseItems(selectedRecord.raw).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-800 font-medium">
                          <span>
                            {item.name || item.product_name} <span className="text-slate-400">x{item.quantity || 1}</span>
                          </span>
                          <span>
                            {Number(item.subtotal || (item.price * (item.quantity || 1)) || 0).toLocaleString()} ETB
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Total Summary */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-slate-600">
                <div className="flex justify-between text-base font-black text-slate-900">
                  <span>Total Settled:</span>
                  <span className="text-emerald-700 font-mono">{Number(selectedRecord.amount || 0).toLocaleString()} ETB</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceSalesPage;
