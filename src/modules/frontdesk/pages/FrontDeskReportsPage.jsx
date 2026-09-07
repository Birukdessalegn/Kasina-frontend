import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  BedDouble,
  DollarSign,
  Calendar,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  PieChart,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  RefreshCw,
  Wallet,
  Sparkles
} from "lucide-react";
import { getReservationReports } from "../services/frontdeskApi";

export default function FrontDeskReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month"); // 'today' | 'week' | 'month' | 'custom'
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [reportData, setReportData] = useState({
    metrics: {},
    categoryStats: [],
    paymentStats: [],
  });

  const loadReports = async () => {
    try {
      setLoading(true);
      let startDate = null;
      let endDate = null;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      if (period === "today") {
        startDate = todayStr;
        endDate = todayStr;
      } else if (period === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
        startDate = weekAgo;
        endDate = todayStr;
      } else if (period === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
        startDate = monthAgo;
        endDate = todayStr;
      } else if (period === "custom") {
        startDate = customStart || null;
        endDate = customEnd || null;
      }

      const res = await getReservationReports({ startDate, endDate });
      if (res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error("Failed to load front desk reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [period]);

  const metrics = reportData.metrics || {};
  const categoryStats = reportData.categoryStats || [];
  const paymentStats = reportData.paymentStats || [];

  // Total payment sum for percentage calculation
  const totalPaymentSum = useMemo(() => {
    return paymentStats.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
  }, [paymentStats]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <BarChart3 size={22} />
            </div>
            Front Desk & Room Reports
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time occupancy analytics, room revenue breakdown, and payment settlement audit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Date Filters */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            {[
              { id: "today", label: "Today" },
              { id: "week", label: "7 Days" },
              { id: "month", label: "30 Days" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  period === p.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <Printer size={14} />
            Print Report
          </button>

          <button
            onClick={loadReports}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 shadow-sm transition"
            title="Refresh analytics"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Room Revenue */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Room Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {Number(metrics.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
            <TrendingUp size={13} />
            <span>Collected: {Number(metrics.collected_revenue || 0).toLocaleString()} ETB</span>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Occupancy Rate</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BedDouble size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {metrics.occupancy_rate || 0}%
          </p>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Based on {metrics.total_rooms || 0} rooms in inventory
          </div>
        </div>

        {/* RevPAR */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">RevPAR</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {Number(metrics.rev_par || 0).toFixed(2)} ETB
          </p>
          <div className="mt-2 text-[11px] text-purple-600 font-semibold">
            Revenue per available room
          </div>
        </div>

        {/* Average Daily Rate (ADR) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Daily Rate (ADR)</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Wallet size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {Number(metrics.average_daily_rate || 0).toFixed(2)} ETB
          </p>
          <div className="mt-2 text-[11px] text-amber-700 font-semibold">
            Avg rate per occupied room night
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
          <span className="text-slate-400 font-medium">Active Stays:</span>
          <p className="mt-1 text-lg font-black text-blue-600">{metrics.active_stays || 0} In-House</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
          <span className="text-slate-400 font-medium">Completed Stays:</span>
          <p className="mt-1 text-lg font-black text-emerald-600">{metrics.completed_stays || 0} Checked-Out</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
          <span className="text-slate-400 font-medium">Room Nights Sold:</span>
          <p className="mt-1 text-lg font-black text-slate-900">{metrics.total_nights_sold || 0} Nights</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
          <span className="text-slate-400 font-medium">Average Stay:</span>
          <p className="mt-1 text-lg font-black text-purple-600">{metrics.average_stay_duration || 0} Nights/Guest</p>
        </div>
      </div>

      {/* Two Column Section: Category Breakdown + Payment Settlement */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Room Category Performance */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Room Category Performance</h3>
              <p className="text-xs text-slate-500">Breakdown of bookings and revenue by room tier</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
              {categoryStats.length} Room Types
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="pb-3">Room Type</th>
                  <th className="pb-3">Base Rate</th>
                  <th className="pb-3">Bookings</th>
                  <th className="pb-3">Nights Sold</th>
                  <th className="pb-3 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {categoryStats.map((cat) => (
                  <tr key={cat.room_type_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 font-bold text-slate-900">{cat.room_type_name}</td>
                    <td className="py-3 text-slate-600">{Number(cat.base_rate).toFixed(2)} ETB</td>
                    <td className="py-3">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 font-bold">
                        {cat.total_bookings} Stays
                      </span>
                    </td>
                    <td className="py-3 text-slate-700 font-semibold">{cat.nights_sold} Nights</td>
                    <td className="py-3 text-right font-extrabold text-slate-900">
                      {Number(cat.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods Audit */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Payment Methods</h3>
                <p className="text-xs text-slate-500">Collected revenue by channel</p>
              </div>
              <CreditCard size={18} className="text-slate-400" />
            </div>

            <div className="mt-4 space-y-4">
              {paymentStats.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No payment records in selected period</p>
              ) : (
                paymentStats.map((pay) => {
                  const amt = Number(pay.total_amount || 0);
                  const pct = totalPaymentSum > 0 ? Math.round((amt / totalPaymentSum) * 100) : 0;
                  return (
                    <div key={pay.payment_method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 capitalize">
                          {pay.payment_method === "telebirr" ? "📱 Telebirr" : pay.payment_method === "cbe" ? "🏦 CBE Birr" : `💵 ${pay.payment_method}`}
                        </span>
                        <div className="text-right">
                          <span className="font-black text-slate-900">{amt.toLocaleString()} ETB</span>
                          <span className="text-slate-400 text-[11px] ml-1.5">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pay.payment_method === "telebirr"
                              ? "bg-sky-500"
                              : pay.payment_method === "cash"
                              ? "bg-emerald-500"
                              : "bg-indigo-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-200/80 text-xs">
            <span className="text-slate-500 block font-medium">Total Channel Settlements:</span>
            <span className="text-base font-black text-slate-900">
              {totalPaymentSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
