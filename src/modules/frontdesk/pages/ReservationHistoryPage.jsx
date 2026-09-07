import { useState, useEffect, useMemo } from "react";
import {
  History,
  Search,
  CalendarDays,
  DoorClosed,
  User,
  Phone,
  CreditCard,
  Printer,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ArrowUpDown,
  Download,
  Receipt,
  FileText,
  Crown,
  ChevronRight,
  X
} from "lucide-react";
import { getReservations } from "../services/frontdeskApi";

export default function ReservationHistoryPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("checked_out"); // 'checked_out' | 'cancelled' | 'all'
  const [dateFilter, setDateFilter] = useState("all"); // 'all' | 'today' | 'week' | 'month'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Receipt & ID preview modals
  const [selectedStay, setSelectedStay] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [idViewerModalOpen, setIdViewerModalOpen] = useState(false);
  const [viewingIdUrl, setViewingIdUrl] = useState("");

  const getFullImageUrl = (rawImage) => {
    if (!rawImage) return "";
    if (rawImage.startsWith("data:") || rawImage.startsWith("http://") || rawImage.startsWith("https://")) {
      return rawImage;
    }
    const backendBase =
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";
    const cleanPath = rawImage.startsWith("/") ? rawImage : `/${rawImage}`;
    return `${backendBase}${cleanPath}`;
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await getReservations();
      // Only keep historical records (checked_out or cancelled by default)
      const all = res.data || [];
      setReservations(all);
    } catch (err) {
      console.error("Failed to load reservation history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Filtered reservations
  const filteredHistory = useMemo(() => {
    return reservations.filter((r) => {
      // Status filter
      if (statusFilter === "checked_out" && r.status !== "checked_out") return false;
      if (statusFilter === "cancelled" && r.status !== "cancelled") return false;
      if (statusFilter === "all" && !["checked_out", "cancelled", "checked_in"].includes(r.status)) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = r.guest_name?.toLowerCase().includes(q);
        const matchesPhone = r.guest_phone?.toLowerCase().includes(q);
        const matchesCode = r.reservation_code?.toLowerCase().includes(q);
        const matchesRoom = r.room_number?.toLowerCase().includes(q);
        const matchesVip = r.vip_name?.toLowerCase().includes(q) || r.vip_company?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCode && !matchesRoom && !matchesVip) {
          return false;
        }
      }

      // Date filter
      if (dateFilter === "today") {
        const today = new Date().toISOString().split("T")[0];
        const checkOut = r.check_out_date?.split("T")[0];
        if (checkOut !== today) return false;
      } else if (dateFilter === "week") {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        const resDate = new Date(r.check_out_date || r.check_in_date);
        if (resDate < sevenDaysAgo) return false;
      } else if (dateFilter === "month") {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const resDate = new Date(r.check_out_date || r.check_in_date);
        if (resDate < thirtyDaysAgo) return false;
      }

      if (customStartDate && r.check_in_date < customStartDate) return false;
      if (customEndDate && r.check_out_date > customEndDate) return false;

      return true;
    });
  }, [reservations, statusFilter, search, dateFilter, customStartDate, customEndDate]);

  // Historical Metrics
  const metrics = useMemo(() => {
    const completed = reservations.filter((r) => r.status === "checked_out");
    const cancelled = reservations.filter((r) => r.status === "cancelled");
    const totalRev = completed.reduce((acc, curr) => acc + Number(curr.paid_amount || curr.total_amount || 0), 0);
    const totalNights = completed.reduce((acc, curr) => acc + Number(curr.total_nights || 1), 0);
    const avgStay = completed.length > 0 ? (totalNights / completed.length).toFixed(1) : "0.0";

    return {
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      totalRevenue: totalRev,
      totalNights,
      avgStay,
    };
  }, [reservations]);

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
              <History size={22} />
            </div>
            Reservation & Stay History
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Complete audit trail of past guest stays, completed check-outs, payment receipts, and stay logs.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          Refresh Log
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Stays</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.completedCount}</p>
          <span className="text-[11px] text-emerald-600 font-semibold">Checked out guests</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historical Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CreditCard size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
          </p>
          <span className="text-[11px] text-blue-600 font-semibold">{metrics.totalNights} room nights fulfilled</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Stay Duration</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Clock size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.avgStay} Nights</p>
          <span className="text-[11px] text-purple-600 font-semibold">Average length of stay</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cancelled Bookings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.cancelledCount}</p>
          <span className="text-[11px] text-rose-600 font-semibold">Cancellation log</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          {[
            { id: "checked_out", label: "Checked Out" },
            { id: "all", label: "All Past & Active" },
            { id: "cancelled", label: "Cancelled" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === st.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.label}
            </button>
          ))}

          {/* Quick Date Tabs */}
          <div className="ml-2 flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {[
              { id: "all", label: "All Dates" },
              { id: "today", label: "Today" },
              { id: "week", label: "7 Days" },
              { id: "month", label: "30 Days" },
            ].map((dt) => (
              <button
                key={dt.id}
                onClick={() => setDateFilter(dt.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  dateFilter === dt.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search guest, code, room, VIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* History Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <History className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">No reservation history found</h3>
          <p className="mt-1 text-xs text-slate-500">
            No completed stays or historical reservations match your search criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Reservation #</th>
                  <th className="py-3.5 px-4">Guest Details</th>
                  <th className="py-3.5 px-4">Room</th>
                  <th className="py-3.5 px-4">Stay Duration</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 font-mono text-[13px]">
                        {res.reservation_code}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        {res.created_at?.split("T")[0]}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{res.guest_name}</span>
                        {res.vip_tier && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-900 border border-purple-200">
                            👑 {res.vip_tier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {res.guest_phone && <span>{res.guest_phone}</span>}
                        {res.vip_company && <span>• {res.vip_company}</span>}
                      </div>
                      {res.id_image_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewingIdUrl(res.id_image_url);
                            setIdViewerModalOpen(true);
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          <Eye size={10} /> View ID
                        </button>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">Room #{res.room_number}</span>
                      <div className="text-[11px] text-slate-500">{res.room_type_name}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {res.check_in_date?.split("T")[0]} ➔ {res.check_out_date?.split("T")[0]}
                      </div>
                      <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                        {res.total_nights} Night{res.total_nights > 1 ? "s" : ""}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900">
                        {Number(res.total_amount).toFixed(2)} ETB
                      </span>
                      <div className="text-[11px] mt-0.5">
                        <span
                          className={`font-semibold capitalize ${
                            res.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {res.payment_status}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                          res.status === "checked_out"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : res.status === "checked_in"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : res.status === "cancelled"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {res.status === "checked_out" ? "✓ Checked Out" : res.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedStay(res);
                          setReceiptModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
                      >
                        <Receipt size={12} />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECEIPT / INVOICE MODAL */}
      {receiptModalOpen && selectedStay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="text-indigo-600" size={18} />
                <h3 className="font-extrabold text-sm text-slate-900">Stay Receipt & Summary</h3>
              </div>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div id="printable-receipt" className="p-6 space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-slate-200">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                  Kasina Hotel & Restaurant
                </h2>
                <p className="text-[11px] text-slate-500">Official Guest Folio / Receipt</p>
                <p className="text-[11px] font-mono text-indigo-600 font-bold mt-1">
                  #{selectedStay.reservation_code}
                </p>
              </div>

              {/* Guest & Stay Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Guest Name:</span>
                  <span className="font-bold text-slate-900">{selectedStay.guest_name}</span>
                </div>
                {selectedStay.guest_phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-medium text-slate-800">{selectedStay.guest_phone}</span>
                  </div>
                )}
                {selectedStay.vip_tier && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">VIP Status:</span>
                    <span className="font-extrabold text-purple-700">👑 {selectedStay.vip_tier}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Room:</span>
                  <span className="font-bold text-slate-900">
                    Room #{selectedStay.room_number} ({selectedStay.room_type_name})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-in:</span>
                  <span className="font-medium text-slate-800">{selectedStay.check_in_date?.split("T")[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-out:</span>
                  <span className="font-medium text-slate-800">{selectedStay.check_out_date?.split("T")[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold text-indigo-600">{selectedStay.total_nights} Night(s)</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Rate per Night:</span>
                  <span>{Number(selectedStay.rate_per_night).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 text-sm">
                  <span>Total Charges:</span>
                  <span>{Number(selectedStay.total_amount).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Paid Amount:</span>
                  <span>{Number(selectedStay.paid_amount || selectedStay.total_amount).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Status:</span>
                  <span className="font-bold uppercase text-emerald-600">Settled / Closed</span>
                </div>
              </div>

              {selectedStay.special_requests && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-[11px] text-amber-900">
                  <span className="font-bold">Notes: </span>
                  {selectedStay.special_requests}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow"
              >
                <Printer size={14} />
                Print Folio / Receipt
              </button>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ID IMAGE VIEWER */}
      {idViewerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full rounded-3xl bg-slate-950 p-4 text-white shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold flex items-center gap-1.5 text-slate-300">
                🪪 Guest ID Card Photo
              </span>
              <button
                type="button"
                onClick={() => setIdViewerModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center overflow-hidden rounded-2xl bg-black min-h-[300px]">
              <img
                src={getFullImageUrl(viewingIdUrl)}
                alt="Guest ID"
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
