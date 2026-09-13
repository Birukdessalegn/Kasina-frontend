import { useEffect, useState, useRef, useMemo } from "react";
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  RefreshCw,
  Search,
  UtensilsCrossed
} from "lucide-react";
import api from "../../../services/api";
import audioService from "../../../services/audioService";
import NewOrderAlertModal from "../../../components/common/NewOrderAlertModal";

export default function RestaurantKitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertOrder, setAlertOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("active"); // "active" | "pending" | "preparing" | "ready" | "history"
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const prevOrdersRef = useRef(null);

  const fetchRestaurantOrders = async () => {
    try {
      setError("");
      const res = await api("/kitchen?kitchen_outlet_id=RESTAURANT_KITCHEN");
      const list = res.orders || res.data?.orders || res.data || (Array.isArray(res) ? res : []);

      // Sound notification on new pending order
      if (prevOrdersRef.current !== null) {
        const newOrder = list.find(
          (o) =>
            (o.status === "pending" || o.status === "new" || o.status === "confirmed") &&
            !prevOrdersRef.current.some((old) => old.id === o.id)
        );
        if (newOrder) {
          audioService.playNewOrderSound();
          setAlertOrder(newOrder);
        }
      }

      prevOrdersRef.current = list;
      setOrders(list);
    } catch (err) {
      console.error("Failed to fetch restaurant kitchen orders:", err);
      setError(err.message || "Failed to load restaurant kitchen orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurantOrders();
    const interval = setInterval(fetchRestaurantOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setActionLoadingId(orderId);
      await api(`/kitchen/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchRestaurantOrders();
    } catch (err) {
      alert(err.message || "Failed to update order status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "").toLowerCase();

      if (filterStatus === "active") {
        if (s === "served" || s === "completed" || s === "cancelled") return false;
      } else if (filterStatus === "pending") {
        if (s !== "pending" && s !== "new" && s !== "confirmed") return false;
      } else if (filterStatus === "preparing") {
        if (s !== "preparing") return false;
      } else if (filterStatus === "ready") {
        if (s !== "ready") return false;
      } else if (filterStatus === "history") {
        if (s !== "served" && s !== "completed") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = String(o.order_number || "").toLowerCase().includes(q);
        const matchesTable = String(o.table_number || "").toLowerCase().includes(q);
        const matchesItems = (o.items || []).some((it) =>
          String(it.product_name || "").toLowerCase().includes(q)
        );
        return matchesNum || matchesTable || matchesItems;
      }

      return true;
    });
  }, [orders, filterStatus, searchQuery]);

  const activeCount = orders.filter(
    (o) => !["served", "completed", "cancelled"].includes((o.status || "").toLowerCase())
  ).length;

  const pendingCount = orders.filter(
    (o) => ["pending", "new", "confirmed"].includes((o.status || "").toLowerCase())
  ).length;

  const preparingCount = orders.filter(
    (o) => (o.status || "").toLowerCase() === "preparing"
  ).length;

  const readyCount = orders.filter(
    (o) => (o.status || "").toLowerCase() === "ready"
  ).length;

  return (
    <div className="space-y-6">
      {/* Station Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Main Dining Culinary Division
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
              ● Live Station Feed
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Restaurant Kitchen Display (KDS)
          </h1>
          <p className="text-xs sm:text-sm text-blue-200/80 mt-1">
            Dedicated preparation screen for Line Chef &amp; Restaurant Supervisor. Displays main courses, steaks, traditional dinners &amp; table orders.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchRestaurantOrders}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-xs hover:bg-white/20 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => setFilterStatus("active")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "active"
              ? "border-blue-500 bg-blue-50 shadow-xs"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Active</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{activeCount}</p>
        </button>

        <button
          onClick={() => setFilterStatus("pending")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "pending"
              ? "border-blue-500 bg-blue-50 shadow-xs"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-600">Pending / New</span>
            {pendingCount > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
        </button>

        <button
          onClick={() => setFilterStatus("preparing")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "preparing"
              ? "border-blue-500 bg-blue-50 shadow-xs"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <span className="text-[11px] font-bold uppercase text-blue-600">In Cooking</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{preparingCount}</p>
        </button>

        <button
          onClick={() => setFilterStatus("ready")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "ready"
              ? "border-emerald-500 bg-emerald-50 shadow-xs"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <span className="text-[11px] font-bold uppercase text-emerald-600">Ready on Pass</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{readyCount}</p>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "active", label: "Active Orders" },
            { id: "pending", label: "Pending" },
            { id: "preparing", label: "Cooking" },
            { id: "ready", label: "Ready" },
            { id: "history", label: "Served History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restaurant order #, table, dish..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm font-semibold text-slate-400">
          Loading Restaurant Kitchen queue...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Flame className="h-10 w-10 text-blue-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Orders in Restaurant Kitchen</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Orders placed from the Main Dining room &amp; Restaurant tables will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const status = (order.status || "").toLowerCase();
            const isPending = status === "pending" || status === "new" || status === "confirmed";
            const isPreparing = status === "preparing";
            const isReady = status === "ready";
            const isCompleted = status === "completed" || status === "served";

            const timeStr = order.created_at
              ? new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Just now";

            return (
              <div
                key={order.id}
                className={`flex flex-col justify-between rounded-2xl border transition shadow-xs overflow-hidden ${
                  isPending
                    ? "border-amber-300 bg-amber-50/40"
                    : isPreparing
                    ? "border-blue-300 bg-blue-50/40"
                    : isReady
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* Card Header */}
                <div className="border-b border-slate-200/80 p-4 bg-white/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-slate-900">
                        #{order.order_number || order.id}
                      </span>
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-800">
                        Table {order.table_number || "Dining Room"}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isPending
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : isPreparing
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : isReady
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {order.status || "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {timeStr}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700">Main Kitchen Station</span>
                  </div>

                  {order.notes && (
                    <div className="mt-2 rounded-lg bg-blue-100/70 p-2 text-xs font-semibold text-blue-900 border border-blue-200/60">
                      Note: {order.notes}
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="p-4 space-y-2 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Dishes &amp; Courses ({(order.items || []).length})
                  </span>
                  <div className="space-y-1.5 divide-y divide-slate-100">
                    {(order.items || []).map((it, idx) => (
                      <div key={idx} className="pt-1.5 flex items-start justify-between text-xs">
                        <div className="pr-2">
                          <span className="font-bold text-slate-800">
                            {it.product_name || "Kitchen Dish"}
                          </span>
                          {it.item_notes && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">
                              • {it.item_notes}
                            </p>
                          )}
                        </div>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-900 shrink-0">
                          x{it.quantity || 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="border-t border-slate-200/80 p-3 bg-white/90">
                  {isPending && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "preparing")}
                      disabled={actionLoadingId === order.id}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Cooking
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "ready")}
                      disabled={actionLoadingId === order.id}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Ready on Pass
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "completed")}
                      disabled={actionLoadingId === order.id}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Order Picked Up by Waiter
                    </button>
                  )}

                  {isCompleted && (
                    <div className="text-center text-xs font-bold text-slate-400 py-1">
                      Completed &bull; Served
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Order Alert Popup */}
      <NewOrderAlertModal
        order={alertOrder}
        onClose={() => setAlertOrder(null)}
      />
    </div>
  );
}
