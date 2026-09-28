import { useState, useEffect } from "react";
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Wine,
  UtensilsCrossed,
  Coffee,
  Clock,
  RefreshCw,
  Layers,
} from "lucide-react";
import api from "../../../services/api";

export default function StockRequestModal({
  isOpen,
  onClose,
  onSuccess,
  initialProduct = null,
  initialDepartment = "bar",
}) {
  const department = (initialDepartment || "bar").toLowerCase();
  const [activeTab, setActiveTab] = useState("request"); // "request" | "history"

  const [productList, setProductList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [requestNotes, setRequestNotes] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Requisitions history
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSuccessMsg("");
    setQuantity(1);
    setRequestNotes("");
    setActiveTab("request");

    fetchDepartmentProducts();
    fetchRecentTransfers();
  }, [isOpen, initialProduct, department]);

  const fetchDepartmentProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await api("/inventory/multi-location").catch(() => api("/inventory"));
      const items = res.inventory || res.data || (Array.isArray(res) ? res : []);

      // Filter products relevant to this department
      const filtered = items.filter((item) => {
        const cat = (item.category || item.category_name || "").toLowerCase();
        const name = (item.name || item.product_name || "").toLowerCase();

        if (department === "bar") {
          return (
            item.department === "bar" ||
            item.bar_quantity !== undefined ||
            ["bar", "drink", "beverage", "liquor", "wine", "beer", "cocktail", "shots", "gin", "vodka", "whiskey"].some(
              (k) => cat.includes(k) || name.includes(k)
            )
          );
        }

        if (department === "barista") {
          return (
            item.department === "barista" ||
            ["coffee", "tea", "milk", "bean", "sugar", "syrup", "macchiato", "cappuccino", "espresso", "hot", "beverage"].some(
              (k) => cat.includes(k) || name.includes(k)
            )
          );
        }

        if (department === "cafe") {
          return (
            item.department === "cafe" ||
            ["cafe", "pastry", "breakfast", "bread", "cake", "snack", "sandwich", "toast"].some(
              (k) => cat.includes(k) || name.includes(k)
            )
          );
        }

        // Default kitchen
        return (
          item.department === "kitchen" ||
          item.kitchen_quantity !== undefined ||
          ["kitchen", "food", "meat", "dish", "plate", "snack", "vegetable", "oil", "spice", "flour"].some(
            (k) => cat.includes(k) || name.includes(k)
          )
        );
      });

      const listToUse = filtered.length > 0 ? filtered : items;
      setProductList(listToUse);

      if (initialProduct) {
        const pid = String(initialProduct.product_id || initialProduct.id);
        setSelectedProductId(pid);
      } else if (listToUse.length > 0) {
        setSelectedProductId(String(listToUse[0].product_id || listToUse[0].id));
      }
    } catch (err) {
      console.error("Failed to load products for stock request:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchRecentTransfers = async () => {
    try {
      setLoadingHistory(true);
      const res = await api(`/inventory/transfers?toLocation=${department}&limit=10`);
      const list = res.transfers || res.data || (Array.isArray(res) ? res : []);
      setRecentTransfers(list);
    } catch (err) {
      console.error("Failed to load recent requisitions:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const matchedProduct = productList.find(
    (p) => String(p.product_id || p.id) === String(selectedProductId)
  );

  const productName =
    matchedProduct?.product_name ||
    matchedProduct?.name ||
    initialProduct?.product_name ||
    initialProduct?.name ||
    "Selected Item";

  const unit =
    matchedProduct?.unit ||
    initialProduct?.unit ||
    (department === "bar" ? "bottle" : department === "barista" ? "liter/kg" : "unit");

  const handleAdjust = (delta) => {
    setQuantity((prev) => Math.max(1, Number(prev || 0) + delta));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const reqQty = Number(quantity);
    const prodId = Number(selectedProductId || initialProduct?.product_id || initialProduct?.id);

    if (!prodId) {
      setError("Please select an item to request.");
      return;
    }

    if (isNaN(reqQty) || reqQty <= 0) {
      setError("Please enter a valid quantity (minimum 1).");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        toLocation: department.toLowerCase(),
        items: [
          {
            productId: prodId,
            quantity: reqQty,
            notes: requestNotes.trim() || `Restock request from ${department.toUpperCase()}`,
          },
        ],
        notes: requestNotes.trim() || `Restock request for ${productName} (${department.toUpperCase()})`,
      };

      const res = await api("/inventory/transfers/request", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMsg(`Requested ${reqQty} ${unit}(s) of ${productName}!`);

      await fetchRecentTransfers();

      setTimeout(() => {
        if (onSuccess) onSuccess(res.data);
        setActiveTab("history");
        setSuccessMsg("");
      }, 1000);
    } catch (err) {
      console.error("Stock request failed:", err);
      setError(err.message || "Failed to submit stock request.");
    } finally {
      setSubmitting(false);
    }
  };

  const isBar = department === "bar";
  const isBarista = department === "barista";
  const isCafe = department === "cafe";

  const stationTitle = isBarista
    ? "Barista Coffee Station"
    : isBar
    ? "Bar & Lounge"
    : isCafe
    ? "Cafe Kitchen"
    : "Kitchen Station";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-xs ${
                isBarista
                  ? "bg-amber-700"
                  : isBar
                  ? "bg-purple-600"
                  : isCafe
                  ? "bg-orange-500"
                  : "bg-amber-600"
              }`}
            >
              {isBarista ? (
                <Coffee className="h-5 w-5" />
              ) : isBar ? (
                <Wine className="h-5 w-5" />
              ) : (
                <UtensilsCrossed className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                {stationTitle} Stock Request
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Requisition from Central Warehouse / Main Store
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* TABS (Request vs History) */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("request")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === "request"
                ? isBarista
                  ? "border-amber-700 text-amber-900"
                  : isBar
                  ? "border-purple-600 text-purple-900"
                  : "border-amber-600 text-amber-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            New Stock Request
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === "history"
                ? isBarista
                  ? "border-amber-700 text-amber-900"
                  : isBar
                  ? "border-purple-600 text-purple-900"
                  : "border-amber-600 text-amber-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Recent Requests</span>
            {recentTransfers.length > 0 && (
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-700">
                {recentTransfers.length}
              </span>
            )}
          </button>
        </div>

        {/* MODAL BODY */}
        {activeTab === "request" ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* CONFIRMATION PROMPT */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Submit request to storekeeper to replenish stock items.</span>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SUCCESS ALERT */}
            {successMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ITEM NAME */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Item to Request
              </label>
              {initialProduct ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 shrink-0">
                    <Package className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-slate-900 truncate">{productName}</h4>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">
                      Stock Unit: {unit}
                    </p>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={loadingProducts}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white"
                >
                  {productList.length === 0 ? (
                    <option value="">Loading available items...</option>
                  ) : (
                    productList.map((p) => {
                      const id = p.product_id || p.id;
                      const name = p.product_name || p.name;
                      const u = p.unit || "unit";
                      return (
                        <option key={id} value={id}>
                          {name} ({u})
                        </option>
                      );
                    })
                  )}
                </select>
              )}
            </div>

            {/* QUANTITY INPUT */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Quantity to Request ({unit})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjust(-1)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-200 active:scale-95 transition cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-2.5 text-center text-lg font-black text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
                  required
                />

                <button
                  type="button"
                  onClick={() => handleAdjust(1)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-200 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* QUICK PRESETS */}
              <div className="mt-2.5 flex items-center justify-center gap-2">
                {[1, 2, 5, 10, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className={`rounded-xl px-3 py-1 text-xs font-black border transition cursor-pointer ${
                      Number(quantity) === preset
                        ? isBarista
                          ? "border-amber-700 bg-amber-700 text-white"
                          : isBar
                          ? "border-purple-600 bg-purple-600 text-white"
                          : "border-amber-600 bg-amber-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* NOTES / REASON */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Note / Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Running out during breakfast rush..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !!successMsg}
                className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black text-white shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50 ${
                  isBarista
                    ? "bg-amber-700 hover:bg-amber-800 shadow-amber-700/20"
                    : isBar
                    ? "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
                    : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? "Sending..." : "Submit Requisition"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* REQUISITIONS HISTORY TAB */
          <div className="p-6 space-y-4 max-h-[460px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                Recent requisitions from {stationTitle}:
              </p>
              <button
                type="button"
                onClick={fetchRecentTransfers}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 transition"
              >
                <RefreshCw className={`h-3 w-3 ${loadingHistory ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                Loading requisitions...
              </div>
            ) : recentTransfers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                <Layers className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No requisitions yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Submit a new stock request to see it tracked here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentTransfers.map((req) => {
                  const status = (req.status || "pending").toLowerCase();
                  const isCompleted = status === "completed";
                  const isRejected = status === "rejected";

                  return (
                    <div
                      key={req.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">
                          {req.transfer_number}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isRejected
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                          }`}
                        >
                          {isCompleted
                            ? "✓ Restocked"
                            : isRejected
                            ? "✕ Rejected"
                            : "● Pending Store Dispatch"}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="mt-2 text-xs font-bold text-slate-700">
                        {req.items && req.items.length > 0 ? (
                          req.items.map((it, idx) => (
                            <span key={idx} className="mr-2 inline-block bg-slate-100 rounded-lg px-2 py-0.5 text-[11px]">
                              {it.quantity}x {it.product_name || `Item #${it.product_id}`} ({it.unit || "unit"})
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">
                            {req.total_quantity || 1} unit(s) requested
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-1.5">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(req.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        {req.requested_by_username && (
                          <span>Requested by @{req.requested_by_username}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
