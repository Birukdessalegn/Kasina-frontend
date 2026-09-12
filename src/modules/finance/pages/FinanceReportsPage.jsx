import { printReportArea } from "../../../utils/printHelper";
import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Printer,
  Search,
  RefreshCw,
  CalendarDays,
  Filter,
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  BedDouble,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";
import api from "../../../services/api";

function ReportStatCard({ title, value, description, icon: Icon, colorClass, bgClass }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {value}
          </h3>
          {description && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {description}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgClass} ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FinanceReportsPage() {
  const [orders, setOrders] = useState([]);
  const [roomReservations, setRoomReservations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all financial data streams in parallel across whole hotel
      const [posRes, roomsRes, expensesRes, purchasesRes] = await Promise.all([
        api("/pos/orders").catch(() => api("/orders").catch(() => ({ orders: [] }))),
        api("/room-reservations").catch(() => api("/rooms/reservations").catch(() => ([]))),
        api("/expenses").catch(() => []),
        api("/purchasing").catch(() => ({ purchases: [] })),
      ]);

      const posList = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const roomsList = roomsRes.reservations || roomsRes.data || (Array.isArray(roomsRes) ? roomsRes : []);
      const expList = Array.isArray(expensesRes) ? expensesRes : expensesRes.expenses || expensesRes.data || [];
      const purList = purchasesRes.purchases || purchasesRes.data || (Array.isArray(purchasesRes) ? purchasesRes : []);

      setOrders(posList);
      setRoomReservations(roomsList);
      setExpenses(expList);
      setPurchases(purList);
    } catch (err) {
      console.error("Failed to fetch financial report data:", err);
      setError(err.message || "Failed to load financial records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Consolidate all financial transactions into a single audit stream
  const ledgerTransactions = useMemo(() => {
    const stream = [];

    // 1. Hotel Room Lodging Income
    roomReservations.forEach((r) => {
      const rawDate = r.created_at || r.check_in_date;
      const dateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const amt = Number(r.paid_amount || r.total_amount || 0);

      if (amt > 0 || r.payment_status === "paid") {
        stream.push({
          id: `ROOM-${r.id || r.reservation_code}`,
          type: "Room Revenue",
          department: "Hotel Room Lodging",
          title: `Room #${r.room_number || "Suite"} - ${r.guest_name || "Guest"} (${r.total_nights || 1}N)`,
          category: "Room Lodging Income",
          paymentMethod: (r.payment_method || "telebirr").toLowerCase(),
          amount: amt,
          isIncome: true,
          date: dateStr,
          time: timeStr,
          status: "Verified",
          raw: r,
        });
      }
    });

    // 2. POS Restaurant & Bar Revenue Transactions
    orders.forEach((o) => {
      const rawDate = o.created_at || o.createdAt || o.date;
      const dateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const amt = Number(o.total || o.total_amount || o.amount || 0);

      const isPaid = o.payment_status === "paid" || o.status === "completed" || o.status === "served";
      const isCredit = o.payment_method === "credit" || o.payment_status === "credit_pending";

      if (amt > 0) {
        stream.push({
          id: `POS-${o.id || o.order_id}`,
          type: "POS Revenue",
          department: "Restaurant & Bar POS",
          title: `POS Order #${o.id || o.order_id} (${o.table_number ? `Table #${o.table_number}` : "Bar / Takeout"})`,
          category: "Food & Beverage Sales",
          paymentMethod: (o.payment_method || "cash").toLowerCase(),
          amount: amt,
          isIncome: true,
          date: dateStr,
          time: timeStr,
          status: isPaid ? "Verified" : isCredit ? "Credit Pending" : "Pending",
          raw: o,
        });
      }
    });

    // 3. Operating Expense Transactions
    expenses.forEach((e) => {
      const rawDate = e.date || e.created_at || e.createdAt;
      const dateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const amt = Number(e.amount || e.total || 0);

      stream.push({
        id: `EXP-${e.id}`,
        type: "Expense",
        department: "Operations",
        title: e.description || e.title || e.category || "Operating Expense",
        category: e.category || "General Expense",
        paymentMethod: (e.payment_method || e.paymentMethod || "cash").toLowerCase(),
        amount: amt,
        isIncome: false,
        date: dateStr,
        time: timeStr,
        status: e.status === "approved" || e.status === "paid" ? "Verified" : "Logged",
        raw: e,
      });
    });

    // 4. Purchase Order Expenses
    purchases.forEach((p) => {
      const rawDate = p.created_at || p.createdAt || p.date;
      const dateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const amt = Number(p.total || p.amount || p.total_amount || 0);

      stream.push({
        id: `PUR-${p.id}`,
        type: "Purchase",
        department: "Procurement",
        title: `Supplier PO #${p.po_number || p.id} (${p.supplier_name || "Supplier"})`,
        category: "Stock Purchase",
        paymentMethod: (p.payment_status || "credit").toLowerCase(),
        amount: amt,
        isIncome: false,
        date: dateStr,
        time: timeStr,
        status: p.status === "received" ? "Verified" : "Pending Supply",
        raw: p,
      });
    });

    return stream.sort((a, b) => new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time));
  }, [roomReservations, orders, expenses, purchases]);

  // Filter transactions by date range, search & type
  const filteredLedger = useMemo(() => {
    return ledgerTransactions.filter((tx) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        tx.id.toLowerCase().includes(query) ||
        tx.title.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query) ||
        tx.department.toLowerCase().includes(query) ||
        tx.paymentMethod.toLowerCase().includes(query);

      const matchesDate =
        (!startDate || (tx.date && tx.date >= startDate)) &&
        (!endDate || (tx.date && tx.date <= endDate));

      const matchesType =
        typeFilter === "All" ||
        (typeFilter === "Revenue" && tx.isIncome) ||
        (typeFilter === "Rooms" && tx.type === "Room Revenue") ||
        (typeFilter === "POS" && tx.type === "POS Revenue") ||
        (typeFilter === "Expense" && !tx.isIncome);

      return matchesSearch && matchesDate && matchesType;
    });
  }, [ledgerTransactions, search, startDate, endDate, typeFilter]);

  // Financial KPI Metrics Calculation
  const totalRoomRevenue = useMemo(() => {
    return filteredLedger
      .filter((tx) => tx.type === "Room Revenue" && tx.status === "Verified")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  const totalPosRevenue = useMemo(() => {
    return filteredLedger
      .filter((tx) => tx.type === "POS Revenue" && tx.status === "Verified")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  const totalRevenue = useMemo(() => {
    return totalRoomRevenue + totalPosRevenue;
  }, [totalRoomRevenue, totalPosRevenue]);

  const totalExpenses = useMemo(() => {
    return filteredLedger
      .filter((tx) => !tx.isIncome)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  const netProfit = totalRevenue - totalExpenses;

  const totalDigitalSales = useMemo(() => {
    return filteredLedger
      .filter((tx) => tx.isIncome && (tx.paymentMethod.includes("mobile") || tx.paymentMethod.includes("card") || tx.paymentMethod.includes("telebirr") || tx.paymentMethod.includes("cbe")))
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  const handlePrint = () => {
    printReportArea("finance-reports-printable-area", "Whole Hotel Revenue & Expense Audit Report");
  };

  return (
    <div className="space-y-6">
      {/* SCREEN HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-xs">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                ALL HOTEL REVENUE INCLUDED
              </span>
              <span className="text-xs font-semibold text-slate-500">Rooms + Dining + Bar</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              Executive Financial Audit & Profit Report
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Real-time financial ledger uniting Hotel Room Lodging receipts, POS sales, operating expenses, and audited net cashflow.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFinancialData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            Print Financial Audit
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="Whole Hotel Gross Revenue"
          value={loading ? "..." : `${totalRevenue.toLocaleString()} ETB`}
          description={`Rooms: ${totalRoomRevenue.toLocaleString()} ETB | F&B: ${totalPosRevenue.toLocaleString()} ETB`}
          icon={Sparkles}
          colorClass="text-amber-700"
          bgClass="bg-amber-50"
        />
        <ReportStatCard
          title="Operating Expenses & Stock"
          value={loading ? "..." : `${totalExpenses.toLocaleString()} ETB`}
          description="Operational costs & supplier POs"
          icon={TrendingDown}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
        <ReportStatCard
          title="Net Cashflow Margin"
          value={loading ? "..." : `${netProfit.toLocaleString()} ETB`}
          description={netProfit >= 0 ? "Positive Net Cashflow" : "Net Deficit"}
          icon={netProfit >= 0 ? ArrowUpRight : ArrowDownRight}
          colorClass={netProfit >= 0 ? "text-emerald-600" : "text-red-600"}
          bgClass={netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}
        />
        <ReportStatCard
          title="Digital & Mobile Collections"
          value={loading ? "..." : `${totalDigitalSales.toLocaleString()} ETB`}
          description="Telebirr, CBE & Card payments"
          icon={CreditCard}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
      </div>

      {/* FILTER & TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Ref ID, category, department, or payment method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium outline-none transition focus:border-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            />
            <span className="text-xs font-bold text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="All">All Transactions (Ledger Stream)</option>
              <option value="Revenue">All Hotel Revenue Only</option>
              <option value="Rooms">🏨 Room Lodging Income Only</option>
              <option value="POS">🍽️ Food & Bar POS Sales Only</option>
              <option value="Expense">Expenses & Purchases Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE FINANCIAL AUDIT REPORT */}
      <div id="finance-reports-printable-area" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        {/* REPORT HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">KASINA HOTEL & SUITES</h2>
            <p className="text-xs font-bold text-slate-500 uppercase">Executive Multi-Department Financial Audit Report</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Period: <span className="text-slate-900">{startDate || "All Time"} to {endDate || "All Time"}</span></p>
            <p className="text-xs text-slate-400">Total Ledger Entries: {filteredLedger.length}</p>
          </div>
        </div>

        {/* EXECUTIVE FINANCIAL SUMMARY (Printed onto paper/PDF) */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Whole Hotel Revenue</p>
            <p className="mt-1 text-xl font-black text-emerald-700 font-mono">
              {totalRevenue.toLocaleString()} ETB
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Rooms + Food/Bar POS</p>
          </div>

          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Operating Outflow</p>
            <p className="mt-1 text-xl font-black text-red-600 font-mono">
              {totalExpenses.toLocaleString()} ETB
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Expenses & stock supplies</p>
          </div>

          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Net Cash Margin</p>
            <p className={`mt-1 text-xl font-black font-mono ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {netProfit.toLocaleString()} ETB
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">{netProfit >= 0 ? "Positive Net Cashflow" : "Net Deficit"}</p>
          </div>

          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Digital / Mobile Total</p>
            <p className="mt-1 text-xl font-black text-indigo-700 font-mono">
              {totalDigitalSales.toLocaleString()} ETB
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Telebirr, CBE & Card</p>
          </div>
        </div>

        {/* FINANCIAL LEDGER STREAM TABLE */}
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Consolidated Financial Revenue & Expense Ledger Stream
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 font-extrabold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ref ID</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Transaction Details</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Date & Time</th>
                  <th className="px-4 py-3 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400">Loading financial ledger records...</td>
                  </tr>
                ) : filteredLedger.length > 0 ? (
                  filteredLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{tx.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          tx.type === "Room Revenue"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : tx.type === "POS Revenue"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {tx.type === "Room Revenue" && <BedDouble className="h-3 w-3" />}
                          {tx.type === "POS Revenue" && <UtensilsCrossed className="h-3 w-3" />}
                          {tx.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{tx.title}</td>
                      <td className="px-4 py-3 uppercase font-semibold text-slate-700">{tx.paymentMethod.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          tx.status === "Verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">{tx.date} {tx.time}</td>
                      <td className={`px-4 py-3 text-right font-black text-sm font-mono ${
                        tx.isIncome ? "text-emerald-700 bg-emerald-50/40" : "text-red-700 bg-red-50/40"
                      }`}>
                        {tx.isIncome ? "+" : "-"}{tx.amount.toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400 italic">No financial transactions match your selected search or date range.</td>
                  </tr>
                )}
              </tbody>
              {filteredLedger.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                      🏨 Room Lodging Subtotal:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-black text-blue-800 font-mono">
                      +{totalRoomRevenue.toLocaleString()} ETB
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-4 py-2.5 text-right text-xs uppercase tracking-wider">
                      🍽️ Food & Bar POS Subtotal:
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-black text-emerald-800 font-mono">
                      +{totalPosRevenue.toLocaleString()} ETB
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-200">
                    <td colSpan="6" className="px-4 py-2.5 text-right text-xs uppercase tracking-wider">
                      👑 Whole Hotel Revenue Total:
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-black text-amber-900 font-mono">
                      +{totalRevenue.toLocaleString()} ETB
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-4 py-2.5 text-right text-xs uppercase tracking-wider">
                      Total Expenses & Purchases:
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-black text-red-700 font-mono">
                      -{totalExpenses.toLocaleString()} ETB
                    </td>
                  </tr>
                  <tr className="bg-slate-200/90 font-black text-slate-950 border-t border-slate-300">
                    <td colSpan="6" className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                      NET CASHFLOW MARGIN:
                    </td>
                    <td className={`px-4 py-3 text-right text-base font-black font-mono ${netProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                      {netProfit.toLocaleString()} ETB
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* OFFICIAL EXECUTIVE PRINT FOOTER */}
        <div className="mt-10 pt-4 border-t-2 border-slate-900">
          <div className="flex justify-between items-center text-xs text-slate-900 font-bold">
            <div>
              <p className="font-extrabold uppercase">KASINA HOTEL & SUITES — FINANCIAL AUDIT STATEMENT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • Executive Financial & Fiscal Audit Report</p>
            </div>
            <div className="text-right">
              <p>Finance Officer / Accountant: ______________________</p>
              <p className="mt-2">General Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceReportsPage;
