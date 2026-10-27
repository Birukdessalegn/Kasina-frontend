import { useState, useEffect } from "react";
import { X, DollarSign, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

export default function AmendRoomPriceModal({
  isOpen,
  onClose,
  reservation,
  onSuccess,
}) {
  const [newRate, setNewRate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (reservation) {
      setNewRate(String(reservation.rate_per_night || ""));
      setReason("");
      setError(null);
    }
  }, [reservation, isOpen]);

  if (!isOpen || !reservation) return null;

  const currentRate = Number(reservation.rate_per_night || 0);
  const totalNights = Math.max(1, Number(reservation.total_nights || 1));
  const currentTotal = Number(reservation.total_amount || currentRate * totalNights);
  const enteredRate = Number(newRate);
  const isValidRate = !isNaN(enteredRate) && enteredRate >= 0;
  const newTotal = isValidRate ? enteredRate * totalNights : 0;
  const diffRate = isValidRate ? enteredRate - currentRate : 0;
  const diffTotal = isValidRate ? newTotal - currentTotal : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidRate) {
      setError("Please enter a valid rate per night (0 or greater).");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for amending the room price.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSuccess({
        reservationId: reservation.id,
        rate_per_night: enteredRate,
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to amend price.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30 shadow-xs">
            <DollarSign size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Amend Room Price (Special Rate)
            </h3>
            <p className="text-xs text-slate-500">
              Update room pricing for VIP / authorized discounts with mandatory audit
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Info Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Room & Guest:</span>
            <p className="font-bold text-slate-900 mt-0.5">
              Room #{reservation.room_number} • {reservation.guest_name || "Guest"}
            </p>
            <p className="text-[11px] text-slate-400">{reservation.room_type_name || "Hotel Room"}</p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500">Duration & Current Total:</span>
            <p className="font-bold text-slate-900 mt-0.5">
              {totalNights} Night{totalNights === 1 ? "" : "s"} • {currentRate.toLocaleString()} ETB/night
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Current Total: <span className="font-bold text-slate-700">{currentTotal.toLocaleString()} ETB</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              New Rate per Night (ETB) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                required
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="Enter new agreed nightly price..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ETB / Night
              </span>
            </div>
          </div>

          {/* Live Price Comparison Box */}
          {isValidRate && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs">
              <div className="flex justify-between items-center text-slate-600 mb-1">
                <span>New Total for {totalNights} Night(s):</span>
                <span className="text-sm font-black text-blue-900">{newTotal.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Difference per Night:</span>
                <span className={`font-bold ${diffRate < 0 ? "text-emerald-700" : diffRate > 0 ? "text-rose-700" : "text-slate-600"}`}>
                  {diffRate > 0 ? `+${diffRate.toLocaleString()}` : diffRate.toLocaleString()} ETB
                  {diffRate < 0 ? ` (Discount: ${Math.abs(diffTotal).toLocaleString()} ETB Total)` : ""}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Reason for Price Amendment *
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. General Manager instructed 20% discount for special corporate partner delegation..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              * This reason will be automatically broadcast to the <b>Admin and Finance</b> live notification system.
            </p>
          </div>

          {/* Notice to User */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-[11px] font-medium text-amber-900">
            <ShieldCheck size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <span>
              Amending this price updates the invoice balance and creates an audit record with your user credentials, timestamp, and explanation.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              <span>{loading ? "Amending..." : "Confirm & Notify Management"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
