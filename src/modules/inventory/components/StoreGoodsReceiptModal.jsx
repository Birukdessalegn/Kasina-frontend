import { useState, useEffect } from "react";
import {
  X,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Calendar,
  DollarSign,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Eye,
  ShieldCheck,
} from "lucide-react";
import api from "../../../services/api";

export default function StoreGoodsReceiptModal({ isOpen, onClose, onSuccess }) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiving, setReceiving] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verifiedItems, setVerifiedItems] = useState([]);

  const loadPendingOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api("/purchasing");
      const list = res.purchases || res.data || (Array.isArray(res) ? res : []);

      // Filter for orders not yet physically received
      const unreceived = list.filter((order) => {
        const s = String(order.status || "").toLowerCase();
        return s === "ordered" || s === "pending" || s === "approved" || s === "draft" || s === "in_transit";
      });

      setPendingOrders(unreceived);
      if (unreceived.length > 0 && !selectedOrder) {
        setSelectedOrder(unreceived[0]);
      }
    } catch (err) {
      console.error("Failed to load incoming orders:", err);
      setError("Failed to load incoming purchase orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError("");
      setVerificationNotes("");
      loadPendingOrders();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedOrder) {
      const items = selectedOrder.items || [];
      setVerifiedItems(
        items.map((it) => ({
          productId: it.product_id || it.productId,
          productName: it.product_name || it.productName || "Product",
          orderedQty: Number(it.quantity || 0),
          receivedQty: Number(it.quantity || 0),
          unitPrice: Number(it.unit_price || it.unitPrice || 0),
        }))
      );
    } else {
      setVerifiedItems([]);
    }
  }, [selectedOrder]);

  if (!isOpen) return null;

  const handleQtyChange = (index, value) => {
    const val = Number(value);
    setVerifiedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], receivedQty: isNaN(val) ? 0 : val };
      return updated;
    });
  };

  const handleConfirmReceipt = async () => {
    if (!selectedOrder) return;
    try {
      setReceiving(true);
      setError("");

      const payload = {
        verificationNotes: verificationNotes || "Goods physically verified and accepted into Central Store.",
        verifiedItems: verifiedItems.map((it) => ({
          productId: it.productId,
          receivedQuantity: it.receivedQty,
        })),
      };

      await api(`/purchasing/${selectedOrder.id}/receive`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert(`Delivery for ${selectedOrder.purchase_number || `#PO-${selectedOrder.id}`} successfully verified and stocked into Central Store!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to receive goods:", err);
      setError(err.message || "Failed to confirm physical goods receipt.");
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/60 p-3 sm:p-6 backdrop-blur-xs flex justify-center items-start sm:items-center">
      <div className="w-full max-w-3xl my-4 sm:my-auto rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[86vh]">
        {/* MODAL HEADER */}
        <div className="shrink-0 flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base">Physical Goods Receiving & Stock Verification</h3>
              <p className="text-xs text-blue-200">
                Store Manager physical inspection & Central Store stock crediting
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs font-semibold">Loading incoming deliveries...</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
              <h4 className="font-bold text-sm text-gray-800">All Purchase Deliveries Verified</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                There are currently no purchase orders awaiting store receipt. New purchase orders dispatched by the
                Purchasing team will appear here for verification.
              </p>
            </div>
          ) : (
            <>
              {/* ORDER SELECTOR PILLS */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Incoming Delivery ({pendingOrders.length} Pending)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {pendingOrders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-500 shadow-xs"
                            : "bg-gray-50/60 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900">
                            {order.purchase_number || `#PO-${order.id}`}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full capitalize">
                            {order.status || "Pending"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 font-medium mt-1 truncate">
                          Vendor: {order.supplier_name || "Supplier"}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Total: {Number(order.total_amount || 0).toLocaleString()} ETB
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTIVE ORDER INSPECTION CARD */}
              {selectedOrder && (
                <div className="rounded-2xl border border-gray-200 bg-slate-50/50 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-3 gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">
                        Physical Delivery Inspection — {selectedOrder.purchase_number || `#PO-${selectedOrder.id}`}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Supplier: <span className="font-semibold text-gray-800">{selectedOrder.supplier_name || "Direct Vendor"}</span> • Destination: <span className="font-semibold text-blue-700">Central Store</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {verifiedItems.length} Products Included
                      </span>
                    </div>
                  </div>

                  {/* ITEMS VERIFICATION TABLE */}
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold text-gray-600">Product</th>
                          <th className="px-4 py-2.5 font-semibold text-gray-600 text-center">Ordered Qty</th>
                          <th className="px-4 py-2.5 font-semibold text-gray-600 text-center">Verified Received Qty</th>
                          <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {verifiedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {item.productName}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-medium text-gray-600">
                              {item.orderedQty}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.orderedQty * 2}
                                value={item.receivedQty}
                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                className="w-20 text-center font-bold px-2 py-1 text-xs rounded-lg border border-gray-300 bg-emerald-50/30 text-emerald-900 focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-600">
                              {item.unitPrice.toLocaleString()} ETB
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* VERIFICATION NOTES */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Store Inspection & Condition Notes
                    </label>
                    <textarea
                      rows="2"
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="e.g. All packaging inspected, expiry dates valid, batches intact in Central Warehouse..."
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
          <p className="text-[11px] text-gray-500 max-w-sm">
            🛡️ Stock separation rule: Confirming physical receipt will immediately update Central Store inventory balances.
          </p>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition"
            >
              Cancel
            </button>

            {pendingOrders.length > 0 && selectedOrder && (
              <button
                onClick={handleConfirmReceipt}
                disabled={receiving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-60"
              >
                {receiving && <Loader2 size={14} className="animate-spin" />}
                <CheckCircle2 size={15} />
                <span>Verify & Credit Central Store Stock</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
