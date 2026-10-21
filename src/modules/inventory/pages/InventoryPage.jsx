import { useEffect, useMemo, useState } from "react";
import {
  Package,
  AlertTriangle,
  SlidersHorizontal,
  TrendingDown,
  Boxes,
  RefreshCw,
  BarChart3,
  ArrowRightLeft,
  Search,
  Wine,
  UtensilsCrossed,
  Building2,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Printer,
  Clock,
  Plus,
  XCircle,
  X,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import StockTransferModal from "../components/StockTransferModal";
import StockThresholdModal from "../components/StockThresholdModal";
import StoreGoodsReceiptModal from "../components/StoreGoodsReceiptModal";
import StoreRequisitionVoucherModal from "../components/StoreRequisitionVoucherModal";
import StockRequestModal from "../components/StockRequestModal";

function InventoryPage() {
  const [inventoryList, setInventoryList] = useState([]);
  const [multiLocationList, setMultiLocationList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Main View Tab: "matrix" | "requisitions"
  const [activeMainTab, setActiveMainTab] = useState("matrix");

  // Requisitions Queue State
  const [transfersList, setTransfersList] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transferFilter, setTransferFilter] = useState("pending_store"); // 'pending_store' | 'pending_fb' | 'completed' | 'all'
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState(null);
  const [submittingReqAction, setSubmittingReqAction] = useState(false);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Store Goods Receipt Modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  // Stock Request (Store Requisition) Modal state
  const [showStockRequestModal, setShowStockRequestModal] = useState(false);
  // Stock Threshold Modal state
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [selectedProductForThreshold, setSelectedProductForThreshold] = useState(null);

  const openThresholdModal = (product) => {
    setSelectedProductForThreshold(product);
    setShowThresholdModal(true);
  };
  const [selectedTransferProduct, setSelectedTransferProduct] = useState(null);
  const [selectedTransferDept, setSelectedTransferDept] = useState("bar");

  // Multi-location table filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all"); // 'all' | 'bar' | 'kitchen'

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [invRes, multiRes] = await Promise.all([
        api("/inventory").catch(() => ({})),
        api("/inventory/multi-location").catch(() => ({})),
      ]);

      const items = invRes.inventory || invRes.data || (Array.isArray(invRes) ? invRes : []);
      setInventoryList(items);

      const multiItems = multiRes.inventory || multiRes.data || (Array.isArray(multiRes) ? multiRes : []);
      setMultiLocationList(multiItems);
    } catch (err) {
      console.error("Failed to fetch inventory dashboard:", err);
      setError(err.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const res = await api("/inventory/transfers?limit=50");
      const list = res.transfers || res.data || (Array.isArray(res) ? res : []);
      setTransfersList(list);
    } catch (err) {
      console.error("Failed to fetch store requisitions:", err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchTransfers();
  }, []);

  // Compute live statistics
  const statsData = useMemo(() => {
    const totalItems = inventoryList.length;

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventoryList.forEach((item) => {
      const qty = Number(item.quantity || 0);
      const min = Number(item.minimum_stock || 0);
      const price = Number(item.cost_price || item.price || 0);

      totalValue += qty * price;

      if (qty <= 0 || item.stock_status === "out_of_stock") {
        outOfStockCount++;
      } else if ((min > 0 && qty <= min) || item.stock_status === "low_stock") {
        lowStockCount++;
      }
    });

    return [
      {
        title: "Total Items",
        value: loading ? "..." : totalItems.toString(),
        description: "Products in inventory",
        icon: Package,
        color: "text-blue-600 bg-blue-50",
      },
      {
        title: "Stock Value",
        value: loading ? "..." : `${totalValue.toLocaleString()} ETB`,
        description: "Calculated stock valuation",
        icon: Boxes,
        color: "text-emerald-600 bg-emerald-50",
      },
      {
        title: "Low Stock Items",
        value: loading ? "..." : lowStockCount.toString(),
        description: "Items below minimum threshold",
        icon: AlertTriangle,
        color: "text-orange-600 bg-orange-50",
      },
      {
        title: "Out of Stock",
        value: loading ? "..." : outOfStockCount.toString(),
        description: "Requires immediate restocking",
        icon: TrendingDown,
        color: "text-rose-600 bg-rose-50",
      },
    ];
  }, [inventoryList, loading]);

  // Filter low stock list
  const lowStockItems = useMemo(() => {
    return inventoryList.filter((item) => {
      const qty = Number(item.quantity || 0);
      const min = Number(item.minimum_stock || 0);
      return qty <= 0 || (min > 0 && qty <= min) || item.stock_status === "low_stock";
    });
  }, [inventoryList]);

  // Filter multi-location items
  const filteredMultiStock = useMemo(() => {
    return multiLocationList.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        (item.product_name && item.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesDept = true;
      if (deptFilter === "bar") {
        matchesDept =
          item.category_type === "bar" ||
          item.category_type === "beverage" ||
          Number(item.bar_quantity || 0) > 0;
      } else if (deptFilter === "kitchen") {
        matchesDept =
          item.category_type === "kitchen" ||
          item.category_type === "food" ||
          Number(item.kitchen_quantity || 0) > 0;
      }

      return matchesSearch && matchesDept;
    });
  }, [multiLocationList, searchQuery, deptFilter]);

  // Filter requisitions
  const filteredTransfers = useMemo(() => {
    return transfersList.filter((req) => {
      const status = (req.status || "").toLowerCase();
      if (transferFilter === "pending_store") {
        return status === "pending_store" || status === "pending";
      }
      if (transferFilter === "pending_fb") {
        return status === "pending_fb";
      }
      if (transferFilter === "completed") {
        return status === "completed";
      }
      if (transferFilter === "rejected") {
        return status === "rejected" || status === "cancelled";
      }
      return true; // 'all'
    });
  }, [transfersList, transferFilter]);

  // Pending count for Storekeeper badge
  const pendingStoreCount = useMemo(() => {
    return transfersList.filter(
      (r) =>
        (r.status || "").toLowerCase() === "pending_store" ||
        (r.status || "").toLowerCase() === "pending"
    ).length;
  }, [transfersList]);

  const openTransferModal = (product = null, dept = "bar") => {
    setSelectedTransferProduct(product);
    setSelectedTransferDept(dept);
    setShowTransferModal(true);
  };

  // Storekeeper approves and issues stock
  const handleApproveRequisition = async (transferId, destLocation) => {
    if (
      !window.confirm(
        `Issue and release requested stock from Central Store to ${destLocation.toUpperCase()}?`
      )
    ) {
      return;
    }
    try {
      setSubmittingReqAction(true);
      await api(`/inventory/transfers/${transferId}/approve`, {
        method: "PUT",
        body: JSON.stringify({
          notes: `Approved and stock issued by Central Storekeeper for ${destLocation.toUpperCase()}`,
        }),
      });
      alert(`Stock successfully issued to ${destLocation.toUpperCase()}!`);
      await fetchDashboardData();
      await fetchTransfers();
    } catch (err) {
      alert(err.message || "Failed to approve and issue transfer.");
    } finally {
      setSubmittingReqAction(false);
    }
  };

  // Storekeeper rejects requisition
  const handleRejectRequisition = async () => {
    if (!rejectItem) return;
    try {
      setSubmittingReqAction(true);
      await api(`/inventory/transfers/${rejectItem.id}/reject`, {
        method: "PUT",
        body: JSON.stringify({
          notes: rejectReason.trim() || `Requisition declined by Central Storekeeper`,
        }),
      });
      alert(`Requisition #${rejectItem.transfer_number} was rejected.`);
      setRejectItem(null);
      setRejectReason("");
      await fetchTransfers();
    } catch (err) {
      alert(err.message || "Failed to reject transfer.");
    } finally {
      setSubmittingReqAction(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Inventory & Multi-Store Stock
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor real-time stock levels across Central Warehouse, Bar, and Kitchen with official store requisition management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowStockRequestModal(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            New Store Requisition
          </button>

          <button
            onClick={() => setShowReceiptModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-500 transition"
          >
            <ShieldCheck className="h-4 w-4" />
            Verify Incoming Deliveries
          </button>

          <Link
            to="/inventory/reports"
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition"
          >
            <BarChart3 className="h-4 w-4 text-amber-400" />
            Inventory Reports
          </Link>

          <button
            onClick={() => openTransferModal(null, "bar")}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-md hover:bg-amber-400 transition"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Direct Transfer
          </button>

          <button
            onClick={() => {
              fetchDashboardData();
              fetchTransfers();
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading || loadingTransfers ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {stat.description}
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main View Tab Selector */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveMainTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
            activeMainTab === "matrix"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Multi-Store Stock Matrix</span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-700 text-white">
            {multiLocationList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("requisitions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
            activeMainTab === "requisitions"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Store Requisitions Queue</span>
          {pendingStoreCount > 0 ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950 animate-pulse">
              {pendingStoreCount} Action Needed
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
              {transfersList.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: MULTI-LOCATION MATRIX */}
      {activeMainTab === "matrix" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-600" />
                <h2 className="font-bold text-slate-900 text-base">
                  Multi-Store Real-Time Stock Matrix
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Live balances across Central Store, Bar, and Kitchen with POS portion consumption
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Pills */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
                <button
                  onClick={() => setDeptFilter("all")}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    deptFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  All Outlets
                </button>
                <button
                  onClick={() => setDeptFilter("bar")}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                    deptFilter === "bar" ? "bg-white text-amber-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  <Wine className="h-3.5 w-3.5 text-amber-600" />
                  Bar
                </button>
                <button
                  onClick={() => setDeptFilter("kitchen")}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                    deptFilter === "kitchen" ? "bg-white text-amber-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
                  Kitchen
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search stock..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-44 rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:w-56 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Central Store</th>
                  <th className="py-3 px-4 text-center">Bar Stock</th>
                  <th className="py-3 px-4 text-center">Kitchen Stock</th>
                  <th className="py-3 px-4 text-center">Total On-Hand</th>
                  <th className="py-3 px-4 text-center">Sold Today</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-xs text-slate-400">
                      Loading multi-location stock...
                    </td>
                  </tr>
                ) : filteredMultiStock.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-xs text-slate-400">
                      No products found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMultiStock.map((prod) => {
                    const mainQty = Number(prod.main_quantity || 0);
                    const barQty = Number(prod.bar_quantity || 0);
                    const kitchenQty = Number(prod.kitchen_quantity || 0);
                    const totalQty = Number(prod.total_quantity || 0);
                    const soldToday = Number(prod.sold_today || 0);
                    const unit = prod.unit || "pcs";
                    const isBarItem = prod.category_type === "bar" || prod.category_type === "beverage";

                    return (
                      <tr key={prod.product_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{prod.product_name}</p>
                          <p className="text-[11px] text-slate-400">{prod.product_code || `ID: #${prod.product_id}`}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {prod.category_name || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold ${mainQty > 0 ? "text-slate-900" : "text-rose-500 font-extrabold"}`}>
                            {mainQty} {unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold rounded-lg px-2 py-0.5 ${
                            barQty > 0 ? "bg-amber-50 text-amber-900 border border-amber-200/60" : "text-slate-400"
                          }`}>
                            {barQty > 0 ? `${barQty} ${unit}` : "0"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold rounded-lg px-2 py-0.5 ${
                            kitchenQty > 0 ? "bg-emerald-50 text-emerald-900 border border-emerald-200/60" : "text-slate-400"
                          }`}>
                            {kitchenQty > 0 ? `${kitchenQty} ${unit}` : "0"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-900">
                          {totalQty} {unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold rounded-full px-2 py-0.5 text-[11px] ${
                            soldToday > 0 ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-400"
                          }`}>
                            {soldToday > 0 ? `${soldToday} sold` : "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openThresholdModal(prod)}
                              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 transition shadow-2xs"
                              title="Set Low Stock Alert Minimum"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-500" />
                              <span className="hidden sm:inline">Set Limit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openTransferModal(prod, isBarItem ? "bar" : "kitchen")}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-900 transition shadow-2xs"
                            >
                              Transfer
                            </button>
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
      )}

      {/* VIEW 2: STORE REQUISITIONS QUEUE (STOREKEEPER APPROVAL & ISSUANCE) */}
      {activeMainTab === "requisitions" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-base">
                  Store Requisitions & Stock Issuance Queue
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review F&B verified department stock requisitions, issue warehouse stock, and print official vouchers
              </p>
            </div>

            {/* Requisition Status Filters */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTransferFilter("pending_store")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  transferFilter === "pending_store"
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ready for Storekeeper ({pendingStoreCount})
              </button>
              <button
                onClick={() => setTransferFilter("pending_fb")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  transferFilter === "pending_fb"
                    ? "bg-amber-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Awaiting F&B
              </button>
              <button
                onClick={() => setTransferFilter("completed")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  transferFilter === "completed"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Issued / Completed
              </button>
              <button
                onClick={() => setTransferFilter("rejected")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  transferFilter === "rejected"
                    ? "bg-rose-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setTransferFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  transferFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Vouchers
              </button>
            </div>
          </div>

          {/* Requisitions List */}
          {loadingTransfers ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Loading store requisitions...
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Boxes className="h-10 w-10 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No requisitions in this state.</p>
              <p className="text-xs text-slate-400 mt-1">
                New vouchers submitted by Bar, Kitchen, Cafe, or Housekeeping will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTransfers.map((req) => {
                const status = (req.status || "").toLowerCase();
                const isPendingFB = status === "pending_fb";
                const isPendingStore = status === "pending_store" || status === "pending";
                const isCompleted = status === "completed";
                const isRejected = status === "rejected" || status === "cancelled";

                const items = Array.isArray(req.items) ? req.items : [];
                const toDept = (req.to_location || "").toUpperCase();

                return (
                  <div
                    key={req.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition space-y-4"
                  >
                    {/* Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                            {req.transfer_number}
                          </span>
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {toDept} Section
                          </span>
                          <span
                            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase ${
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
                              ? "Ready for Storekeeper"
                              : isRejected
                              ? "Rejected"
                              : "Awaiting F&B Check"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Requested by: <strong className="text-slate-800">{req.requested_by_username || "Staff"}</strong> &bull;{" "}
                          {req.created_at ? new Date(req.created_at).toLocaleString() : "Recently"}
                        </p>
                      </div>

                      {/* Storekeeper Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => setSelectedVoucherForPrint(req)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition"
                        >
                          <Printer className="h-4 w-4" />
                          <span>View / Print Voucher</span>
                        </button>

                        {isPendingStore && (
                          <>
                            <button
                              onClick={() => handleApproveRequisition(req.id, req.to_location)}
                              disabled={submittingReqAction}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Approve & Issue Stock</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectItem(req);
                                setRejectReason("");
                              }}
                              disabled={submittingReqAction}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Items Table inside Card */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                            <th className="py-2 px-3 w-10 text-center">#</th>
                            <th className="py-2 px-3">Item Description</th>
                            <th className="py-2 px-2 w-20 text-center">Unit</th>
                            <th className="py-2 px-3 w-28 text-center">Qty Requested</th>
                            <th className="py-2 px-3">Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {items.map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td className="py-2 px-3 text-center font-mono text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {it.product_name || `Product #${it.product_id}`}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 uppercase text-[11px]">
                                {it.unit || "pcs"}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-indigo-700 font-mono text-xs">
                                {it.quantity}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px]">
                                {it.notes || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Authorizations Audit Footer */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-700">Requested By: </span>
                        <span className="text-slate-900">{req.requested_by_username || "Staff"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">F&B Verification: </span>
                        {req.checked_at ? (
                          <span className="text-blue-700 font-medium">
                            Verified by {req.checked_by_username || "F&B Controller"}
                          </span>
                        ) : (
                          <span className="text-amber-600">Pending F&B Check</span>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Storekeeper Issuance: </span>
                        {isCompleted ? (
                          <span className="text-emerald-700 font-medium">
                            Issued by {req.approved_by_username || "Storekeeper"}
                          </span>
                        ) : isRejected ? (
                          <span className="text-rose-700 font-medium">
                            Declined {req.rejection_reason ? `(${req.rejection_reason})` : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400">Pending Storekeeper</span>
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

      {/* Low Stock Warning & Fast Actions Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Items Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h2 className="font-bold text-slate-900">Low Stock Alert List</h2>
            </div>
            <Link
              to="/inventory/low-stock"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Loading low stock items...
              </p>
            ) : lowStockItems.length > 0 ? (
              lowStockItems.map((item) => {
                const qty = Number(item.quantity || 0);
                const min = Number(item.minimum_stock || 0);
                const unit = item.unit || "pcs";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.product_name || `Product #${item.product_id || item.id}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.category_name || "General"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-rose-600">
                        {qty} {unit}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Min: {min} {unit}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">
                No items currently below minimum stock!
              </p>
            )}
          </div>
        </div>

        {/* Quick Inventory Management Links */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-bold text-slate-900">Quick Operations</h2>
            <p className="text-xs text-slate-500">Fast access to inventory tools</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setShowStockRequestModal(true)}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-indigo-50/60 p-4 transition hover:bg-indigo-100/60 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Store Requisition</p>
                <p className="text-xs text-slate-500">Request stock voucher</p>
              </div>
            </button>

            <Link
              to="/inventory/reports"
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-blue-50/60 p-4 transition hover:bg-blue-100/60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Inventory Reports</p>
                <p className="text-xs text-slate-500">Audit logs & stock valuation</p>
              </div>
            </Link>

            <Link
              to="/inventory/low-stock"
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-orange-50/60 p-4 transition hover:bg-orange-100/60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Low Stock</p>
                <p className="text-xs text-slate-500">View safety threshold alerts</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Rejection Prompt Dialog */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Reject Requisition #{rejectItem.transfer_number}
              </h3>
              <button
                onClick={() => setRejectItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Provide a reason for rejecting this requisition for {rejectItem.to_location.toUpperCase()}.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Stock unavailable in Central Store / physical quantity does not match"
              className="w-full text-xs text-slate-800 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReqAction}
                onClick={handleRejectRequisition}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submittingReqAction ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={fetchDashboardData}
        initialProduct={selectedTransferProduct}
        initialDepartment={selectedTransferDept}
      />

      {/* Stock Request Modal (New Multi-Item Store Requisition) */}
      <StockRequestModal
        isOpen={showStockRequestModal}
        onClose={() => setShowStockRequestModal(false)}
        onSuccess={() => {
          fetchDashboardData();
          fetchTransfers();
        }}
        initialDepartment="bar"
      />

      {/* Stock Threshold Modal */}
      <StockThresholdModal
        isOpen={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        onSuccess={fetchDashboardData}
        product={selectedProductForThreshold}
        initialDepartment="all"
      />

      {/* Store Goods Receipt Modal */}
      <StoreGoodsReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onSuccess={fetchDashboardData}
      />

      {/* View / Print Voucher Modal */}
      {selectedVoucherForPrint && (
        <StoreRequisitionVoucherModal
          isOpen={!!selectedVoucherForPrint}
          onClose={() => setSelectedVoucherForPrint(null)}
          transfer={selectedVoucherForPrint}
        />
      )}
    </div>
  );
}

export default InventoryPage;
