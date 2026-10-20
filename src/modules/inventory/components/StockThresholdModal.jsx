import { useState, useEffect } from "react";
import {
  X,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Store,
  Wine,
  UtensilsCrossed,
} from "lucide-react";
import api from "../../../services/api";

export default function StockThresholdModal({
  isOpen,
  onClose,
  onSuccess,
  product = null,
  initialDepartment = "all",
}) {
  const [department, setDepartment] = useState(initialDepartment);
  const [minimumStock, setMinimumStock] = useState("5");
  const [outOfStockThreshold, setOutOfStockThreshold] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!isOpen || !product) return;

    setError("");
    setSuccessMsg("");
    setDepartment(initialDepartment);

    let initialMin = 5;
    let initialOut = 0;

    if (initialDepartment === "bar") {
      initialMin = product.bar_minimum_stock ?? product.minimum_stock ?? 5;
    } else if (initialDepartment === "kitchen") {
      initialMin = product.kitchen_minimum_stock ?? product.minimum_stock ?? 5;
    } else if (initialDepartment === "main") {
      initialMin = product.main_minimum_stock ?? product.minimum_stock ?? 10;
    } else {
      initialMin = product.minimum_stock ?? 5;
    }

    setMinimumStock(String(initialMin || 5));
    setOutOfStockThreshold(String(initialOut || 0));
  }, [isOpen, product, initialDepartment]);

  const handleDepartmentChange = (newDept) => {
    setDepartment(newDept);
    if (!product) return;

    let min = 5;
    if (newDept === "bar") {
      min = product.bar_minimum_stock ?? product.minimum_stock ?? 5;
    } else if (newDept === "kitchen") {
      min = product.kitchen_minimum_stock ?? product.minimum_stock ?? 5;
    } else if (newDept === "main") {
      min = product.main_minimum_stock ?? product.minimum_stock ?? 10;
    } else {
      min = product.minimum_stock ?? 5;
    }

    setMinimumStock(String(min || 5));
  };

  if (!isOpen || !product) return null;

  const unit = product.unit || "pcs";
  const productId = product.product_id || product.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const minVal = Number(minimumStock);
    const outVal = Number(outOfStockThreshold);

    if (isNaN(minVal) || minVal < 0) {
      setError("Please enter a valid positive number for Low Stock limit.");
      return;
    }
    if (isNaN(outVal) || outVal < 0) {
      setError("Please enter a valid positive number for Out of Stock threshold.");
      return;
    }

    try {
      setSubmitting(true);

      if (department === "all") {
        await Promise.allSettled([
          api(`/inventory/product/${productId}`, {
            method: "PUT",
            body: JSON.stringify({ minimumStock: minVal }),
          }),
          api(`/inventory/departments/bar/product/${productId}`, {
            method: "PUT",
            body: JSON.stringify({ minimumStock: minVal }),
          }),
          api(`/inventory/departments/kitchen/product/${productId}`, {
            method: "PUT",
            body: JSON.stringify({ minimumStock: minVal }),
          }),
        ]);
      } else if (department === "main") {
        await api(`/inventory/product/${productId}`, {
          method: "PUT",
          body: JSON.stringify({ minimumStock: minVal }),
        });
      } else {
        await api(`/inventory/departments/${department}/product/${productId}`, {
          method: "PUT",
          body: JSON.stringify({ minimumStock: minVal }),
        });
      }

      setSuccessMsg("Threshold limits saved successfully!");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error("Failed to update stock alert settings:", err);
      setError(err.message || "Failed to update alert limits.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Stock Alert Minimum Limit
              </h2>
              <p className="text-[11px] text-slate-500">
                Set minimum threshold for low-stock alarms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Product Snapshot */}
        <div className="px-4 pt-3 pb-1 shrink-0">
          <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-2.5 flex items-center justify-between text-xs">
            <div className="truncate mr-2">
              <p className="font-bold text-slate-900 truncate">
                {product.product_name || product.name}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                {product.category_name || product.category || "General"}
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold text-slate-700">
                Current Stock: <span className="text-blue-700 font-black">{product.quantity || product.stock_quantity || 0}</span> {unit}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 pt-2 space-y-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Department Scope Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Apply Minimum Threshold To
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "all", label: "All Depts", icon: Sparkles },
                { id: "main", label: "Main Store", icon: Store },
                { id: "bar", label: "Bar", icon: Wine },
                { id: "kitchen", label: "Kitchen", icon: UtensilsCrossed },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = department === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleDepartmentChange(tab.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-bold transition border ${
                      isSelected
                        ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                        : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Minimum Stock Alert Limit ({unit})
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">Low-stock trigger</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                required
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                placeholder="e.g., 5"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                {unit}
              </span>
            </div>

            {/* Quick preset chips */}
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="text-[10px] font-semibold text-slate-400 mr-0.5">Quick Presets:</span>
              {[2, 5, 10, 20, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMinimumStock(String(num))}
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition border ${
                    minimumStock === String(num)
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500 leading-tight">
              When remaining quantity falls at or below this value, an alarm will display on the dashboard and low-stock list.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition disabled:opacity-50"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {submitting ? "Saving..." : "Save Minimum Limit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
