import { useState, useMemo } from "react";
import { BarChart3, Calendar, Sparkles } from "lucide-react";

export default function DashboardBarChart({
  dashboardStats,
  orders = [],
  expenses = [],
  reservations = [],
  metrics = {},
  formatMoney = (v) => `${Number(v || 0).toLocaleString()} ETB`,
  externalTimeframe = "today",
}) {
  const [viewMode, setViewMode] = useState("weekly"); // "weekly" (Mon-Sun) | "category" (Food, Drink, Rooms)
  const [activeIdx, setActiveIdx] = useState(5); // default active index (e.g. Sat)

  const baseRevenue = metrics?.grossRevenue || 0;

  // Process Daily/Weekly 7-Day Bar Data
  const weeklyBarData = useMemo(() => {
    const days = [
      { key: "Mon", label: "Mon", dayNum: 1 },
      { key: "Tue", label: "Tue", dayNum: 2 },
      { key: "Wed", label: "Wed", dayNum: 3 },
      { key: "Thu", label: "Thu", dayNum: 4 },
      { key: "Fri", label: "Fri", dayNum: 5 },
      { key: "Sat", label: "Sat", dayNum: 6 },
      { key: "Sun", label: "Sun", dayNum: 0 },
    ];

    const salesMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const orderCountMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

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
              const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
              const amt = Number(ord.total_amount || ord.total || ord.grand_total || 0);
              if (salesMap[dayStr] !== undefined) {
                salesMap[dayStr] += amt;
                orderCountMap[dayStr] += 1;
              }
            }
          }
        }
      });
    }

    // Also include reservations
    if (Array.isArray(reservations) && reservations.length > 0) {
      reservations.forEach((res) => {
        if (res.status !== "cancelled") {
          const dateStr = res.created_at || res.check_in || res.checkInDate;
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
              const amt = Number(res.total_price || res.total_amount || res.price || 0);
              if (salesMap[dayStr] !== undefined) {
                salesMap[dayStr] += amt;
              }
            }
          }
        }
      });
    }

    // Fallback if 0 found: check dashboardStats sales_chart or active sales
    const totalFound = Object.values(salesMap).reduce((s, v) => s + v, 0);
    if (totalFound === 0) {
      const chartList =
        dashboardStats?.sales_chart ||
        dashboardStats?.weekly_sales ||
        dashboardStats?.salesChart ||
        [];

      if (Array.isArray(chartList) && chartList.length > 0) {
        chartList.forEach((item) => {
          let dayKey = item.label || item.day;
          if (!dayKey && item.date) {
            const d = new Date(item.date);
            if (!isNaN(d.getTime())) dayKey = d.toLocaleDateString("en-US", { weekday: "short" });
          }
          const amt = Number(item.sales || item.revenue || item.total || 0);
          if (dayKey && salesMap[dayKey] !== undefined) {
            salesMap[dayKey] += amt;
          }
        });
      } else {
        // Fallback to active revenue mapped to Saturday / current day
        const todayAmt = Number(dashboardStats?.today_sales || dashboardStats?.todaySales || 0);
        const activeAmt = todayAmt > 0 ? todayAmt : (baseRevenue || 0);
        if (activeAmt > 0) {
          const currentDayStr = new Date().toLocaleDateString("en-US", { weekday: "short" });
          salesMap[currentDayStr] = activeAmt;
          orderCountMap[currentDayStr] = Math.max(1, orders.length);
        }
      }
    }

    const maxVal = Math.max(...Object.values(salesMap), 100);

    return days.map((d, index) => {
      const val = salesMap[d.key] || 0;
      const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
      return {
        label: d.label,
        key: d.key,
        value: val,
        count: orderCountMap[d.key] || 0,
        percentage: pct,
        index,
      };
    });
  }, [orders, reservations, dashboardStats, baseRevenue]);

  // Process Category Breakdown Data (Food vs Bar vs Rooms)
  const categoryData = useMemo(() => {
    let foodRev = 0;
    let drinkRev = 0;
    let roomRev = 0;

    if (Array.isArray(orders)) {
      orders.forEach((ord) => {
        if (ord.status !== "cancelled" && Array.isArray(ord.items)) {
          ord.items.forEach((item) => {
            const tot = Number(item.total || (Number(item.quantity || 1) * Number(item.unit_price || item.price || 0)));
            const cat = (item.category || item.category_name || item.type || "").toLowerCase();

            if (cat.includes("drink") || cat.includes("bar") || cat.includes("beverage") || cat.includes("beer") || cat.includes("wine")) {
              drinkRev += tot;
            } else {
              foodRev += tot;
            }
          });
        }
      });
    }

    if (Array.isArray(reservations)) {
      reservations.forEach((r) => {
        if (r.status !== "cancelled") {
          roomRev += Number(r.total_price || r.total_amount || 0);
        }
      });
    }

    const totalCat = foodRev + drinkRev + roomRev;
    if (totalCat === 0 && baseRevenue > 0) {
      foodRev = Math.round(baseRevenue * 0.55);
      drinkRev = Math.round(baseRevenue * 0.35);
      roomRev = Math.round(baseRevenue * 0.10);
    }

    const maxCat = Math.max(foodRev, drinkRev, roomRev, 100);

    return [
      { label: "Food & Meals", value: foodRev, color: "from-amber-500 to-amber-400", percentage: Math.round((foodRev / maxCat) * 100) },
      { label: "Bar & Drinks", value: drinkRev, color: "from-pink-500 to-rose-400", percentage: Math.round((drinkRev / maxCat) * 100) },
      { label: "Rooms & Suites", value: roomRev, color: "from-blue-600 to-cyan-500", percentage: Math.round((roomRev / maxCat) * 100) },
    ];
  }, [orders, reservations, baseRevenue]);

  const activeItem = weeklyBarData[activeIdx] || weeklyBarData[5] || weeklyBarData[0];
  const peakDay = useMemo(() => {
    let best = weeklyBarData[0];
    weeklyBarData.forEach((d) => {
      if (d.value > (best?.value || 0)) best = d;
    });
    return best;
  }, [weeklyBarData]);

  const totalPeriodSales = useMemo(() => {
    return weeklyBarData.reduce((acc, curr) => acc + curr.value, 0);
  }, [weeklyBarData]);

  return (
    <div className="w-full h-full rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/40 via-white to-white p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-600" />
            Sales Bar Graph
          </h2>
          <p className="text-xs text-slate-500">
            {viewMode === "weekly" ? "Daily revenue comparison (7 Days)" : "Department sales breakdown"}
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center rounded-xl bg-amber-100/60 p-1 text-xs font-bold border border-amber-200/80">
          <button
            type="button"
            onClick={() => setViewMode("weekly")}
            className={`rounded-lg px-2.5 py-1 transition ${
              viewMode === "weekly"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-900 hover:text-slate-900 hover:bg-amber-200/50"
            }`}
          >
            Days
          </button>
          <button
            type="button"
            onClick={() => setViewMode("category")}
            className={`rounded-lg px-2.5 py-1 transition ${
              viewMode === "category"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-900 hover:text-slate-900 hover:bg-amber-200/50"
            }`}
          >
            Dept
          </button>
        </div>
      </div>

      {/* Metric Badge Summary */}
      <div className="flex items-center justify-between rounded-xl bg-amber-50/70 p-3 border border-amber-100/80">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            {viewMode === "weekly" ? "Period Total Inflow" : "Department Total"}
          </p>
          <p className="text-lg font-black text-slate-900 mt-0.5">
            {formatMoney(totalPeriodSales > 0 ? totalPeriodSales : baseRevenue)}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
            <Sparkles className="h-3 w-3 text-emerald-600" />
            Peak: {peakDay?.label || "Sat"}
          </span>
          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
            {formatMoney(peakDay?.value || 0)}
          </p>
        </div>
      </div>

      {/* Main Bar Chart Display Area */}
      {viewMode === "weekly" ? (
        <div className="flex-1 flex flex-col justify-end min-h-[170px] pt-3">
          {/* Active Hover / Selected Tooltip Callout */}
          <div className="mb-2 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-white shadow-md transition-all duration-150">
              <span className="text-[11px] font-bold text-amber-300 uppercase">
                {activeItem?.label}:
              </span>
              <span className="text-xs font-black">
                {formatMoney(activeItem?.value || 0)}
              </span>
              {activeItem?.count > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ({activeItem.count} {activeItem.count === 1 ? "order" : "orders"})
                </span>
              )}
            </div>
          </div>

          {/* Vertical Bars Grid */}
          <div className="grid grid-cols-7 gap-2 items-end h-36 px-1">
            {weeklyBarData.map((item, idx) => {
              const isSelected = activeIdx === idx;
              // Minimum bar height so bar shape is visible even when 0
              const barHeightPct = Math.max(item.percentage, 6);

              return (
                <div
                  key={item.key}
                  onClick={() => setActiveIdx(idx)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className="group flex flex-col items-center h-full justify-end cursor-pointer"
                >
                  {/* Bar Column Container */}
                  <div className="relative w-full max-w-[28px] h-full flex items-end justify-center rounded-xl bg-slate-100/90 p-0.5 transition hover:bg-amber-100/40">
                    {/* Value Pill on Hover */}
                    <div
                      style={{ height: `${barHeightPct}%` }}
                      className={`w-full rounded-lg transition-all duration-300 ${
                        isSelected
                          ? "bg-gradient-to-t from-amber-500 to-amber-400 shadow-md ring-2 ring-amber-300 ring-offset-1"
                          : "bg-gradient-to-t from-amber-300/80 to-amber-200/90 group-hover:from-amber-400 group-hover:to-amber-300"
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={`mt-1.5 text-[11px] transition-all ${
                      isSelected
                        ? "font-black text-amber-700 scale-105"
                        : "font-semibold text-slate-500 group-hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Department Horizontal Bars View */
        <div className="flex-1 flex flex-col justify-center space-y-3.5 min-h-[170px] pt-1">
          {categoryData.map((cat) => (
            <div key={cat.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">{cat.label}</span>
                <span className="text-slate-900">{formatMoney(cat.value)}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 p-0.5 overflow-hidden">
                <div
                  style={{ width: `${Math.max(cat.percentage, 6)}%` }}
                  className={`h-full rounded-full bg-gradient-to-r ${cat.color} transition-all duration-500`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Insights Footer */}
      <div className="border-t border-amber-100 pt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-amber-600" />
          <span>Real-time POS & Billing</span>
        </span>
        <span className="font-bold text-amber-700 hover:text-amber-800 cursor-pointer">
          {weeklyBarData.filter((d) => d.value > 0).length} active days
        </span>
      </div>
    </div>
  );
}
