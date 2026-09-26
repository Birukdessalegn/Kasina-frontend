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
        x: Math.round(40 + idx * (520 / (months.length - 1))),
      }));
      getPeriodKey = (d) => d.toLocaleDateString("en-US", { month: "short" });
    }

    // Aggregate actual revenue from orders and room reservations
    const periodRevenueMap = {};
    points.forEach((p) => {
      periodRevenueMap[p.label] = 0;
    });

    let hasActualData = false;

    // 1. Process POS Orders (Food, Drinks, Cafe, Bar)
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
              if (periodRevenueMap[key] !== undefined) {
                periodRevenueMap[key] += amt;
                if (amt > 0) hasActualData = true;
              }
            }
          }
        }
      });
    }

    // 2. Process Room Reservations (Accommodations)
    if (Array.isArray(reservations) && reservations.length > 0) {
      reservations.forEach((res) => {
        const isCompleted =
          res.status === "checked_out" ||
          res.status === "confirmed" ||
          res.status === "checked_in" ||
          res.payment_status === "paid";

        if (isCompleted) {
          const dateStr = res.created_at || res.check_in_date || res.checkInDate || res.check_out_date;
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const key = getPeriodKey(d);
              const amt = Number(res.total_price || res.totalPrice || res.room_rate || 0);
              if (periodRevenueMap[key] !== undefined) {
                periodRevenueMap[key] += amt;
                if (amt > 0) hasActualData = true;
              }
            }
          }
        }
      });
    }

    // Compute max revenue for proportionate chart curve
    const maxRev = Math.max(...Object.values(periodRevenueMap), 1);

    return points.map((p) => {
      const rev = periodRevenueMap[p.label] || 0;
      const ratio = maxRev > 0 ? rev / maxRev : 0;
      // Chart height is 150px, top margin 20px, bottom baseline 135px
      const y = Math.round(135 - ratio * 95);

      return {
        ...p,
        income: rev,
        y,
      };
    });
  }, [orders, reservations, dashboardStats, chartTimeframe, baseRevenue]);

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

  // Sync with global timeframe selector if passed
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
      const cx1 = Math.round(curr.x + (next.x - curr.x) / 2);
      const cy1 = curr.y;
      const cx2 = cx1;
      const cy2 = next.y;
      d += ` C ${cx1},${cy1} ${cx2},${cy2} ${next.x},${next.y}`;
    }
    return d;
  }, [trendData]);

  // Gradient area underneath curve
  const fillD = useMemo(() => {
    if (!trendData || trendData.length === 0) return "";
    const lastX = trendData[trendData.length - 1].x;
    return `${pathD} L ${lastX},135 L ${trendData[0].x},135 Z`;
  }, [pathD, trendData]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Revenue Growth Dynamics
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
              <TrendingUp size={11} />
              Actual Hotel Intake
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            Continuous cashflow trajectory aggregated from verified guest invoices
          </p>
        </div>

        {/* Timeframe Pill Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/60 self-start sm:self-auto">
          {[
            { id: "daily", label: "7-Days" },
            { id: "weekly", label: "Weeks" },
            { id: "monthly", label: "Months" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setChartTimeframe(mode.id);
                setActiveIdx(0);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                chartTimeframe === mode.id
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Wave Graph */}
      <div className="relative mt-4 w-full h-[155px]">
        <svg
          viewBox="0 0 600 150"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="smoothRevenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
            </linearGradient>
            <filter id="smoothGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563eb" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Gridlines */}
          <line x1="30" y1="40" x2="570" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="30" y1="85" x2="570" y2="85" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="30" y1="135" x2="570" y2="135" stroke="#e2e8f0" strokeWidth="1.2" />

          {/* Gradient fill */}
          {fillD && <path d={fillD} fill="url(#smoothRevenueGradient)" />}

          {/* Smooth line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#smoothGlow)"
            />
          )}

          {/* Interactive Node Dots */}
          {trendData.map((pt, idx) => {
            const isHovered = activeIdx === idx;
            return (
              <g
                key={idx}
                className="cursor-pointer group"
                onClick={() => setActiveIdx(idx)}
              >
                {/* Invisible larger hit target */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Visible dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? "6" : "3.5"}
                  fill={isHovered ? "#2563eb" : "#ffffff"}
                  stroke="#2563eb"
                  strokeWidth={isHovered ? "2.5" : "1.8"}
                  className="transition-all duration-200"
                />

                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="10"
                    fill="#3b82f6"
                    fillOpacity="0.2"
                    className="animate-ping"
                  />
                )}

                {/* X-Axis Label */}
                <text
                  x={pt.x}
                  y="148"
                  textAnchor="middle"
                  className={`text-[9px] font-bold select-none ${
                    isHovered ? "fill-blue-700 font-extrabold" : "fill-slate-400"
                  }`}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip at Active Node */}
        {activePoint && (
          <div
            className="absolute -top-1 pointer-events-none transform -translate-x-1/2 transition-all duration-200 ease-out z-10"
            style={{
              left: `${(activePoint.x / 600) * 100}%`,
              top: `${Math.max(0, (activePoint.y / 150) * 100 - 32)}%`,
            }}
          >
            <div className="flex flex-col items-center">
              <div className="rounded-lg bg-slate-900/90 px-2 py-1 text-white shadow-lg backdrop-blur-xs border border-slate-700/60">
                <span className="text-[10px] font-bold text-blue-300 mr-1.5 uppercase">
                  {activePoint.label}:
                </span>
                <span className="text-[11px] font-extrabold text-white">
                  {formatMoney(activePoint.income)}
                </span>
              </div>
              <div className="w-1.5 h-1.5 bg-slate-900 transform rotate-45 -mt-0.5"></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer KPI summary banner */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">
            Selected Point ({activePoint?.label || "-"}):
          </span>
          <span className="font-extrabold text-slate-900">
            {formatMoney(activePoint?.income || 0)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
          Total in view:{" "}
          <strong className="text-slate-700 font-bold">
            {formatMoney(trendData.reduce((s, p) => s + (p.income || 0), 0) || baseRevenue)}
          </strong>
        </div>
      </div>
    </div>
  );
}
