import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Coffee,
  CheckCircle2,
  Play,
  Check,
  RefreshCw,
  Volume2,
  VolumeX,
  Clock,
  AlertTriangle,
  Search,
  Sparkles,
  Flame,
  ClipboardList,
  Layers,
  Filter,
} from "lucide-react";
import api from "../../../services/api";
import audioService from "../../../services/audioService";
import NewOrderAlertModal from "../../../components/common/NewOrderAlertModal";

function BaristaPage() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [alertOrder, setAlertOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "new" | "preparing" | "ready"
  const [filterMode, setFilterMode] = useState("coffee"); // "coffee" | "all"
  const [searchQuery, setSearchQuery] = useState("");

  const prevOrdersRef = useRef(null);

  // Sync tab with URL route if accessing /barista/new, /barista/preparing, etc.
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.endsWith("/new")) {
      setActiveTab("new");
    } else if (path.endsWith("/preparing")) {
      setActiveTab("preparing");
    } else if (path.endsWith("/ready")) {
      setActiveTab("ready");
    } else {
      setActiveTab("all");
    }
  }, [location.pathname]);

  // Helper to determine if an item is a coffee or hot beverage
  const isCoffeeItem = (item) => {
    const name = (item.name || item.product_name || "").toLowerCase();
    const cat = (item.category_name || item.category_type || "").toLowerCase();
    return (
      cat.includes("hot") ||
      cat.includes("coffee") ||
      cat.includes("tea") ||
      cat.includes("beverage") ||
      name.includes("espresso") ||
      name.includes("cappuccino") ||
      name.includes("latte") ||
      name.includes("macchiato") ||
      name.includes("coffee") ||
      name.includes("tea") ||
      name.includes("mocha") ||
      name.includes("americano")
    );
  };

  // ============================================================
  // FETCH ORDERS
  // ============================================================
  const fetchOrders = async () => {
    try {
      setError("");
      const barRes = await api("/bar/orders").catch(() => []);
      const fetchedOrders = barRes?.orders || barRes?.data || (Array.isArray(barRes) ? barRes : []);

      if (prevOrdersRef.current !== null) {
        // Detect new incoming coffee order
        const newOrder = fetchedOrders.find(
          (o) =>
            (o.status?.toLowerCase() === "pending" || o.status?.toLowerCase() === "new") &&
            !prevOrdersRef.current.some((old) => old.id === o.id)
        );

        if (newOrder) {
          if (soundEnabled) {
            audioService.playNewOrderSound();
          }
          setAlertOrder(newOrder);
        }
      }

      prevOrdersRef.current = fetchedOrders;
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Failed to fetch barista orders:", err);
      setError(err.message || "Failed to load coffee station orders");
    } finally {
      setLoading(false);
    }
  };

  // Poll for incoming orders every 5 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // UPDATE ORDER STATUS
  // ============================================================
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrder(orderId);
      await api(`/bar/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchOrders();
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert(err.message || "Failed to update ticket status");
    } finally {
      setUpdatingOrder(null);
    }
  };

  // Filter orders based on active tab, filter mode, and search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      const st = (order.status || "").toLowerCase();
      if (activeTab === "new" && st !== "pending" && st !== "new" && st !== "confirmed") return false;
      if (activeTab === "preparing" && st !== "preparing") return false;
      if (activeTab === "ready" && st !== "ready") return false;

      // Filter Mode: only coffee/hot drinks vs all beverages
      if (filterMode === "coffee") {
        const hasCoffee = (order.items || []).some(isCoffeeItem);
        // If filter is strictly coffee and order has no coffee items, omit
        if (!hasCoffee && (order.items || []).length > 0) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const orderNum = String(order.order_number || order.id).toLowerCase();
        const tableNum = String(order.table_number || "").toLowerCase();
        const waiterName = String(order.waiter_name || "").toLowerCase();
        const hasMatchingItem = (order.items || []).some((it) =>
          (it.name || it.product_name || "").toLowerCase().includes(query)
        );
        return orderNum.includes(query) || tableNum.includes(query) || waiterName.includes(query) || hasMatchingItem;
      }

      return true;
    });
  }, [orders, activeTab, filterMode, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    let newCount = 0;
    let prepCount = 0;
    let readyCount = 0;

    orders.forEach((o) => {
      const st = (o.status || "").toLowerCase();
      if (st === "pending" || st === "new" || st === "confirmed") newCount++;
      else if (st === "preparing") prepCount++;
      else if (st === "ready") readyCount++;
    });

    return {
      all: orders.length,
      new: newCount,
      preparing: prepCount,
      ready: readyCount,
    };
  }, [orders]);

  // Elapsed time helper
  const getElapsedMinutes = (dateString) => {
    if (!dateString) return 0;
    const diff = Date.now() - new Date(dateString).getTime();
    return Math.floor(diff / 60000);
  };

  return (
    <div className="space-y-6">
      {/* =========================================================
          TOP STATS & CONTROLS BANNER
      ========================================================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {/* New Orders Card */}
        <div
          onClick={() => setActiveTab("new")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === "new"
              ? "border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-500/20"
              : "border-slate-200 bg-white hover:border-amber-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">New Tickets</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.new}</span>
            {counts.new > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                Needs Brew
              </span>
            )}
          </div>
        </div>

        {/* Brewing Card */}
        <div
          onClick={() => setActiveTab("preparing")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === "preparing"
              ? "border-orange-500 bg-orange-50/80 shadow-md ring-2 ring-orange-500/20"
              : "border-slate-200 bg-white hover:border-orange-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Brewing Now</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.preparing}</span>
            <span className="text-xs font-medium text-slate-400">in preparation</span>
          </div>
        </div>

        {/* Ready Card */}
        <div
          onClick={() => setActiveTab("ready")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === "ready"
              ? "border-emerald-500 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20"
              : "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ready for Pickup</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.ready}</span>
            <span className="text-xs font-medium text-slate-400">waiting for waiter</span>
          </div>
        </div>

        {/* Total Card */}
        <div
          onClick={() => setActiveTab("all")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === "all"
              ? "border-blue-500 bg-blue-50/80 shadow-md ring-2 ring-blue-500/20"
              : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">All Shift Tickets</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.all}</span>
            <span className="text-xs font-medium text-slate-400">total tickets</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          FILTER BAR & AUDIO CONTROLS
      ========================================================= */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search table, order #, or drink..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Coffee Focus Mode Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setFilterMode("coffee")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                filterMode === "coffee"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              Coffee & Hot Drinks
            </button>
            <button
              onClick={() => setFilterMode("all")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                filterMode === "all"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              All Drinks
            </button>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              soundEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
            title={soundEnabled ? "Mute order alerts" : "Unmute order alerts"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{soundEnabled ? "Sound ON" : "Muted"}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          ERROR / EMPTY / ORDER GRID
      ========================================================= */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading Coffee Station Tickets...</p>
          <p className="text-xs text-slate-400">Syncing live orders from waiters</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
            <Coffee className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Orders in this Section</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {activeTab === "new"
              ? "All caught up! No pending coffee tickets waiting to be prepared."
              : activeTab === "preparing"
              ? "Nothing is currently brewing. Pick up a new ticket when ready!"
              : "No orders match your selected filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOrders.map((order) => {
            const status = (order.status || "pending").toLowerCase();
            const elapsedMins = getElapsedMinutes(order.created_at);
            const isUpdating = updatingOrder === order.id;

            const isPending = status === "pending" || status === "new" || status === "confirmed";
            const isPreparing = status === "preparing";
            const isReady = status === "ready";

            return (
              <div
                key={order.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition-all hover:shadow-md ${
                  isPending
                    ? "border-amber-300 ring-2 ring-amber-400/20"
                    : isPreparing
                    ? "border-orange-300 ring-2 ring-orange-400/20"
                    : "border-emerald-300 bg-emerald-50/20"
                }`}
              >
                <div>
                  {/* Card Header: Table & Timer */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold text-xs">
                        <Coffee className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {order.table_number ? `Table ${order.table_number}` : "Cafe Counter"}
                        </p>
                        <p className="text-[10px] text-slate-400">Order #{order.order_number || order.id}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          elapsedMins > 10
                            ? "bg-rose-100 text-rose-700 animate-pulse"
                            : elapsedMins > 5
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {elapsedMins}m ago
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Waiter: {order.waiter_name || "Server"}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Items List */}
                  <div className="my-3 space-y-2">
                    {(order.items || []).map((item, idx) => {
                      const isCoffee = isCoffeeItem(item);
                      return (
                        <div
                          key={item.id || idx}
                          className={`rounded-xl p-2.5 transition ${
                            isCoffee
                              ? "bg-amber-50/60 border border-amber-100/80"
                              : "bg-slate-50 border border-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-800">
                              {item.quantity}x {item.name || item.product_name}
                            </span>
                            {isCoffee && (
                              <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                Hot Brew
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="mt-1 text-[11px] font-medium text-amber-900 italic bg-amber-100/60 rounded px-1.5 py-0.5">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="border-t border-slate-100 pt-3">
                  {isPending && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "preparing")}
                      disabled={isUpdating}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition hover:brightness-105 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {isUpdating ? "Starting..." : "Start Brewing"}
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "ready")}
                      disabled={isUpdating}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:brightness-105 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                      {isUpdating ? "Marking..." : "Mark Ready"}
                    </button>
                  )}

                  {isReady && (
                    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Ready for Pickup
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Order Alert Modal */}
      {alertOrder && (
        <NewOrderAlertModal
          order={alertOrder}
          department="barista"
          onAccept={(ord) => {
            updateOrderStatus(ord?.id || alertOrder.id, "preparing");
            setAlertOrder(null);
          }}
          onDismiss={() => setAlertOrder(null)}
          onClose={() => setAlertOrder(null)}
        />
      )}
    </div>
  );
}

export default BaristaPage;
