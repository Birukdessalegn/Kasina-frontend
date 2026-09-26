import { useState, useMemo, useEffect } from "react";
import { TrendingUp } from "lucide-react";

export default function SmoothMonthlyRevenueChart({
  dashboardStats,
  orders = [],
  expenses = [],
  reservations = [],
  metrics = {},
  formatMoney = (v) => `${Number(v || 0).toLocaleString()} ETB`,
  externalTimeframe,
}) {
  const [chartTimeframe, setChartTimeframe] = useState("monthly"); // "daily" | "weekly" | "monthly"
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto-focus peak day if active day has 0 income
  useEffect(() => {
    if (trendData && trendData.length > 0) {
      const currentPoint = trendData[activeIdx];
      if (!currentPoint || currentPoint.income === 0) {
        let maxIdx = 0;
        let maxVal = 0;
        trendData.forEach((pt, idx) => {
          if (pt.income > maxVal) {
            maxVal = pt.income;
            maxIdx = idx;
          }
        });
        if (maxVal > 0) {
          setActiveIdx(maxIdx);
        }
      }
    }
  }, [trendData]);

  useEffect(() => {
    if (externalTimeframe === "today") {
      setChartTimeframe("daily");
      setActiveIdx(Math.min(5, 6));
    } else if (externalTimeframe === "week") {
      setChartTimeframe("weekly");
      setActiveIdx(Math.min(3, 3));
    } else if (externalTimeframe === "month" || externalTimeframe === "all") {
      setChartTimeframe("monthly");
      setActiveIdx(Math.min(8, 11));
    }
  }, [externalTimeframe]);

  const baseRevenue = metrics?.grossRevenue || 0;
  const baseExpenses = metrics?.totalExpenses || 0;
  const baseProfit = metrics?.netRevenue || 0;

  // Dynamic Trend Data Processing based on Selected Timeframe (Daily / Weekly / Monthly)
  const trendData = useMemo(() => {
    let points = [];
    let getPeriodKey = () => "";

    if (chartTimeframe === "daily") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      points = days.map((label, idx) => ({
        label,
        x: Math.round(40 + idx * (520 / (days.length - 1))),
      }));
      getPeriodKey = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
    } else if (chartTimeframe === "weekly") {
      const weeks = ["Wk 1", "Wk 2", "Wk 3", "Wk 4"];
      points = weeks.map((label, idx) => ({
        label,
        x: Math.round(50 + idx * (500 / (weeks.length - 1))),
      }));
      getPeriodKey = (d) => `Wk ${Math.min(Math.ceil(d.getDate() / 7), 4)}`;
    } else {
      // Monthly (Default)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      points = months.map((label, idx) => ({
        label,
        x: Math.round(35 + idx * (530 / (months.length - 1))),
      }));
      getPeriodKey = (d) => d.toLocaleDateString("en-US", { month: "short" });
    }

    const valMap = {};
    points.forEach((p) => {
      valMap[p.label] = 0;
    });

    // 1. Group real orders
    if (Array.isArray(orders) && orders.length > 0) {
      orders.forEach((ord) => {
        const isPaid =
          ord.status === "completed" ||
          ord.status === "paid" ||
          ord.payment_status === "paid" ||
          ord.is_paid === true;

        if (isPaid) {
          const dateStr = ord.created_at || ord.createdAt || ord.order_date || ord.date;
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const key = getPeriodKey(d);
              const amt = Number(ord.total_amount || ord.total || ord.grand_total || 0);
              if (valMap[key] !== undefined) {
                valMap[key] += amt;
              }
            }
          }
        }
      });
    }

    // 1b. Group room reservations
    if (Array.isArray(reservations) && reservations.length > 0) {
      reservations.forEach((res) => {
        if (res.status !== "cancelled") {
          const dateStr = res.created_at || res.check_in || res.checkInDate;
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const key = getPeriodKey(d);
              const amt = Number(res.total_price || res.total_amount || res.price || 0);
              if (valMap[key] !== undefined) {
                valMap[key] += amt;
              }
            }
          }
        }
      });
    }

    // 2. Or fallback to dashboardStats sales_chart
    const hasOrderData = Object.values(valMap).some((v) => v > 0);
    if (!hasOrderData && dashboardStats) {
      const chartList =
        dashboardStats.sales_chart ||
        dashboardStats.monthly_sales ||
        dashboardStats.weekly_sales ||
        dashboardStats.salesChart ||
        [];

      if (Array.isArray(chartList) && chartList.length > 0) {
        chartList.forEach((item) => {
          let key = item.label || item.day || item.month;
          if (!key && item.date) {
            const d = new Date(item.date);
            if (!isNaN(d.getTime())) key = getPeriodKey(d);
          }
          const amt = Number(item.sales || item.revenue || item.total || 0);
          if (key && valMap[key] !== undefined) {
            valMap[key] += amt;
          }
        });
      }
    }

    // 3. Fallback to active sales if total found is 0
    const totalFound = Object.values(valMap).reduce((s, v) => s + v, 0);
    if (totalFound === 0) {
      const todayAmt = Number(dashboardStats?.today_sales || dashboardStats?.todaySales || 0);
      const allTimeAmt = Number(
        dashboardStats?.total_sales ||
        dashboardStats?.total_revenue ||
        dashboardStats?.all_time_sales ||
        baseRevenue ||
        0
      );
      const activeAmt = todayAmt > 0 ? todayAmt : allTimeAmt;
      if (activeAmt > 0) {
        const todayKey = getPeriodKey(new Date());
        if (valMap[todayKey] !== undefined) {
          valMap[todayKey] = activeAmt;
        }
      }
    }

    const revenues = points.map((p) => valMap[p.label] || 0);
    const maxRev = Math.max(...revenues, 100);

    return points.map((p) => {
      const rev = valMap[p.label] || 0;
      const ratio = maxRev > 0 ? rev / maxRev : 0;
      const y = Math.round(135 - ratio * 95);

      return {
        ...p,
        income: rev,
        y,
      };
    });
  }, [orders, reservations, dashboardStats, chartTimeframe, baseRevenue]);

  const activePoint =
    trendData[activeIdx] ||
    trendData[Math.min(activeIdx, trendData.length - 1)] ||
    trendData[0];

  // Dynamic Bezier Spline Path Generator
  const pathD = useMemo(() => {
    if (!trendData || trendData.length === 0) return "";
    let d = `M ${trendData[0].x},${trendData[0].y}`;
    for (let i = 0; i < trendData.length - 1; i++) {
      const curr = trendData[i];
      const next = trendData[i + 1];
      const cpX = Math.round((curr.x + next.x) / 2);
      d += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
    }
    return d;
  }, [trendData]);

  const fillD = useMemo(() => {
    if (!trendData || trendData.length === 0) return "";
    const lastX = trendData[trendData.length - 1].x;
    return `${pathD} L ${lastX},135 L ${trendData[0].x},135 Z`;
  }, [pathD, trendData]);

  return (
    <div className="w-full rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/40 via-white to-white p-4 sm:p-6 shadow-xs space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-amber-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            {chartTimeframe === "daily"
              ? "Daily Sales & Revenue Trend"
              : chartTimeframe === "weekly"
              ? "Weekly Sales & Revenue Trend"
              : "Monthly Revenue Trend"}
          </h2>
          <p className="text-xs text-slate-500">
            Interactive smooth curve revenue analytics & period comparison
          </p>
        </div>

        {/* Timeframe Selector Buttons (Daily / Weekly / Monthly) */}
        <div className="flex items-center rounded-xl bg-amber-100/60 p-1 text-xs font-bold border border-amber-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setChartTimeframe("daily");
              setActiveIdx(Math.min(5, 6));
            }}
            className={`rounded-lg px-3 py-1 transition ${
              chartTimeframe === "daily"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-900 hover:text-slate-900 hover:bg-amber-200/50"
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => {
              setChartTimeframe("weekly");
              setActiveIdx(Math.min(3, 3));
            }}
            className={`rounded-lg px-3 py-1 transition ${
              chartTimeframe === "weekly"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-900 hover:text-slate-900 hover:bg-amber-200/50"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => {
              setChartTimeframe("monthly");
              setActiveIdx(Math.min(8, 11));
            }}
            className={`rounded-lg px-3 py-1 transition ${
              chartTimeframe === "monthly"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-900 hover:text-slate-900 hover:bg-amber-200/50"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Main Content Layout: Left Summary & Right Curve Chart */}
      <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 rounded-2xl bg-amber-50/30 p-3 sm:p-5 border border-amber-100">
        {/* Left Summary Box */}
        <div className="flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-amber-200/60 pb-3 xl:pb-0 xl:pr-6 xl:w-1/3 space-y-3">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              {chartTimeframe === "daily"
                ? "Average Daily Income"
                : chartTimeframe === "weekly"
                ? "Average Weekly Income"
                : "Average Monthly Income"}
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {formatMoney(trendData.reduce((s, p) => s + (p.income || 0), 0) || baseRevenue)}
            </p>

            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Real Revenue</span>
              <span className="text-slate-500 font-normal">• Live Synced</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Hover over any period point on the curve to inspect period income details.
          </div>
        </div>

        {/* Right Graph Container */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="relative w-full h-44 sm:h-56">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 160"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="amberWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Gradient Area Fill */}
              <path d={fillD} fill="url(#amberWaveGrad)" />

              {/* Smooth Spline Curve Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#d97706"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* X-Axis Base Line */}
              <line
                x1="30"
                y1="135"
                x2="570"
                y2="135"
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Vertical Guide Line for Active Period */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={activePoint.y}
                  x2={activePoint.x}
                  y2="135"
                  stroke="#d97706"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Data Points on Path */}
              {trendData.map((pt, idx) => {
                const isActive = idx === activeIdx;

                return (
                  <g
                    key={pt.label}
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => setActiveIdx(idx)}
                  >
                    {/* Invisible Larger Touch/Hover Target */}
                    <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                    {/* Point Outer Ring */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? "7" : "4"}
                      fill={isActive ? "#d97706" : "#ffffff"}
                      stroke="#d97706"
                      strokeWidth={isActive ? "3" : "2"}
                      className="transition-all duration-200"
                    />

                    {/* X-Axis Period Label */}
                    <text
                      x={pt.x}
                      y="152"
                      textAnchor="middle"
                      className={`text-[10px] sm:text-[11px] font-bold ${
                        isActive ? "fill-amber-700 font-black" : "fill-slate-500"
                      }`}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Interactive Tooltip Card Floating Above Active Point */}
            {activePoint && (
              <div
                style={{
                  left: `${(activePoint.x / 600) * 100}%`,
                  top: `${(activePoint.y / 160) * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-full mb-3 pointer-events-none transition-all duration-200 z-10"
              >
                <div className="relative flex flex-col items-center rounded-xl bg-slate-900 px-3 py-1.5 text-white shadow-xl">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    Total income ({activePoint.label})
                  </span>
                  <span className="text-xs font-black text-white">
                    {formatMoney(activePoint.income)}
                  </span>
                  {/* Arrow Pointer */}
                  <div className="absolute -bottom-1 h-2 w-2 rotate-45 bg-slate-900" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sub-Metrics Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1 text-center">
        <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Expenses
          </p>
          <p className="mt-1 text-sm sm:text-base font-black text-slate-800">
            {formatMoney(baseExpenses)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 sm:p-3 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">
            Total Income
          </p>
          <p className="mt-1 text-sm sm:text-base font-black text-amber-900">
            {formatMoney(baseRevenue)}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 sm:p-3 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Total Profit
          </p>
          <p className="mt-1 text-sm sm:text-base font-black text-emerald-900">
            {formatMoney(baseProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}
