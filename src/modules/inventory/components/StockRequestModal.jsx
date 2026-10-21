import { useState, useEffect } from "react";
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Trash2,
  Wine,
  UtensilsCrossed,
  Coffee,
  Clock,
  RefreshCw,
  Layers,
  Printer,
  FileText,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import api from "../../../services/api";
import StoreRequisitionVoucherModal from "./StoreRequisitionVoucherModal";

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
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Multi-item requisition items list
  const [requestItems, setRequestItems] = useState([
    {
      id: Date.now(),
      productId: "",
      quantity: 1,
      notes: "",
    },
  ]);

  const [voucherNotes, setVoucherNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [newlyCreatedTransfer, setNewlyCreatedTransfer] = useState(null);

  // Requisitions history
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Voucher print modal state
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSuccessMsg("");
    setNewlyCreatedTransfer(null);
    setVoucherNotes("");
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

        if (department === "housekeeping") {
          return (
            item.department === "housekeeping" ||
            ["linen", "towel", "soap", "shampoo", "cleaning", "detergent", "sheet", "pillow", "amenity"].some(
              (k) => cat.includes(k) || name.includes(k)
            )
          );
        }

        // Default kitchen / restaurant
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

      // Prepopulate first row
      if (initialProduct) {
        const pid = String(initialProduct.product_id || initialProduct.id);
        setRequestItems([
          {
            id: Date.now(),
            productId: pid,
            quantity: 1,
            notes: "",
          },
        ]);
      } else if (listToUse.length > 0) {
        setRequestItems([
          {
            id: Date.now(),
            productId: String(listToUse[0].product_id || listToUse[0].id),
            quantity: 1,
            notes: "",
          },
        ]);
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
      const res = await api(`/inventory/transfers?toLocation=${department}&limit=15`);
      const list = res.transfers || res.data || (Array.isArray(res) ? res : []);
      setRecentTransfers(list);
    } catch (err) {
      console.error("Failed to load recent requisitions:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  // Add a new row to the multi-item table
  const handleAddRow = () => {
    const defaultProdId = productList.length > 0 ? String(productList[0].product_id || productList[0].id) : "";
    setRequestItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        productId: defaultProdId,
        quantity: 1,
        notes: "",
      },
    ]);
  };

  // Remove a row
  const handleRemoveRow = (rowId) => {
    if (requestItems.length <= 1) return;
    setRequestItems((prev) => prev.filter((it) => it.id !== rowId));
  };

  // Update a field in a specific row
  const handleUpdateRow = (rowId, field, value) => {
    setRequestItems((prev) =>
      prev.map((it) => {
        if (it.id !== rowId) return it;
        if (field === "quantity") {
          const val = Math.max(1, Number(value) || 1);
          return { ...it, quantity: val };
        }
        return { ...it, [field]: value };
      })
    );
  };

  // Stepper increment/decrement
  const handleStepQty = (rowId, delta) => {
    setRequestItems((prev) =>
      prev.map((it) => {
        if (it.id !== rowId) return it;
        const newQty = Math.max(1, Number(it.quantity || 1) + delta);
        return { ...it, quantity: newQty };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Validate items
    if (!requestItems || requestItems.length === 0) {
      setError("Please add at least one item to the requisition.");
      return;
    }

    const payloadItems = [];
    for (let i = 0; i < requestItems.length; i++) {
      const it = requestItems[i];
      const prodId = Number(it.productId);
      const qty = Number(it.quantity);

      if (!prodId) {
        setError(`Item row #${i + 1} does not have a product selected.`);
        return;
      }

      if (isNaN(qty) || qty <= 0) {
        setError(`Item row #${i + 1} must have a quantity of at least 1.`);
        return;
      }

      payloadItems.push({
        productId: prodId,
        quantity: qty,
        notes: it.notes ? it.notes.trim() : null,
      });
    }

    try {
      setSubmitting(true);

      const payload = {
        toLocation: department.toLowerCase(),
        items: payloadItems,
        notes: voucherNotes.trim() || undefined,
      };

      const res = await api("/inventory/transfers/request", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const created = res.data || res.transfer || res;
      setNewlyCreatedTransfer(created);

      setSuccessMsg(
        `Store Requisition Voucher (${created.transfer_number || "REQ"}) submitted! Notification sent to F&B Manager for verification.`
      );

      fetchRecentTransfers();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Stock request failed:", err);
      setError(err.message || "Failed to submit store requisition.");
    } finally {
      setSubmitting(false);
    }
  };

  const getDepartmentIcon = () => {
    if (department === "bar") return <Wine className="h-5 w-5 text-purple-600" />;
    if (department === "barista") return <Coffee className="h-5 w-5 text-amber-600" />;
    if (department === "cafe") return <Coffee className="h-5 w-5 text-emerald-600" />;
    return <UtensilsCrossed className="h-5 w-5 text-orange-600" />;
  };

  const totalVoucherQty = requestItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
        <div className="relative w-full max-w-4xl my-6 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white shadow-sm border border-slate-200">
                {getDepartmentIcon()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Store Requisition Voucher
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {department}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Request multiple stock items simultaneously from Central Store with 2-stage F&B and Storekeeper approval
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white">
            <button
              onClick={() => setActiveTab("request")}
              className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition ${
                activeTab === "request"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>New Store Requisition Voucher</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {requestItems.length} {requestItems.length === 1 ? "item" : "items"}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition ${
                activeTab === "history"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Requisition History</span>
              {recentTransfers.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                  {recentTransfers.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-shake">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
                {newlyCreatedTransfer && (
                  <button
                    onClick={() => setSelectedVoucherForPrint(newlyCreatedTransfer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm transition shrink-0"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>View / Print Voucher</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB 1: NEW VOUCHER FORM */}
            {activeTab === "request" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Department & Requisition Overview Header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                      Requesting Section
                    </span>
                    <span className="font-bold text-slate-800 capitalize">
                      {department} Department
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                      Source Warehouse
                    </span>
                    <span className="font-bold text-slate-800">
                      Central Store (Main Warehouse)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                      Approval Stages
                    </span>
                    <span className="font-semibold text-indigo-700">
                      1. F&B Check &rarr; 2. Storekeeper Issue
                    </span>
                  </div>
                </div>

                {/* Multi-Item Requisition Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      <span>Requested Items List</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Total: <strong className="text-slate-900">{requestItems.length}</strong> items &bull;{" "}
                      <strong className="text-indigo-600">{totalVoucherQty}</strong> units
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-2 w-20 text-center">Unit</th>
                          <th className="py-2.5 px-3 w-36 text-center">Quantity</th>
                          <th className="py-2.5 px-3">Item Remark</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {requestItems.map((row, index) => {
                          const matched = productList.find(
                            (p) => String(p.product_id || p.id) === String(row.productId)
                          );
                          const unit = matched?.unit || "pcs";
                          const storeStock =
                            matched?.main_quantity !== undefined
                              ? matched.main_quantity
                              : matched?.quantity !== undefined
                              ? matched.quantity
                              : null;

                          return (
                            <tr key={row.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-500">
                                {index + 1}
                              </td>

                              <td className="py-2 px-3">
                                <select
                                  value={row.productId}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, "productId", e.target.value)
                                  }
                                  disabled={loadingProducts}
                                  className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                  {productList.length === 0 ? (
                                    <option value="">No items found</option>
                                  ) : (
                                    productList.map((p) => {
                                      const pId = String(p.product_id || p.id);
                                      const pName = p.product_name || p.name;
                                      const pCat = p.category || p.category_name;
                                      return (
                                        <option key={pId} value={pId}>
                                          {pName} {pCat ? `(${pCat})` : ""}
                                        </option>
                                      );
                                    })
                                  )}
                                </select>
                                {storeStock !== null && (
                                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                                    Central Store Stock: <strong className="text-slate-600">{storeStock} {unit}</strong>
                                  </span>
                                )}
                              </td>

                              <td className="py-2 px-2 text-center text-[11px] font-semibold text-slate-600 uppercase">
                                {unit}
                              </td>

                              <td className="py-2 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStepQty(row.id, -1)}
                                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={row.quantity}
                                    onChange={(e) =>
                                      handleUpdateRow(row.id, "quantity", e.target.value)
                                    }
                                    className="w-14 text-center font-mono font-bold text-slate-900 text-xs py-1 px-1 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleStepQty(row.id, 1)}
                                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.notes}
                                  placeholder="e.g. VIP event / daily prep"
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, "notes", e.target.value)
                                  }
                                  className="w-full text-xs text-slate-700 py-1.5 px-2 border border-slate-200 rounded-lg placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                              </td>

                              <td className="py-2 px-2 text-center">
                                {requestItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRow(row.id)}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Remove row"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Another Item Row</span>
                    </button>

                    <span className="text-[11px] text-slate-400 italic">
                      * Auto-generates official Store Requisition Voucher ID
                    </span>
                  </div>
                </div>

                {/* Overall Voucher Notes / Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Voucher Reason / General Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={voucherNotes}
                    onChange={(e) => setVoucherNotes(e.target.value)}
                    placeholder="e.g. Restock for upcoming weekend rush / depleted stock replenishment"
                    className="w-full text-xs text-slate-800 p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || productList.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>
                      {submitting
                        ? "Submitting Voucher..."
                        : `Submit Voucher (${requestItems.length} items)`}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: VOUCHER HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800">
                    Recent Requisitions for {department.toUpperCase()}
                  </h3>
                  <button
                    onClick={fetchRecentTransfers}
                    disabled={loadingHistory}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingHistory ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Loading requisition vouchers...
                  </div>
                ) : recentTransfers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No recent store requisitions found for this section.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentTransfers.map((req) => {
                      const reqStatus = (req.status || "").toLowerCase();
                      const isPendingFB = reqStatus === "pending_fb" || reqStatus === "pending";
                      const isPendingStore = reqStatus === "pending_store";
                      const isCompleted = reqStatus === "completed";
                      const isRejected = reqStatus === "rejected" || reqStatus === "cancelled";

                      const itemsList = Array.isArray(req.items) ? req.items : [];

                      return (
                        <div
                          key={req.id}
                          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {req.transfer_number}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : isPendingStore
                                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                                    : isRejected
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : "bg-amber-100 text-amber-800 border border-amber-300"
                                }`}
                              >
                                {isCompleted
                                  ? "Approved & Issued"
                                  : isPendingStore
                                  ? "Checked by F&B (Awaiting Store)"
                                  : isRejected
                                  ? "Rejected"
                                  : "Awaiting F&B Check"}
                              </span>
                            </div>

                            <button
                              onClick={() => setSelectedVoucherForPrint(req)}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition border border-slate-200"
                            >
                              <Printer className="h-3 w-3" />
                              <span>View / Print Voucher</span>
                            </button>
                          </div>

                          {/* Items summary */}
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                            {itemsList.length === 0 ? (
                              <span>Requisition details</span>
                            ) : (
                              <div className="space-y-0.5">
                                {itemsList.slice(0, 3).map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-[11px]"
                                  >
                                    <span className="font-medium text-slate-800">
                                      &bull; {it.product_name || `Item #${it.product_id}`}
                                    </span>
                                    <span className="font-mono font-bold text-indigo-700">
                                      {it.quantity} {it.unit || "pcs"}
                                    </span>
                                  </div>
                                ))}
                                {itemsList.length > 3 && (
                                  <span className="text-[10px] text-slate-400 italic block">
                                    + {itemsList.length - 3} more items...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 3 Actors Status Bar */}
                          <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-slate-500 border-t border-slate-100">
                            <div>
                              <span className="font-semibold text-slate-700">Requested: </span>
                              {req.requested_by_username || "Staff"}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700">F&B Check: </span>
                              {req.checked_at ? (
                                <span className="text-blue-700 font-medium">Verified</span>
                              ) : (
                                <span className="text-amber-600">Pending</span>
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700">Store Issue: </span>
                              {isCompleted ? (
                                <span className="text-emerald-700 font-medium">Issued</span>
                              ) : isRejected ? (
                                <span className="text-rose-700 font-medium">Declined</span>
                              ) : (
                                <span className="text-slate-400">Pending</span>
                              )}
                            </div>
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
      </div>

      {/* View / Print Voucher Modal */}
      {selectedVoucherForPrint && (
        <StoreRequisitionVoucherModal
          isOpen={!!selectedVoucherForPrint}
          onClose={() => setSelectedVoucherForPrint(null)}
          transfer={selectedVoucherForPrint}
        />
      )}
    </>
  );
}
