import { useState, useEffect } from "react";
import {
  CalendarDays,
  Search,
  CheckCircle2,
  XCircle,
  X,
  CreditCard,
  User,
  Phone,
  DoorClosed,
  CalendarCheck,
  Ban
} from "lucide-react";
import {
  getReservations,
  checkInReservation,
  checkOutReservation,
  addReservationPayment,
  cancelReservation,
} from "../services/frontdeskApi";

const STATUS_COLORS = {
  confirmed: "bg-amber-50 text-amber-700 border-amber-200",
  checked_in: "bg-blue-50 text-blue-700 border-blue-200",
  checked_out: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  no_show: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function ReservationsListPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadReservations = async () => {
    try {
      setLoading(true);
      const res = await getReservations({ status: statusFilter, search });
      setReservations(res.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load reservations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, [statusFilter, search]);

  const handleCheckIn = async (id, roomNum) => {
    try {
      await checkInReservation(id);
      showToast(`Checked in to Room #${roomNum}`);
      loadReservations();
    } catch (err) {
      showToast(err.message || "Check-in failed", "error");
    }
  };

  const handleCancel = async (id) => {
    const reason = window.prompt("Reason for cancellation:");
    if (reason === null) return;
    try {
      await cancelReservation(id, reason);
      showToast("Reservation cancelled");
      loadReservations();
    } catch (err) {
      showToast(err.message || "Cancellation failed", "error");
    }
  };

  const handleOpenPayment = (res) => {
    setSelectedRes(res);
    const balance = Number(res.total_amount) - Number(res.paid_amount);
    setPayAmount(balance > 0 ? String(balance) : "");
    setPayMethod("cash");
    setPayNotes("");
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      showToast("Enter a valid payment amount", "error");
      return;
    }
    try {
      await addReservationPayment(selectedRes.id, {
        amount: Number(payAmount),
        payment_method: payMethod,
        notes: payNotes,
      });
      showToast("Payment recorded successfully");
      setPaymentModalOpen(false);
      loadReservations();
    } catch (err) {
      showToast(err.message || "Payment failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl transition-all ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {toast.type === "error" ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {["all", "confirmed", "checked_in", "checked_out", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? "bg-slate-900 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search guest, code, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Guest</th>
              <th className="px-6 py-4">Room</th>
              <th className="px-6 py-4">Check-In / Out</th>
              <th className="px-6 py-4">Total / Paid</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reservations.map((r) => {
              const balance = Number(r.total_amount) - Number(r.paid_amount);
              return (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">
                    {r.reservation_code}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{r.guest_name}</p>
                    {r.guest_phone && (
                      <p className="text-xs text-slate-400">{r.guest_phone}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800">Room #{r.room_number}</span>
                    <p className="text-xs text-slate-400">{r.room_type_name}</p>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <p className="text-slate-800 font-medium">In: {r.check_in_date?.split("T")[0]}</p>
                    <p className="text-slate-500">Out: {r.check_out_date?.split("T")[0]}</p>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <p className="font-bold text-slate-900">${Number(r.total_amount).toFixed(2)}</p>
                    <p className={balance <= 0 ? "text-emerald-600" : "text-rose-500"}>
                      {balance <= 0 ? "Fully Paid" : `Due: $${balance.toFixed(2)}`}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        STATUS_COLORS[r.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.status === "confirmed" && (
                        <button
                          onClick={() => handleCheckIn(r.id, r.room_number)}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
                        >
                          Check-In
                        </button>
                      )}

                      {r.status === "checked_in" && balance > 0 && (
                        <button
                          onClick={() => handleOpenPayment(r)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Add Payment
                        </button>
                      )}

                      {r.status === "confirmed" && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No reservations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Collect Payment ({selectedRes.reservation_code})
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="telebirr">Telebirr</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional reference / note"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
