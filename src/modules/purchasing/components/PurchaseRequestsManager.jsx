import { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Building2,
  Store,
  DollarSign,
  ChevronRight,
  Eye,
  Trash2,
  X,
  Send,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import api from "../../../services/api";

export default function PurchaseRequestsManager({ onConvertToPO, onRequestCreated }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Reference Data for modals
  const [outlets, setOutlets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Create Form State
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    departmentId: "",
    outletId: "",
    priority: "normal",
    notes: "",
    items: [{ productId: "", quantity: 1, estimatedPrice: "", notes: "" }],
  });

  // Review State
  const [reviewAction, setReviewAction] = useState("approved");
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Convert State
  const [convertSupplierId, setConvertSupplierId] = useState("");
  const [converting, setConverting] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api("/purchasing/requests");
      const list = res.requests || res.data || (Array.isArray(res) ? res : []);
      setRequests(list);
    } catch (err) {
      console.error("Failed to load purchase requests:", err);
      setError(err.message || "Failed to load purchase requests.");
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [outRes, deptRes, prodRes, supRes] = await Promise.all([
        api("/employees/outlets").catch(() => ({ outlets: [] })),
        api("/employees/departments").catch(() => ({ departments: [] })),
        api("/products").catch(() => ({ products: [] })),
        api("/purchasing/suppliers").catch(() => ({ suppliers: [] })),
      ]);

      if (outRes?.outlets) setOutlets(outRes.outlets);
      if (deptRes?.departments) setDepartments(deptRes.departments);
      if (prodRes?.products || prodRes?.data) setProducts(prodRes.products || prodRes.data || []);
      if (supRes?.suppliers || supRes?.data) setSuppliers(supRes.suppliers || supRes.data || []);
    } catch (err) {
      console.error("Failed to load lookup data:", err);
    }
  };

  useEffect(() => {
    loadRequests();
    loadLookups();
  }, []);

  const openDetails = async (req) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
    try {
      setLoadingDetails(true);
      const res = await api(`/purchasing/requests/${req.id}`);
      setRequestDetails(res.request || res.data || req);
    } catch (err) {
      console.error("Failed to load request details:", err);
      setRequestDetails(req);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openCreate = () => {
    setCreateForm({
      departmentId: "",
      outletId: "",
      priority: "normal",
      notes: "",
      items: [{ productId: "", quantity: 1, estimatedPrice: "", notes: "" }],
    });
    setShowCreateModal(true);
  };

  const handleAddItem = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, estimatedPrice: "", notes: "" }],
    }));
  };

  const handleRemoveItem = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setCreateForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Prepopulate estimated price if product changed
      if (field === "productId" && value) {
        const prod = products.find((p) => String(p.id) === String(value));
        if (prod && (prod.cost_price || prod.price)) {
          newItems[index].estimatedPrice = String(prod.cost_price || prod.price);
        }
      }
      return { ...prev, items: newItems };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      const validItems = createForm.items.filter((item) => item.productId && Number(item.quantity) > 0);
      if (validItems.length === 0) {
        alert("Please add at least one valid product and quantity.");
        return;
      }

      const payload = {
        departmentId: createForm.departmentId ? Number(createForm.departmentId) : null,
        outletId: createForm.outletId ? Number(createForm.outletId) : null,
        priority: createForm.priority,
        notes: createForm.notes,
        items: validItems.map((it) => ({
          productId: Number(it.productId),
          quantity: Number(it.quantity),
          estimatedPrice: it.estimatedPrice ? Number(it.estimatedPrice) : 0,
          notes: it.notes || null,
        })),
      };

      await api("/purchasing/requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      await loadRequests();
      onRequestCreated?.();
      alert("Purchase request submitted successfully!");
    } catch (err) {
      console.error("Failed to create purchase request:", err);
      alert(err.message || "Failed to submit purchase request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      setReviewing(true);
      await api(`/purchasing/requests/${selectedRequest.id}/review`, {
        method: "PUT",
        body: JSON.stringify({
          status: reviewAction,
          rejectionReason: reviewAction === "rejected" ? rejectionReason : null,
        }),
      });

      setShowReviewModal(false);
      await loadRequests();
      alert(`Request has been marked as ${reviewAction}.`);
    } catch (err) {
      console.error("Failed to review request:", err);
      alert(err.message || "Failed to update review status.");
    } finally {
      setReviewing(false);
    }
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !convertSupplierId) {
      alert("Please select a vendor/supplier for this Purchase Order.");
      return;
    }

    try {
      setConverting(true);
      const res = await api(`/purchasing/requests/${selectedRequest.id}/convert-po`, {
        method: "POST",
        body: JSON.stringify({
          supplierId: Number(convertSupplierId),
        }),
      });

      setShowConvertModal(false);
      await loadRequests();
      alert(`Purchase Order ${res.purchaseOrder?.purchase_number || ""} created successfully!`);
      onConvertToPO?.(res.purchaseOrder);
    } catch (err) {
      console.error("Failed to convert to purchase order:", err);
      alert(err.message || "Failed to convert to purchase order.");
    } finally {
      setConverting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const s = (r.status || "").toLowerCase();
    const matchStatus = statusFilter === "all" || s === statusFilter;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      String(r.request_number || "").toLowerCase().includes(q) ||
      String(r.department_name || "").toLowerCase().includes(q) ||
      String(r.outlet_name || "").toLowerCase().includes(q) ||
      String(r.requested_by_name || "").toLowerCase().includes(q);

    return matchStatus && matchSearch;
  });

  const pendingCount = requests.filter((r) => (r.status || "").toLowerCase() === "pending").length;
  const approvedCount = requests.filter((r) => (r.status || "").toLowerCase() === "approved").length;
  const convertedCount = requests.filter((r) => (r.status || "").toLowerCase() === "converted_to_po").length;

  return (
    <div className="space-y-6">
      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Requests</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{requests.length}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Department requisitions</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Review</p>
              <h3 className="text-2xl font-bold text-amber-900 mt-1">{pendingCount}</h3>
              <p className="text-xs text-amber-700 mt-0.5">Awaiting Purchasing approval</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Approved for PO</p>
              <h3 className="text-2xl font-bold text-emerald-900 mt-1">{approvedCount}</h3>
              <p className="text-xs text-emerald-700 mt-0.5">Ready to order from vendor</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Converted to PO</p>
              <h3 className="text-2xl font-bold text-purple-900 mt-1">{convertedCount}</h3>
              <p className="text-xs text-purple-700 mt-0.5">Purchase orders dispatched</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <ShoppingCart size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              statusFilter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              statusFilter === "approved"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter("converted_to_po")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              statusFilter === "converted_to_po"
                ? "bg-purple-600 text-white"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100"
            }`}
          >
            Converted ({convertedCount})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search request #, dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none w-56 transition"
            />
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
          >
            <Plus size={15} />
            <span>New Requisition</span>
          </button>
        </div>
      </div>

      {/* REQUESTS TABLE */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-500 uppercase">Request #</th>
                <th className="px-5 py-3 font-semibold text-gray-500 uppercase">Requesting Outlet</th>
                <th className="px-5 py-3 font-semibold text-gray-500 uppercase">Requester</th>
                <th className="px-5 py-3 font-semibold text-gray-500 uppercase">Items / Est. Total</th>
                <th className="px-5 py-3 font-semibold text-gray-500 uppercase">Priority</th>
                <th className="px-5 py-3 font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
                    Loading purchase requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    No purchase requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const status = (req.status || "pending").toLowerCase();
                  const priority = (req.priority || "normal").toLowerCase();

                  return (
                    <tr key={req.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-900">{req.request_number || `#PR-${req.id}`}</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{req.department_name || "General Department"}</p>
                          {req.outlet_name ? (
                            <span className="inline-block mt-0.5 rounded px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              📍 {req.outlet_name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">Hotel-wide</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">{req.requested_by_name || req.requested_by_username || "Staff"}</p>
                        {req.notes && <p className="text-[11px] text-gray-500 truncate max-w-xs">{req.notes}</p>}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-900">{req.items_count || 1} Items</span>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          ~{Number(req.estimated_total || 0).toLocaleString()} ETB
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            priority === "urgent"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : priority === "high"
                              ? "bg-orange-100 text-orange-800 border border-orange-200"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {priority}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                            status === "approved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : status === "rejected"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : status === "converted_to_po"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {status === "converted_to_po" ? "Converted to PO" : status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDetails(req)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>

                          {status === "pending" && (
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewAction("approved");
                                setShowReviewModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200 hover:bg-blue-100 transition"
                            >
                              Review
                            </button>
                          )}

                          {status === "approved" && (
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setConvertSupplierId(suppliers[0]?.id ? String(suppliers[0].id) : "");
                                setShowConvertModal(true);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
                            >
                              <ShoppingCart size={13} />
                              <span>Create PO</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">New Purchase Requisition</h3>
                  <p className="text-xs text-gray-500">Submit an official purchase request for your outlet/department</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Requesting Dept</label>
                  <select
                    value={createForm.departmentId}
                    onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Destination Outlet</label>
                  <select
                    value={createForm.outletId}
                    onChange={(e) => setCreateForm({ ...createForm, outletId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Outlet (optional)</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Urgency / Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Critical / Urgent</option>
                  </select>
                </div>
              </div>

              {/* ITEM ROWS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-800 uppercase tracking-wider">
                    Requested Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={14} /> Add Another Item
                  </button>
                </div>

                <div className="space-y-2">
                  {createForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/50">
                      <div className="flex-1">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500"
                          required
                        >
                          <option value="">Select Product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit || "pcs"})</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          placeholder="Est. Price"
                          value={item.estimatedPrice}
                          onChange={(e) => handleItemChange(idx, "estimatedPrice", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {createForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Notes</label>
                <textarea
                  rows="2"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Explain why these goods are required..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Purchase Request {selectedRequest.request_number || `#PR-${selectedRequest.id}`}
                </h3>
                <p className="text-xs text-gray-500">
                  Requested by {selectedRequest.requested_by_name || selectedRequest.requested_by_username} on{" "}
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 text-xs">
                <div>
                  <span className="text-gray-400">Department:</span>{" "}
                  <span className="font-bold text-gray-800">{selectedRequest.department_name || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Target Outlet:</span>{" "}
                  <span className="font-bold text-gray-800">{selectedRequest.outlet_name || "General Hotel"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Priority:</span>{" "}
                  <span className="font-bold capitalize text-gray-800">{selectedRequest.priority || "normal"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>{" "}
                  <span className="font-bold capitalize text-blue-700">{selectedRequest.status}</span>
                </div>
              </div>

              {selectedRequest.notes && (
                <div className="text-xs p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-blue-900">
                  <span className="font-bold">Requisition Notes:</span> {selectedRequest.notes}
                </div>
              )}

              {/* ITEMS LIST */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">Requested Products</h4>
                {loadingDetails ? (
                  <div className="py-8 text-center text-gray-400">Loading item breakdown...</div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {(requestDetails?.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-bold text-gray-900">{item.product_name}</p>
                          <p className="text-[11px] text-gray-400">Code: {item.product_code || item.product_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{item.quantity} units</p>
                          <p className="text-[11px] text-gray-500">~{Number(item.estimated_price || 0).toLocaleString()} ETB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-gray-100">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 text-base mb-1">
              Review Requisition {selectedRequest.request_number}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Accept or decline this request before it can be converted into a Purchase Order.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction("approved")}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      reviewAction === "approved"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Approve Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("rejected")}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      reviewAction === "rejected"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Reject Request
                  </button>
                </div>
              </div>

              {reviewAction === "rejected" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rejection Reason</label>
                  <textarea
                    rows="2"
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide reason for rejecting this requisition..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
                >
                  {reviewing && <Loader2 size={14} className="animate-spin" />}
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT TO PO MODAL */}
      {showConvertModal && selectedRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 text-base mb-1">Convert to Purchase Order</h3>
            <p className="text-xs text-gray-500 mb-4">
              Select the vendor who will fulfill Requisition {selectedRequest.request_number}.
            </p>

            <form onSubmit={handleConvertSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Vendor / Supplier</label>
                <select
                  value={convertSupplierId}
                  onChange={(e) => setConvertSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Choose vendor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone || "No phone"})</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 text-purple-900 text-xs">
                <p className="font-semibold">Note:</p>
                <p className="mt-0.5 text-purple-800 text-[11px]">
                  This creates an official Purchase Order. Central Store stock will NOT increase until the Store Manager
                  verifies physical delivery receipt.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting || !convertSupplierId}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-60"
                >
                  {converting && <Loader2 size={14} className="animate-spin" />}
                  Generate Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
