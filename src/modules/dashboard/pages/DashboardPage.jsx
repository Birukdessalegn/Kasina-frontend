import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  Utensils,
  Wine,
  RefreshCw,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Radio,
  BedDouble,
} from "lucide-react";
import api from "../../../services/api";
import SmoothMonthlyRevenueChart from "../components/SmoothMonthlyRevenueChart";
import DashboardBarChart from "../components/DashboardBarChart";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [timeframe, setTimeframe] = useState("today"); // "today" | "week" | "month" | "all"
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ============================================================
  // FETCH DASHBOARD SUMMARY (WITH BACKGROUND LIVE REFRESH)
  // ============================================================

  const fetchDashboard = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError("");

      const [response, ordersRes, expRes, roomsRes] = await Promise.all([
        api("/dashboard").catch((err) => ({ success: false, message: err.message })),
        api("/pos/orders").catch(() => api("/orders").catch(() => ({}))),
        api("/expenses").catch(() => ({})),
        api("/room-reservations").catch(() => ({})),
      ]);

      console.log("Dashboard live response:", response);

      const ordersList = ordersRes.orders || ordersRes.data || (Array.isArray(ordersRes) ? ordersRes : []);
      setOrders(ordersList);

      const expensesList = expRes.expenses || expRes.data || (Array.isArray(expRes) ? expRes : []);
      setExpenses(expensesList);

      const reservationsList = roomsRes.reservations || roomsRes.data || (Array.isArray(roomsRes) ? roomsRes : []);
      setReservations(reservationsList);

      if (response && response.success !== false) {
        const statsData = response.stats || response.data || response;

        let topProds = response.top_products || statsData.top_products || response.topProducts || [];

        // If top_products is empty or missing quantity_sold, fetch catalog & real sold orders
        try {
          const prodRes = await api("/products").catch(() => ({}));
          const productsList = prodRes.products || prodRes.data || [];

          // Aggregate sales by product_id from completed/paid orders
          const salesMap = {};
          if (Array.isArray(ordersList)) {
            ordersList.forEach((ord) => {
              if (ord.status !== "cancelled" && Array.isArray(ord.items)) {
                ord.items.forEach((item) => {
                  const pid = item.product_id || item.id;
                  const qty = Number(item.quantity || 1);
                  const price = Number(item.unit_price || item.price || 0);
                  const tot = Number(item.total || qty * price);

                  if (!salesMap[pid]) {
                    salesMap[pid] = { quantity_sold: 0, revenue: 0 };
                  }
                  salesMap[pid].quantity_sold += qty;
                  salesMap[pid].revenue += tot;
                });
              }
            });
          }

          if (Array.isArray(productsList) && productsList.length > 0) {
            topProds = productsList.map((p) => {
              const itemPrice = Number(p.price || p.unit_price || p.cost_price || 0);
              const realSales = salesMap[p.id] || salesMap[p.product_id] || {};

              const qtySold = Number(realSales.quantity_sold || p.quantity_sold || p.total_sold || 0);
              const itemRev = Number(realSales.revenue || p.revenue || p.total_revenue || (qtySold * itemPrice));

              return {
                id: p.id,
                name: p.name,
                price: itemPrice,
                category_name: p.category_name || (p.category_type === "bar" ? "Bar & Drinks" : "Kitchen Food"),
                category_type: p.category_type || "food",
                quantity_sold: qtySold,
                revenue: itemRev > 0 ? itemRev : (qtySold * itemPrice),
              };
            });

            // Only include products that have actual sales, sorted descending
            topProds = topProds.filter((p) => p.quantity_sold > 0);
            topProds.sort((a, b) => b.revenue - a.revenue || b.quantity_sold - a.quantity_sold);
          }
        } catch (e) {
          console.log("Products/orders fetch check:", e);
        }

        setDashboard({
          ...statsData,
          top_products: topProds,
          sales_chart: response.sales_chart || statsData.sales_chart || response.salesChart || [],
        });
      } else {
        throw new Error(
          response.message || "Failed to load dashboard"
        );
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);

      if (isInitial) {
        setError(
          error.message || "Failed to load dashboard data"
        );
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ============================================================
  // REAL-TIME AUTO-POLLING TIMER (EVERY 10 SECONDS)
  // ============================================================

  useEffect(() => {
    fetchDashboard(true);

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchDashboard(false);
      }, 10000); // Poll live data every 10s
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, fetchDashboard]);

  // ============================================================
  // REFRESH HANDLER
  // ============================================================

  const handleRefresh = async () => {
    await fetchDashboard(false);
  };

  // ============================================================
  // FORMAT MONEY
  // ============================================================

  const formatMoney = (amount) => {
    return `${Number(amount || 0).toLocaleString()} ETB`;
  };

  // ============================================================
  // HOTEL REVENUE & PROFIT METRICS
  // ============================================================

  const metrics = useMemo(() => {
    const paidOrders = (orders || []).filter((ord) => {
      const st = String(ord.status || "").toLowerCase();
      const paySt = String(ord.payment_status || "").toLowerCase();
      return (
        st === "completed" ||
        st === "paid" ||
        paySt === "paid" ||
        ord.is_paid === true
      );
    });

    const posPaidTotal = paidOrders.reduce((sum, o) => {
      return sum + Number(o.total_amount || o.total || o.grand_total || 0);
    }, 0);

    const roomPaidTotal = (reservations || []).reduce((sum, r) => {
      return sum + Number(r.paid_amount || (r.payment_status === "paid" ? r.total_amount : 0) || 0);
    }, 0);

    const verifiedTotal = posPaidTotal + roomPaidTotal;
    const grossRevenue = verifiedTotal > 0
      ? verifiedTotal
      : Number(dashboard?.grand_total_revenue || dashboard?.total_revenue || dashboard?.today_sales || 0);

    const totalExpenses =
      (expenses || []).reduce((sum, e) => {
        return sum + Number(e.amount || 0);
      }, 0) || Number(dashboard?.total_expenses || 0);

    const netRevenue = Math.max(grossRevenue - totalExpenses, 0);

    return {
      grossRevenue,
      totalExpenses,
      netRevenue,
    };
  }, [orders, expenses, reservations, dashboard]);

  const totalItemsServed = useMemo(() => {
    if (!dashboard?.top_products || !Array.isArray(dashboard.top_products)) return 0;
    return dashboard.top_products.reduce((acc, curr) => acc + Number(curr.quantity_sold || curr.quantity || 0), 0);
  }, [dashboard]);

  // ============================================================
  // TIMEFRAME FILTERING HELPER & AGGREGATED METRICS
  // ============================================================

  const isDateInTimeframe = (dateVal, tf) => {
    if (tf === "all") return true;
    if (!dateVal) return tf === "today";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDate = now.getDate();

    if (tf === "today") {
      return (
        d.getFullYear() === nowYear &&
        d.getMonth() === nowMonth &&
        d.getDate() === nowDate
      );
    }

    if (tf === "week") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return d >= sevenDaysAgo && d <= now;
    }

    if (tf === "month") {
      return d.getFullYear() === nowYear && d.getMonth() === nowMonth;
    }

    return true;
  };

  const filteredData = useMemo(() => {
    // 1. Paid orders matching timeframe
    const tfPaidOrders = (orders || []).filter((ord) => {
      const st = String(ord.status || "").toLowerCase();
      const paySt = String(ord.payment_status || "").toLowerCase();
      const isPaid =
        st === "completed" ||
        st === "paid" ||
        paySt === "paid" ||
        ord.is_paid === true;
      if (!isPaid) return false;
      const d = ord.created_at || ord.createdAt || ord.order_date || ord.date || ord.paid_at;
      return isDateInTimeframe(d, timeframe);
    });

    const tfAllOrders = (orders || []).filter((ord) => {
      const st = String(ord.status || "").toLowerCase();
      if (st === "cancelled" || st === "void") return false;
      const d = ord.created_at || ord.createdAt || ord.order_date || ord.date;
      return isDateInTimeframe(d, timeframe);
    });

    const tfPaidPosTotal = tfPaidOrders.reduce((sum, o) => {
      return sum + Number(o.total_amount || o.total || o.grand_total || 0);
    }, 0);

    // 2. Reservations matching timeframe
    const tfReservations = (reservations || []).filter((r) => {
      const d = r.created_at || r.createdAt || r.check_in || r.check_in_date || r.date;
      return isDateInTimeframe(d, timeframe);
    });

    const tfPaidRoomsTotal = tfReservations.reduce((sum, r) => {
      return sum + Number(r.paid_amount || r.total_amount || 0);
    }, 0);

    // 3. Expenses matching timeframe
    const tfExpenses = (expenses || []).filter((e) => {
      const d = e.date || e.created_at || e.createdAt;
      return isDateInTimeframe(d, timeframe);
    });

    const tfExpensesTotal = tfExpenses.reduce((sum, e) => {
      return sum + Number(e.amount || 0);
    }, 0);

    // Resolve POS sales with fallback to backend stats
    let activePosSales = tfPaidPosTotal;
    let activeRoomSales = tfPaidRoomsTotal;
    let activeOrdersCount = tfAllOrders.length;
    let activeExpensesAmount = tfExpensesTotal;

    if (timeframe === "today") {
      activePosSales = Math.max(tfPaidPosTotal, Number(dashboard?.today_sales || 0));
      activeRoomSales = Math.max(tfPaidRoomsTotal, Number(dashboard?.today_room_sales || 0));
      activeOrdersCount = Math.max(tfAllOrders.length, Number(dashboard?.today_orders || 0));
      activeExpensesAmount = Math.max(tfExpensesTotal, Number(dashboard?.today_expenses || 0));
    } else if (timeframe === "all") {
      activePosSales = Math.max(
        tfPaidPosTotal,
        Number(
          dashboard?.pos_sales_all_time ||
          dashboard?.all_time_sales ||
          dashboard?.total_revenue ||
          0
        )
      );
      activeRoomSales = Math.max(
        tfPaidRoomsTotal,
        Number(
          dashboard?.room_sales_all_time ||
          dashboard?.total_room_reservations_amount ||
          0
        )
      );
      activeOrdersCount = Math.max(tfAllOrders.length, Number(dashboard?.total_orders || 0));
      activeExpensesAmount = Math.max(tfExpensesTotal, Number(dashboard?.total_expenses || 0));
    } else if (timeframe === "week") {
      const weeklySum = Array.isArray(dashboard?.sales_chart)
        ? dashboard.sales_chart.reduce((s, it) => s + Number(it.sales || it.total || 0), 0)
        : Number(dashboard?.weekly_sales || 0);
      if (activePosSales === 0 && weeklySum > 0) activePosSales = weeklySum;
      if (activeOrdersCount === 0 && dashboard?.weekly_orders) activeOrdersCount = Number(dashboard.weekly_orders);
    } else if (timeframe === "month") {
      const monthlySum = Number(dashboard?.monthly_sales || dashboard?.all_time_sales || 0);
      if (activePosSales === 0 && monthlySum > 0) activePosSales = monthlySum;
      if (activeOrdersCount === 0 && dashboard?.monthly_orders) activeOrdersCount = Number(dashboard.monthly_orders);
    }

    const activeGrandRevenue = activePosSales + activeRoomSales;

    return {
      activeGrandRevenue,
      activeRoomSales,
      activePosSales,
      activeOrdersCount,
      activeExpensesAmount,
    };
  }, [orders, reservations, expenses, dashboard, timeframe]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin" />

          <span className="text-sm">
            Loading dashboard...
          </span>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Welcome back. Here's what's happening in
            your restaurant and bar today.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-red-800">
                Failed to load dashboard
              </h2>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }


  const activeTables = Number(dashboard?.active_tables || 0);
  const pendingKitchenOrders = Number(dashboard?.pending_kitchen_orders || 0);
  const pendingBarOrders = Number(dashboard?.pending_bar_orders || 0);
  const activeFloorAmount = Number(dashboard?.active_orders_amount ?? 0);

  const timeframeLabel =
    timeframe === "today"
      ? "Today"
      : timeframe === "week"
      ? "This Week"
      : timeframe === "month"
      ? "This Month"
      : "All-Time";

  // ============================================================
  // STAT CARDS
  // ============================================================

  const stats = [
    {
      title: `${timeframeLabel} Revenue`,
      value: formatMoney(filteredData.activeGrandRevenue),
      description: `Rooms + Food & Bar (${timeframeLabel})`,
      icon: Sparkles,
      highlight: true,
    },
    {
      title: "Room Lodging Sales",
      value: formatMoney(filteredData.activeRoomSales),
      description: `Settled bookings (${timeframeLabel})`,
      icon: BedDouble,
    },
    {
      title: "Food & Bar Sales",
      value: formatMoney(filteredData.activePosSales),
      description: `POS orders (${timeframeLabel})`,
      icon: Utensils,
    },
    {
      title: `${timeframeLabel} Orders`,
      value: filteredData.activeOrdersCount.toLocaleString(),
      description: `Orders created (${timeframeLabel})`,
      icon: ShoppingCart,
    },
    {
      title: "Active Floor Tabs",
      value: formatMoney(activeFloorAmount),
      description: `${activeTables} active tables on floor`,
      icon: Clock,
    },
    {
      title: "Pending Orders",
      value: (pendingKitchenOrders + pendingBarOrders).toLocaleString(),
      description: `${pendingKitchenOrders} kitchen · ${pendingBarOrders} bar`,
      icon: Clock,
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard Overview
            </h1>

            {autoRefresh && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                LIVE
              </div>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Welcome back. Real-time metrics automatically synced with KASINA HOTEL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Timeframe Filter (Today / Week / Month / All-Time) */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setTimeframe("today")}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === "today"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("week")}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === "week"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("month")}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === "month"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              All-Time
            </button>
          </div>

          {/* Live Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              autoRefresh
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${autoRefresh ? "animate-pulse text-emerald-600" : ""}`} />
            {autoRefresh ? "Live 10s Active" : "Live Paused"}
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading || isRefreshing ? "animate-spin text-indigo-600" : ""
              }`}
            />
            {isRefreshing ? "Updating..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ======================================================
          HOTEL MULTI-FIELD REVENUE COMMAND BANNER
      ====================================================== */}
      <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-4 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-wider text-amber-400 uppercase bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                WHOLE HOTEL REVENUE ACTIVE
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Rooms + Food & Bar POS ({timeframeLabel})
              </span>
            </div>
            <p className="text-base font-black text-white mt-0.5">
              Whole Hotel {timeframeLabel} Revenue:{" "}
              <span className="text-amber-400 font-mono">
                {formatMoney(filteredData.activeGrandRevenue)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 px-2.5 py-1">
            <BedDouble className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-slate-300">Rooms:</span>
            <span className="font-bold text-blue-300 font-mono">
              {formatMoney(filteredData.activeRoomSales)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 px-2.5 py-1">
            <Utensils className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-300">Food & Bar:</span>
            <span className="font-bold text-emerald-300 font-mono">
              {formatMoney(filteredData.activePosSales)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-300">Floor Tabs:</span>
            <span className="font-bold text-amber-300 font-mono">
              {formatMoney(activeFloorAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className={`rounded-xl border p-2.5 sm:p-3 shadow-xs transition hover:shadow-sm ${
                stat.highlight
                  ? "border-amber-300 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {stat.title}
                  </p>

                  <h2 className="mt-0.5 text-base sm:text-lg font-bold text-gray-900 font-mono">
                    {stat.value}
                  </h2>
                </div>

                <div className={`rounded-lg p-1.5 ${
                  stat.highlight ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-600"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="mt-1.5 border-t border-gray-100 pt-1">
                <span className="text-[10px] font-medium text-gray-400">
                  {stat.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================
          ADDITIONAL SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Products */}

        <SummaryCard
          title="Active Products"
          value={Number(
            dashboard?.total_products || 0
          ).toLocaleString()}
          description={`${Number(
            dashboard?.available_products || 0
          )} available`}
          icon={ShoppingCart}
        />

        {/* Low Stock */}

        <SummaryCard
          title="Low Stock"
          value={Number(
            dashboard?.low_stock_products || 0
          ).toLocaleString()}
          description="Products need attention"
          icon={Clock}
        />

        {/* Employees */}

        <SummaryCard
          title="Active Employees"
          value={Number(
            dashboard?.active_employees || 0
          ).toLocaleString()}
          description="Currently active"
          icon={Users}
        />

        {/* Expenses */}

        <SummaryCard
          title={`${timeframeLabel} Expenses`}
          value={formatMoney(
            filteredData.activeExpensesAmount
          )}
          description={`Paid expenses (${timeframeLabel})`}
          icon={DollarSign}
        />
      </div>

      {/* ======================================================
          MAIN DASHBOARD CONTENT (BAR CHART & QUICK ACTIONS)
      ====================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ====================================================
            SMOOTH WAVE REVENUE LINE CHART (RESTOBOARD STYLE)
        ==================================================== */}

        <div className="lg:col-span-2">
          <SmoothMonthlyRevenueChart
            dashboardStats={dashboard}
            orders={orders}
            expenses={expenses}
            reservations={reservations}
            metrics={metrics}
            formatMoney={formatMoney}
            externalTimeframe={timeframe}
          />
        </div>

        {/* ====================================================
            BAR CHART ANALYTICS (REPLACED QUICK OPERATIONS)
        ==================================================== */}

        <div className="lg:col-span-1">
          <DashboardBarChart
            dashboardStats={dashboard}
            orders={orders}
            expenses={expenses}
            reservations={reservations}
            metrics={metrics}
            formatMoney={formatMoney}
            externalTimeframe={timeframe}
          />
        </div>
      </div>

      {/* ======================================================
          ITEMIZED REVENUE LEADERBOARD (FOOD & DRINKS BREAKDOWN)
      ====================================================== */}

      <ItemizedRevenueSection dashboard={dashboard} formatMoney={formatMoney} />
    </div>
  );
}

// ============================================================
// ITEMIZED REVENUE LEADERBOARD COMPONENT
// ============================================================

function ItemizedRevenueSection({ dashboard, formatMoney }) {
  const [categoryFilter, setCategoryFilter] = useState("all"); // "all" | "food" | "bar"

  // Process live database top products strictly from registered products & orders
  const rawProducts = useMemo(() => {
    if (dashboard?.top_products && Array.isArray(dashboard.top_products) && dashboard.top_products.length > 0) {
      return dashboard.top_products
        .filter((p) => Number(p.quantity_sold || p.quantity || 0) > 0)
        .map((p) => {
          const qty = Number(p.quantity_sold || p.quantity || 0);
          const unitPrice = Number(p.price || p.unit_price || p.cost_price || 0);
          const rev = Number(p.revenue || p.total_revenue || 0);

          // Total money obtained by serving this item (quantity * unitPrice or total revenue)
          const finalRevenue = rev > 0 ? rev : (qty * unitPrice);

          return {
            id: p.id,
            name: p.name,
            category: p.category_name || (p.category_type === "bar" ? "Bar & Drinks" : "Kitchen Food"),
            categoryType: p.category_type || "food",
            quantity: qty,
            unitPrice: unitPrice,
            revenue: finalRevenue,
          };
        });
    }

    // Strict real data mode: Return empty array when no orders have been placed yet
    return [];
  }, [dashboard]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    return rawProducts.filter((item) => {
      if (categoryFilter === "all") return true;
      if (categoryFilter === "food") return item.categoryType === "food" || item.category.toLowerCase().includes("food") || item.category.toLowerCase().includes("kitchen");
      if (categoryFilter === "bar") return item.categoryType === "bar" || item.category.toLowerCase().includes("bar") || item.category.toLowerCase().includes("cocktail");
      return true;
    });
  }, [rawProducts, categoryFilter]);

  const maxRevenue = useMemo(() => {
    return Math.max(...filteredProducts.map((p) => p.revenue), 1);
  }, [filteredProducts]);

  const totalCategoryItemsServed = useMemo(() => {
    return filteredProducts.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [filteredProducts]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Itemized Product Revenue Leaderboard
            </h2>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-800">
              {totalCategoryItemsServed.toLocaleString()} Total Items Served
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Individual sales revenue generated by food, drinks, and services in your hotel.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-lg px-3.5 py-1.5 transition ${categoryFilter === "all"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            All Items
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("food")}
            className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 transition ${categoryFilter === "food"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            Food Items
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("bar")}
            className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 transition ${categoryFilter === "bar"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Wine className="h-3.5 w-3.5" />
            Bar & Drinks
          </button>
        </div>
      </div>

      {/* Item List / Leaderboard */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Utensils className="mb-2 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No Itemized Sales Recorded Yet</p>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            When orders are created and paid at the POS or Bar, individual item sales (e.g., Burgers, Beer, Cocktails) will populate here live directly from your database!
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-slate-100">
          {filteredProducts.map((item, index) => {
            const sharePercent = Math.round((item.revenue / maxRevenue) * 100);

            return (
              <div
                key={item.id || item.name}
                className="group flex flex-col gap-3 py-4 transition hover:bg-slate-50/80 px-3 rounded-xl"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Rank & Item Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${index === 0
                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                          : index === 1
                            ? "bg-slate-200 text-slate-800"
                            : index === 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      #{index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-base truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.quantity.toLocaleString()} units served
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Item Revenue (Total Money Obtained by Serving) */}
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-emerald-700">
                      {formatMoney(item.revenue)}
                    </p>
                    <span className="text-[11px] font-medium text-slate-400">
                      {item.quantity > 0 && sharePercent > 0
                        ? `${sharePercent}% of top item`
                        : "Total Item Revenue"}
                    </span>
                  </div>
                </div>

                {/* Revenue Share Visual Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${sharePercent}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${index === 0
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                        : "bg-gradient-to-r from-blue-500 to-indigo-600"
                      }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3 shadow-xs transition hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {title}
          </p>

          <h2 className="mt-0.5 text-base sm:text-lg font-bold text-gray-900">
            {value}
          </h2>

          <p className="mt-0.5 text-[10px] text-gray-400">
            {description}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-1.5 text-gray-600">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}


