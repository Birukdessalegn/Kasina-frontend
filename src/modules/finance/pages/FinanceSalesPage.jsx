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
  const [paymentFilter, setPaymentFilter] = useState("all"); // "all" | "cash" | "digital" | "credit"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePreset, setDatePreset] = useState("all");

  // Selected Transaction for Modal View
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fetch Restaurant & Bar POS Sales Data
  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch POS orders and completed payments
      const [posRes, paymentsRes] = await Promise.all([
        api("/pos/orders").catch(() => api("/orders").catch(() => ({ orders: [] }))),
        api("/payments").catch(() => ([])),
      ]);

      const rawOrders = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const records = [];

      rawOrders.forEach((o) => {
        const isSettled =
          o.payment_status === "paid" ||
          o.payment_status === "credit_approved" ||
          o.status === "completed" ||
          o.status === "served";

        const amt = Number(o.total || o.total_amount || 0);

        if (amt > 0) {
          records.push({
            id: `pos-${o.id || o.order_id}`,
            rawId: o.id || o.order_id,
            type: "pos",
            code: o.order_number || `#ORD-${o.id}`,
            department: "Restaurant & Bar POS",
            deptKey: "pos",
            customer: o.customer_name || o.guest_name || "Walk-in Guest",
            customerPhone: o.customer_phone || "-",
            tableOrRoom: o.table_number ? `Table #${o.table_number}` : o.table_id ? `Table #${o.table_id}` : "Bar / Takeout",
            staff: o.cashier_name || o.waiter_name || o.user_name || "Cashier Staff",
            payment_method: (o.payment_method || "cash").toLowerCase(),
            amount: amt,
            date: o.created_at || o.createdAt || o.date,
            status: isSettled ? "paid" : (o.status || "preparing"),
            isSettled: isSettled,
            raw: o,
          });
        }
      });

      // Sort by newest date descending
      records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setSalesRecords(records);
    } catch (err) {
      console.error("Failed to load sales data:", err);
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

      // Status Filter
      if (departmentFilter !== "all") {
        if (departmentFilter === "settled" && !r.isSettled) return false;
        if (departmentFilter === "open_tabs" && r.isSettled) return false;
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

        return (
          code.includes(q) ||
          customer.includes(q) ||
          tableOrRoom.includes(q) ||
          staff.includes(q) ||
          methodStr.includes(q)
        );
      }

      return true;
    });
  }, [salesRecords, startDate, endDate, departmentFilter, paymentFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalGrossVolume = 0;
    let settledSales = 0;
    let floorTabsRevenue = 0;
    let cashSales = 0;
    let digitalSales = 0;
    let creditSales = 0;

    let settledCount = 0;
    let floorTabsCount = 0;

    filteredRecords.forEach((r) => {
      const amt = Number(r.amount || 0);
      totalGrossVolume += amt;

      if (r.isSettled) {
        settledSales += amt;
        settledCount += 1;
      } else {
        floorTabsRevenue += amt;
        floorTabsCount += 1;
      }

      const method = (r.payment_method || "cash").toLowerCase();
      if (r.isSettled) {
        if (method === "card" || method === "telebirr" || method === "cbe" || method === "mobile_money") {
          digitalSales += amt;
        } else if (method === "credit" || r.status === "credit_approved") {
          creditSales += amt;
        } else {
          cashSales += amt;
        }
      }
    });

    return {
      totalGrossVolume,
      settledSales,
      floorTabsRevenue,
      settledCount,
      floorTabsCount,
      cashSales,
      digitalSales,
      creditSales,
      totalCount: filteredRecords.length,
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
    if (order.items_summary) return [{ name: order.items_summary, quantity: 1, price: order.total }];
    return [];
  };

  const handlePrint = () => {
    printReportArea("finance-sales-printable-area", "Restaurant & Bar Sales Ledger Report");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full">
              RESTAURANT & BAR POS AUDIT
            </span>
            <span className="text-xs font-semibold text-slate-500">Dining • Bar • Takeout</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            POS Sales & Revenue Ledger
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Audit restaurant and bar sales transactions, cashier collections, occupied table tabs, and payment channels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSalesData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Printer className="h-4 w-4" />
            Print POS Ledger
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards: POS Sales Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total POS Sales Volume"
          value={`${metrics.totalGrossVolume.toLocaleString()} ETB`}
          subtext={`Across ${metrics.totalCount} dining orders in DB`}
          icon={Sparkles}
          color="text-amber-800"
          bg="bg-amber-50 border border-amber-200"
        />

        <StatCard
          title="Settled Cash & Paid Sales"
          value={`${metrics.settledSales.toLocaleString()} ETB`}
          subtext={`${metrics.settledCount} paid restaurant & bar orders`}
          icon={UtensilsCrossed}
          color="text-emerald-700"
          bg="bg-emerald-50 border border-emerald-100"
        />

        <StatCard
          title="Active Floor Tabs (Dining)"
          value={`${metrics.floorTabsRevenue.toLocaleString()} ETB`}
          subtext={`${metrics.floorTabsCount} tables currently in service`}
          icon={Clock}
          color="text-purple-700"
          bg="bg-purple-50 border border-purple-100"
        />

        <StatCard
          title="Cash Collections"
          value={`${metrics.cashSales.toLocaleString()} ETB`}
          subtext={`Digital: ${metrics.digitalSales.toLocaleString()} ETB • Credit: ${metrics.creditSales.toLocaleString()} ETB`}
          icon={CreditCard}
          color="text-blue-700"
          bg="bg-blue-50 border border-blue-100"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Order Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 px-2">Filter Orders:</span>
            <button
              type="button"
              onClick={() => setDepartmentFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                departmentFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Orders ({salesRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter("settled")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                departmentFilter === "settled"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Settled / Paid ({salesRecords.filter((r) => r.isSettled).length})
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter("open_tabs")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                departmentFilter === "open_tabs"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Active Floor Tabs ({salesRecords.filter((r) => !r.isSettled).length})
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
          <p className="text-xs text-slate-600 font-medium">Restaurant & Bar POS Sales Audit Ledger</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Period: {startDate || "All Time"} to {endDate || "All Time"} • Filter: {departmentFilter.toUpperCase()} • Generated: {new Date().toLocaleString()}
          </p>
        </div>

        <div className="my-6 grid grid-cols-4 gap-4 border border-slate-200 p-4 text-xs">
          <div>
            <span className="text-slate-500 block">Total Order Volume</span>
            <span className="font-bold text-base">{metrics.totalGrossVolume.toLocaleString()} ETB</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{metrics.totalCount} orders total</span>
          </div>
          <div>
            <span className="text-slate-500 block">Settled / Paid</span>
            <span className="font-bold text-base">{metrics.settledSales.toLocaleString()} ETB</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{metrics.settledCount} paid orders</span>
          </div>
          <div>
            <span className="text-slate-500 block">Open Floor Tabs</span>
            <span className="font-bold text-base">{metrics.floorTabsRevenue.toLocaleString()} ETB</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{metrics.floorTabsCount} in service</span>
          </div>
          <div>
            <span className="text-slate-500 block">Cash Collected</span>
            <span className="font-bold text-base">{metrics.cashSales.toLocaleString()} ETB</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Digital: {metrics.digitalSales.toLocaleString()} ETB</span>
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
                      <span className="font-bold text-emerald-700 uppercase">100% Paid</span>
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
