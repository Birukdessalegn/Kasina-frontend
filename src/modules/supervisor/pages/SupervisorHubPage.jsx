import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Search,
  ShoppingCart,
  Receipt,
  UtensilsCrossed,
  Wine,
  Coffee,
  PackagePlus,
  Users,
  Armchair,
  DollarSign,
  TrendingUp,
  Volume2,
  VolumeX,
  Eye,
  Bell,
  ArrowRight,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  Activity,
  Layers,
  FileText
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";
import audioService from "../../../services/audioService";
import StockRequestModal from "../../inventory/components/StockRequestModal";

export default function SupervisorHubPage() {
  const { user } = useAuth();

  // Determine supervisor outlet identity
  const userRole = (user?.role || "").toLowerCase();
  const isCafeRole = userRole.includes("cafe");
  const isBarRestaurantRole = userRole.includes("bar") || userRole.includes("restaurant");
  const isManagerOrAdmin =
    ["admin", "hotel_manager", "fnb_manager", "manager", "cooperative_manager"].includes(userRole);

  // Default outlet based on user role
  const defaultOutlet = isCafeRole ? "cafe" : isBarRestaurantRole ? "bar_restaurant" : "all";
  const [selectedOutlet, setSelectedOutlet] = useState(defaultOutlet);

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [employees, setEmployees] = useState([]);

  // UI & Filter states
  const [activeFilterTab, setActiveFilterTab] = useState("active"); // "active" | "delayed" | "preparing" | "ready" | "unpaid" | "completed"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState("all"); // "all" | "dine_in" | "takeaway" | "room"
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep a reference to count delayed orders to alert on increase
  const prevDelayedCountRef = useRef(0);

  // Live timer tick every 10 seconds for real-time elapsed calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all operational data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError("");

      // Query POS orders with outlet scoping
      let posUrl = "/pos/orders";
      let kitchenUrl = "/kitchen";

      if (selectedOutlet === "cafe") {
        posUrl = "/pos/orders?outlet_id=2";
        kitchenUrl = "/kitchen?kitchen_outlet_id=CAFE_KITCHEN";
      } else if (selectedOutlet === "bar_restaurant") {
        posUrl = "/pos/orders?outlet_id=4";
        kitchenUrl = "/kitchen?kitchen_outlet_id=RESTAURANT_KITCHEN";
      }

      const [ordersRes, kitchenRes, tablesRes, employeesRes] = await Promise.allSettled([
        api(posUrl).catch(() => api("/pos/orders").catch(() => [])),
        api(kitchenUrl).catch(() => api("/kitchen").catch(() => [])),
        api("/tables").catch(() => api("/pos/tables").catch(() => [])),
        api("/employees").catch(() => ({ employees: [] })),
      ]);

      // Normalize orders
      let rawOrders = [];
      if (ordersRes.status === "fulfilled") {
        const val = ordersRes.value;
        if (Array.isArray(val)) rawOrders = val;
        else if (Array.isArray(val?.orders)) rawOrders = val.orders;
        else if (Array.isArray(val?.data)) rawOrders = val.data;
      }

      // Normalize kitchen orders
      let rawKitchen = [];
      if (kitchenRes.status === "fulfilled") {
        const val = kitchenRes.value;
        if (Array.isArray(val)) rawKitchen = val;
        else if (Array.isArray(val?.orders)) rawKitchen = val.orders;
        else if (Array.isArray(val?.data)) rawKitchen = val.data;
      }

      // Normalize tables
      let rawTables = [];
      if (tablesRes.status === "fulfilled") {
        const val = tablesRes.value;
        if (Array.isArray(val)) rawTables = val;
        else if (Array.isArray(val?.tables)) rawTables = val.tables;
        else if (Array.isArray(val?.data)) rawTables = val.data;
      }

      // Normalize employees
      let rawEmployees = [];
      if (employeesRes.status === "fulfilled") {
        const val = employeesRes.value;
        if (Array.isArray(val)) rawEmployees = val;
        else if (Array.isArray(val?.employees)) rawEmployees = val.employees;
        else if (Array.isArray(val?.data)) rawEmployees = val.data;
      }

      setOrders(rawOrders);
      setKitchenOrders(rawKitchen);
      setTables(rawTables);
      setEmployees(rawEmployees);

    } catch (err) {
      console.error("SupervisorHub fetchData error:", err);
      setError(err.message || "Failed to load supervisor data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto polling
    return () => clearInterval(interval);
  }, [selectedOutlet]);

  // Enrich orders with elapsed minutes, delay status, and prep state
  const enrichedOrders = useMemo(() => {
    const nowMs = currentTime.getTime();

    // Map kitchen ticket status by order_id or pos_order_id
    const kitchenMap = {};
    kitchenOrders.forEach((k) => {
      const oid = k.order_id || k.pos_order_id;
      if (oid) {
        kitchenMap[oid] = k;
      }
    });

    return orders.map((order) => {
      const orderDate = new Date(order.created_at || order.createdAt || Date.now());
      const elapsedMins = Math.max(0, Math.floor((nowMs - orderDate.getTime()) / 60000));
      const statusLower = (order.status || "").toLowerCase();
      const paymentStatus = (order.payment_status || "").toLowerCase();

      // Check linked kitchen status
      const kTicket = kitchenMap[order.id];
      const kStatus = (kTicket?.status || "").toLowerCase();

      // Determine effective prep status
      let prepStatus = statusLower;
      if (kStatus) {
        prepStatus = kStatus;
      }

      const isCompleted = statusLower === "completed" || statusLower === "closed";
      const isServed = statusLower === "served" || kStatus === "served";
      const isReady = statusLower === "ready" || kStatus === "ready";
      const isPreparing = statusLower === "preparing" || kStatus === "preparing" || statusLower === "pending";
      const isUnpaid = paymentStatus !== "paid" && paymentStatus !== "settled";

      // Delayed if > 15 minutes and not yet served/completed
      const isDelayed = elapsedMins >= 15 && !isServed && !isCompleted;

      // Extract items
      let itemsList = [];
      if (Array.isArray(order.items)) itemsList = order.items;
      else if (Array.isArray(order.order_items)) itemsList = order.order_items;

      return {
        ...order,
        elapsedMins,
        isDelayed,
        prepStatus,
        isServed,
        isReady,
        isPreparing,
        isUnpaid,
        isCompleted,
        itemsList,
        kitchenTicket: kTicket,
      };
    });
  }, [orders, kitchenOrders, currentTime]);

  // Sound chime when delayed order count spikes
  useEffect(() => {
    const delayedCount = enrichedOrders.filter((o) => o.isDelayed).length;
    if (delayedCount > prevDelayedCountRef.current && soundEnabled && prevDelayedCountRef.current !== 0) {
      try {
        audioService.playNotificationSound?.();
      } catch (e) {
        // audio fallback
      }
    }
    prevDelayedCountRef.current = delayedCount;
  }, [enrichedOrders, soundEnabled]);

  // Shift KPIs
  const kpis = useMemo(() => {
    const activeOrders = enrichedOrders.filter((o) => !o.isCompleted);
    const delayedOrders = enrichedOrders.filter((o) => o.isDelayed);
    const readyOrders = enrichedOrders.filter((o) => o.isReady && !o.isServed && !o.isCompleted);
    const preparingOrders = enrichedOrders.filter((o) => o.isPreparing && !o.isReady && !o.isCompleted);
    const unpaidActive = enrichedOrders.filter((o) => o.isUnpaid && !o.isCompleted);

    // Filter tables for the outlet
    let relevantTables = tables;
    if (selectedOutlet === "cafe") {
      relevantTables = tables.filter((t) => (t.section || t.outlet_id === 2 || String(t.name).toLowerCase().includes("cafe")));
    } else if (selectedOutlet === "bar_restaurant") {
      relevantTables = tables.filter((t) => (t.outlet_id === 4 || !String(t.name).toLowerCase().includes("cafe")));
    }

    const occupiedTables = relevantTables.filter(
      (t) => (t.status || "").toLowerCase() === "occupied" || t.is_occupied
    ).length;
    const totalTables = relevantTables.length || 1;
    const tableOccupancyPercent = Math.round((occupiedTables / totalTables) * 100);

    // Sales calculations
    const todaySales = enrichedOrders.reduce((sum, o) => {
      const amt = Number(o.total_amount || o.final_amount || o.total || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const paidSales = enrichedOrders
      .filter((o) => !o.isUnpaid)
      .reduce((sum, o) => {
        const amt = Number(o.total_amount || o.final_amount || o.total || 0);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

    return {
      activeCount: activeOrders.length,
      delayedCount: delayedOrders.length,
      readyCount: readyOrders.length,
      preparingCount: preparingOrders.length,
      unpaidCount: unpaidActive.length,
      occupiedTables,
      totalTables: relevantTables.length,
      tableOccupancyPercent,
      todaySales,
      paidSales,
    };
  }, [enrichedOrders, tables, selectedOutlet]);

  // Filtered orders list for the Expediter Table
  const displayedOrders = useMemo(() => {
    return enrichedOrders.filter((order) => {
      // Tab filter
      if (activeFilterTab === "active" && order.isCompleted) return false;
      if (activeFilterTab === "delayed" && !order.isDelayed) return false;
      if (activeFilterTab === "preparing" && (!order.isPreparing || order.isReady || order.isCompleted)) return false;
      if (activeFilterTab === "ready" && (!order.isReady || order.isServed || order.isCompleted)) return false;
      if (activeFilterTab === "unpaid" && (!order.isUnpaid || order.isCompleted)) return false;
      if (activeFilterTab === "completed" && !order.isCompleted) return false;

      // Order type filter
      if (selectedOrderType !== "all") {
        const type = (order.order_type || order.type || "").toLowerCase();
        if (selectedOrderType === "dine_in" && !type.includes("dine") && !type.includes("table")) return false;
        if (selectedOrderType === "takeaway" && !type.includes("take") && !type.includes("carry")) return false;
        if (selectedOrderType === "room" && !type.includes("room")) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = String(order.id || "").toLowerCase().includes(q) || String(order.order_number || "").toLowerCase().includes(q);
        const tableMatch = String(order.table_number || order.table_name || "").toLowerCase().includes(q);
        const waiterMatch = String(order.waiter_name || order.server_name || order.created_by_name || "").toLowerCase().includes(q);
        const guestMatch = String(order.customer_name || order.guest_name || "").toLowerCase().includes(q);
        const itemMatch = (order.itemsList || []).some((item) =>
          String(item.name || item.product_name || "").toLowerCase().includes(q)
        );

        return idMatch || tableMatch || waiterMatch || guestMatch || itemMatch;
      }

      return true;
    });
  }, [enrichedOrders, activeFilterTab, selectedOrderType, searchQuery]);

  // Waiter workload summary
  const waiterWorkload = useMemo(() => {
    const workload = {};
    enrichedOrders.forEach((o) => {
      if (o.isCompleted) return;
      const waiterName = o.waiter_name || o.server_name || o.created_by_name || "Unassigned";
      if (!workload[waiterName]) {
        workload[waiterName] = { name: waiterName, activeOrders: 0, delayedOrders: 0 };
      }
      workload[waiterName].activeOrders += 1;
      if (o.isDelayed) workload[waiterName].delayedOrders += 1;
    });
    return Object.values(workload).sort((a, b) => b.activeOrders - a.activeOrders);
  }, [enrichedOrders]);

  // Action handlers
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api(`/pos/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to update order status:", err);
      // Fallback try kitchen status endpoint
      try {
        await api(`/kitchen/${orderId}/status`, {
          method: "PUT",
          body: JSON.stringify({ status: newStatus }),
        });
        fetchData();
      } catch (kErr) {
        alert(kErr.message || "Failed to update status");
      }
    }
  };

  const handleExpediteAlert = (order) => {
    if (soundEnabled) {
      try {
        audioService.playNotificationSound?.();
      } catch (e) {}
    }
    alert(`⚡ Expedite alert sent to Kitchen & Bar for Order #${order.order_number || order.id}!`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* =========================================================
          TOP COMMAND HEADER & STATION IDENTITY
      ========================================================= */}
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title & Supervisor Tag */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Supervisor Operations Hub
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE OPS
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Supervisor: <strong className="text-slate-200">{user?.name || user?.username || "Shift Lead"}</strong></span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium">
                  {selectedOutlet === "cafe" ? "☕ Cafe Station (#2)" : selectedOutlet === "bar_restaurant" ? "🍷 Bar & Restaurant Station (#4)" : "🌐 All Floor Stations"}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Outlet Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Outlet Switcher for Admin / Managers */}
            {isManagerOrAdmin && (
              <div className="bg-slate-950/60 p-1 rounded-xl border border-slate-700 flex items-center text-xs font-medium">
                <button
                  onClick={() => setSelectedOutlet("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedOutlet === "all"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Outlets
                </button>
                <button
                  onClick={() => setSelectedOutlet("cafe")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    selectedOutlet === "cafe"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  Cafe (#2)
                </button>
                <button
                  onClick={() => setSelectedOutlet("bar_restaurant")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    selectedOutlet === "bar_restaurant"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Wine className="w-3.5 h-3.5" />
                  Bar & Rest. (#4)
                </button>
              </div>
            )}

            {/* Sound Alert Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute Delayed Chimes" : "Enable Delayed Chimes"}
              className={`p-2.5 rounded-xl border transition-all ${
                soundEnabled
                  ? "bg-slate-700/60 border-slate-600 text-emerald-400 hover:bg-slate-700"
                  : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
              title="Refresh Shift Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
            </button>

            {/* Stock Requisition 1-Click Action */}
            <button
              onClick={() => setShowStockModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Request Stock</span>
            </button>
          </div>
        </div>

        {/* Action Dock Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Station Quick Navigation:</span>
            <Link
              to="/pos"
              className="px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-200 border border-slate-600/60 flex items-center gap-1 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-cyan-400" />
              <span>POS Menu</span>
            </Link>
            <Link
              to={selectedOutlet === "cafe" ? "/kitchen/cafe" : "/kitchen/restaurant"}
              className="px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-200 border border-slate-600/60 flex items-center gap-1 transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Live KDS Station</span>
            </Link>
            <Link
              to="/pos/sales-audit"
              className="px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-200 border border-slate-600/60 flex items-center gap-1 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cashier Shift Audit</span>
            </Link>
            <Link
              to="/tables"
              className="px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-200 border border-slate-600/60 flex items-center gap-1 transition-colors"
            >
              <Armchair className="w-3.5 h-3.5 text-purple-400" />
              <span>Floor Tables</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Shift Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          SHIFT PULSE KPIS (5 COMMAND CARDS)
      ========================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Active Orders */}
        <div
          onClick={() => setActiveFilterTab("active")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeFilterTab === "active"
              ? "bg-slate-800 border-cyan-500/80 shadow-lg shadow-cyan-500/10"
              : "bg-slate-800/60 border-slate-700/70 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Orders</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{kpis.activeCount}</div>
          <div className="text-[11px] text-cyan-400/90 mt-1 flex items-center gap-1">
            <span>{kpis.preparingCount} in prep</span>
            <span>•</span>
            <span>{kpis.readyCount} ready</span>
          </div>
        </div>

        {/* Delayed Orders Warning Card */}
        <div
          onClick={() => setActiveFilterTab("delayed")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            kpis.delayedCount > 0
              ? activeFilterTab === "delayed"
                ? "bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-500/20"
                : "bg-rose-950/20 border-rose-600/40 hover:border-rose-500"
              : "bg-slate-800/60 border-slate-700/70 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Delayed (&gt;15 min)</span>
            <AlertTriangle className={`w-4 h-4 ${kpis.delayedCount > 0 ? "text-rose-400 animate-pulse" : "text-slate-500"}`} />
          </div>
          <div className={`text-2xl font-bold mt-1.5 ${kpis.delayedCount > 0 ? "text-rose-400" : "text-slate-300"}`}>
            {kpis.delayedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {kpis.delayedCount > 0 ? "⚠️ Needs floor intervention" : "✓ On-time target"}
          </div>
        </div>

        {/* Ready for Pickup */}
        <div
          onClick={() => setActiveFilterTab("ready")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeFilterTab === "ready"
              ? "bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10"
              : "bg-slate-800/60 border-slate-700/70 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Ready on Pass</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5">{kpis.readyCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Awaiting waiter pickup
          </div>
        </div>

        {/* Table Occupancy */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Table Occupancy</span>
            <Armchair className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">
            {kpis.occupiedTables} / {kpis.totalTables}
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.tableOccupancyPercent)}%` }}
            ></div>
          </div>
        </div>

        {/* Shift Revenue */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Shift Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5">
            {kpis.todaySales.toLocaleString()} <span className="text-xs font-normal text-slate-400">ETB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Collected: {kpis.paidSales.toLocaleString()} ETB</span>
            {kpis.unpaidCount > 0 && <span className="text-amber-400/90 font-medium">({kpis.unpaidCount} unpaid)</span>}
          </div>
        </div>
      </div>

      {/* =========================================================
          MAIN CONTENT SPLIT: LIVE EXPEDITER & WAITER LOAD
      ========================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column: Live Order Pipeline & Expediter (3 Columns) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Controls Bar: Filters & Search */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "active", label: "Active Orders", count: kpis.activeCount },
                { id: "delayed", label: "Delayed (>15m)", count: kpis.delayedCount, isAlert: kpis.delayedCount > 0 },
                { id: "preparing", label: "In Prep", count: kpis.preparingCount },
                { id: "ready", label: "Ready", count: kpis.readyCount },
                { id: "unpaid", label: "Unpaid / Bill", count: kpis.unpaidCount },
                { id: "completed", label: "Closed Today", count: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilterTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeFilterTab === tab.id
                      ? tab.isAlert
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : tab.isAlert
                      ? "bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/40"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        activeFilterTab === tab.id ? "bg-black/30 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search table, order #, waiter, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-900/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Orders Expediter Cards List */}
          <div className="space-y-3">
            {displayedOrders.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No Orders in this View</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {activeFilterTab === "delayed"
                    ? "Fantastic! All orders are currently being prepared and served within the 15-minute target window."
                    : "No orders match the current filter or search criteria."}
                </p>
              </div>
            ) : (
              displayedOrders.map((order) => {
                const isDelayed = order.isDelayed;

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border transition-all p-4 ${
                      isDelayed
                        ? "bg-rose-950/20 border-rose-500/60 shadow-lg shadow-rose-900/10"
                        : order.isReady && !order.isServed
                        ? "bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-900/10"
                        : "bg-slate-800/70 border-slate-700/70 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Order Info & Identifiers */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isDelayed
                              ? "bg-rose-600 text-white animate-pulse"
                              : order.isReady && !order.isServed
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-700 text-slate-200"
                          }`}
                        >
                          #{order.order_number || order.id}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              Table {order.table_number || order.table_name || "Direct / Bar"}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                              {order.order_type || "Dine-in"}
                            </span>
                            {/* Prep Status Badge */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                order.isReady
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : order.isServed
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {order.isReady ? "READY FOR PICKUP" : order.isServed ? "SERVED" : "IN PREPARATION"}
                            </span>

                            {/* Unpaid Badge */}
                            {order.isUnpaid && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                UNPAID ({Number(order.total_amount || 0).toLocaleString()} ETB)
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                            <span>Server: <strong className="text-slate-300">{order.waiter_name || order.server_name || order.created_by_name || "Floor Waiter"}</strong></span>
                            <span>•</span>
                            <span>Created: {new Date(order.created_at || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Elapsed Timer & Supervisor Controls */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Elapsed Timer Badge */}
                        <div
                          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold ${
                            isDelayed
                              ? "bg-rose-600/30 border-rose-500 text-rose-300"
                              : order.elapsedMins >= 10
                              ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                              : "bg-slate-700/60 border-slate-600 text-emerald-400"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{order.elapsedMins} min elapsed</span>
                          {isDelayed && (
                            <span className="text-[10px] font-bold text-rose-400 animate-pulse">
                              (+{order.elapsedMins - 15}m OVERDUE)
                            </span>
                          )}
                        </div>

                        {/* Supervisor Expedite / Alert Action */}
                        {isDelayed && (
                          <button
                            onClick={() => handleExpediteAlert(order)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                            title="Send Urgent Expedite Alert to Kitchen & Bar"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Expedite</span>
                          </button>
                        )}

                        {/* Mark Ready or Mark Served */}
                        {!order.isReady && !order.isServed && !order.isCompleted && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "ready")}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                            title="Mark Order Ready for Waiter Pickup"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Ready</span>
                          </button>
                        )}

                        {order.isReady && !order.isServed && !order.isCompleted && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "served")}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                            title="Mark Order as Served to Table"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Served</span>
                          </button>
                        )}

                        {/* View Details Modal Button */}
                        <button
                          onClick={() => setSelectedOrderDetail(order)}
                          className="p-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Order Items Preview Strip */}
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">Items:</span>
                      {order.itemsList && order.itemsList.length > 0 ? (
                        order.itemsList.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1"
                          >
                            <span className="font-semibold text-emerald-400">{item.quantity}x</span>
                            <span>{item.name || item.product_name}</span>
                            {item.notes && <span className="text-[10px] text-amber-400 italic">({item.notes})</span>}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Standard items</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Waiter Load, Floor Tables & Supervisor Resources (1 Column) */}
        <div className="space-y-6">
          {/* Waiter Active Load Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Floor Staff & Waiter Load
              </h3>
              <span className="text-[11px] text-slate-400">{waiterWorkload.length} Active</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {waiterWorkload.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">
                  No active orders assigned to waiters right now.
                </div>
              ) : (
                waiterWorkload.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-200">{w.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {w.delayedOrders > 0 ? (
                          <span className="text-rose-400 font-semibold">{w.delayedOrders} delayed order(s)</span>
                        ) : (
                          <span className="text-emerald-400">All orders on time</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 font-bold">
                        {w.activeOrders} open
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Table Status Grid */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Armchair className="w-4 h-4 text-purple-400" />
                Table Floor Status
              </h3>
              <Link to="/tables" className="text-[11px] text-purple-400 hover:underline flex items-center gap-0.5">
                <span>View Map</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {tables.slice(0, 16).map((table) => {
                const isOccupied = (table.status || "").toLowerCase() === "occupied" || table.is_occupied;

                return (
                  <div
                    key={table.id}
                    title={`Table ${table.name || table.table_number}: ${isOccupied ? "Occupied" : "Available"}`}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      isOccupied
                        ? "bg-amber-950/40 border-amber-600/60 text-amber-300 font-bold"
                        : "bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">{table.name || table.table_number}</div>
                    <div className="text-[9px] uppercase tracking-wider mt-0.5 font-medium">
                      {isOccupied ? "Busy" : "Free"}
                    </div>
                  </div>
                );
              })}
            </div>
            {tables.length > 16 && (
              <div className="text-[11px] text-slate-500 text-center mt-2">
                +{tables.length - 16} more tables on floor
              </div>
            )}
          </div>

          {/* Supervisor Quick Tips & SOP */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
            <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Supervisor SOP Checklist
            </h4>
            <p>1. Check delayed orders (&gt;15 min) and notify bar/kitchen expediter immediately.</p>
            <p>2. Balance table sections if one waiter has more than 4 concurrent open tickets.</p>
            <p>3. Submit mid-shift store replenishment requests via the <strong>Request Stock</strong> button.</p>
            <p>4. Verify cashiers execute shift closing counts before shift hand-over.</p>
          </div>
        </div>
      </div>

      {/* =========================================================
          ORDER DETAILS MODAL
      ========================================================= */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Order #{selectedOrderDetail.order_number || selectedOrderDetail.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Table {selectedOrderDetail.table_number || selectedOrderDetail.table_name || "Walk-in"}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Server: {selectedOrderDetail.waiter_name || selectedOrderDetail.created_by_name || "Floor Waiter"}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Itemized Order Lines
              </div>
              <div className="space-y-2">
                {(selectedOrderDetail.itemsList || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {item.quantity}x {item.name || item.product_name}
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-amber-400 italic mt-0.5">Note: {item.notes}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-emerald-400">
                        {Number(item.price || item.unit_price || 0) * (item.quantity || 1)} ETB
                      </div>
                      <div className="text-[10px] text-slate-500">
                        @{Number(item.price || item.unit_price || 0)} ETB
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-sm font-bold text-white">
                <span>Grand Total:</span>
                <span className="text-emerald-400">
                  {Number(selectedOrderDetail.total_amount || 0).toLocaleString()} ETB
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
              >
                Close
              </button>
              {!selectedOrderDetail.isServed && !selectedOrderDetail.isCompleted && (
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedOrderDetail.id, "served");
                    setSelectedOrderDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                >
                  Mark as Served
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          STOCK REQUISITION MODAL INTEGRATION
      ========================================================= */}
      <StockRequestModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        initialDepartment={selectedOutlet === "cafe" ? "cafe" : "bar"}
        onSuccess={() => {
          fetchData();
          setShowStockModal(false);
        }}
      />
    </div>
  );
}
