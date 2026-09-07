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
  Ban,
  Camera,
  Eye,
  Check,
  Loader2,
  Upload
} from "lucide-react";
import {
  getReservations,
  checkInReservation,
  checkOutReservation,
  addReservationPayment,
  cancelReservation,
  updateReservation,
  uploadGuestIdImage,
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

  // Update Check-In / Guest ID Modal (Mobile Friendly)
  const [updateIdModalOpen, setUpdateIdModalOpen] = useState(false);
  const [selectedResForUpdate, setSelectedResForUpdate] = useState(null);
  const [idUpdateForm, setIdUpdateForm] = useState({
    guest_name: "",
    guest_id_number: "",
    guest_phone: "",
    special_requests: "",
    id_image_file: null,
    id_image_preview: null,
    existing_id_image_url: "",
  });
  const [submittingIdUpdate, setSubmittingIdUpdate] = useState(false);

  // Fullscreen ID Image Viewer Modal
  const [idViewerModalOpen, setIdViewerModalOpen] = useState(false);
  const [viewingIdImageUrl, setViewingIdImageUrl] = useState("");

  // Helper to build full backend image URL
  const getFullImageUrl = (rawImage) => {
    if (!rawImage) return "";
    if (
      rawImage.startsWith("data:") ||
      rawImage.startsWith("http://") ||
      rawImage.startsWith("https://")
    ) {
      return rawImage;
    }
    const backendBase =
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000";
    const cleanPath = rawImage.startsWith("/") ? rawImage : `/${rawImage}`;
    return `${backendBase}${cleanPath}`;
  };

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

  // Open Update ID Modal
  const handleOpenUpdateIdModal = (res) => {
    setSelectedResForUpdate(res);
    setIdUpdateForm({
      guest_name: res.guest_name || "",
      guest_id_number: res.guest_id_number || "",
      guest_phone: res.guest_phone || "",
      special_requests: res.special_requests || "",
      id_image_file: null,
      id_image_preview: null,
      existing_id_image_url: res.id_image_url || "",
    });
    setUpdateIdModalOpen(true);
  };

  // Save ID Update
  const handleSaveIdUpdate = async (e) => {
    e.preventDefault();
    if (!selectedResForUpdate?.id) {
      showToast("No reservation selected", "error");
      return;
    }

    try {
      setSubmittingIdUpdate(true);
      const resId = selectedResForUpdate.id;

      let uploadedUrl = null;
      if (idUpdateForm.id_image_file) {
        const uploadRes = await uploadGuestIdImage(resId, idUpdateForm.id_image_file);
        uploadedUrl = uploadRes.imageUrl || uploadRes.data?.id_image_url;
      }

      await updateReservation(resId, {
        guest_name: idUpdateForm.guest_name,
        guest_id_number: idUpdateForm.guest_id_number,
        guest_phone: idUpdateForm.guest_phone,
        special_requests: idUpdateForm.special_requests,
        ...(uploadedUrl ? { id_image_url: uploadedUrl } : {}),
      });

      showToast("Guest details and ID photo updated successfully!");
      setUpdateIdModalOpen(false);
      loadReservations();
    } catch (err) {
      showToast(err.message || "Failed to update check-in", "error");
    } finally {
      setSubmittingIdUpdate(false);
    }
  };

  const handleViewIdImage = (imageUrl) => {
    setViewingIdImageUrl(imageUrl);
    setIdViewerModalOpen(true);
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
                    {r.guest_id_number && (
                      <p className="text-[11px] text-slate-500 font-mono">ID: {r.guest_id_number}</p>
                    )}
                    <div className="mt-1.5">
                      {r.id_image_url ? (
                        <button
                          onClick={() => handleViewIdImage(r.id_image_url)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          <Eye size={11} /> 🪪 ID Attached
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenUpdateIdModal(r)}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition"
                        >
                          <Camera size={11} /> ⚠️ Upload ID
                        </button>
                      )}
                    </div>
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
                      <button
                        onClick={() => handleOpenUpdateIdModal(r)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 shadow-sm"
                        title="Update guest details or upload ID photo"
                      >
                        <Camera size={12} className="text-blue-600" />
                        ID / Edit
                      </button>

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

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount *
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

      {/* ====================================================
          MODAL: UPDATE CHECK-IN & GUEST ID (MOBILE FRIENDLY)
      ==================================================== */}
      {updateIdModalOpen && selectedResForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Update Check-In / Guest ID
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Room #{selectedResForUpdate.room_number} • {selectedResForUpdate.reservation_code || "Active Stay"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpdateIdModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-600 transition shadow-sm"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveIdUpdate} className="p-6 space-y-4">
              {/* Photo Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Guest ID / Passport Photo</span>
                  {idUpdateForm.id_image_preview && (
                    <button
                      type="button"
                      onClick={() => setIdUpdateForm({ ...idUpdateForm, id_image_file: null, id_image_preview: null })}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Clear New Photo
                    </button>
                  )}
                </label>

                {idUpdateForm.id_image_preview ? (
                  <div className="relative rounded-2xl border-2 border-blue-400 bg-blue-50/40 p-3 text-center">
                    <img
                      src={idUpdateForm.id_image_preview}
                      alt="New ID Preview"
                      className="mx-auto max-h-52 w-full object-contain rounded-xl border border-blue-200 shadow-sm"
                    />
                    <p className="mt-2 text-xs font-semibold text-blue-700 flex items-center justify-center gap-1">
                      <Check size={14} /> New photo captured - click Save to apply
                    </p>
                    <label className="mt-2.5 inline-flex items-center gap-1.5 cursor-pointer rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50">
                      <Camera size={14} className="text-blue-600" />
                      Retake Photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setIdUpdateForm({
                                ...idUpdateForm,
                                id_image_file: file,
                                id_image_preview: ev.target.result,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : idUpdateForm.existing_id_image_url ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-center">
                    <div className="relative inline-block">
                      <img
                        src={getFullImageUrl(idUpdateForm.existing_id_image_url)}
                        alt="Current ID"
                        className="mx-auto max-h-44 w-full object-contain rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition"
                        onClick={() => handleViewIdImage(idUpdateForm.existing_id_image_url)}
                      />
                      <button
                        type="button"
                        onClick={() => handleViewIdImage(idUpdateForm.existing_id_image_url)}
                        className="absolute bottom-2 right-2 rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm hover:bg-slate-900 flex items-center gap-1"
                      >
                        <Eye size={12} /> View Full
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition">
                        <Camera size={14} />
                        Snap New Photo with Phone
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setIdUpdateForm({
                                  ...idUpdateForm,
                                  id_image_file: file,
                                  id_image_preview: ev.target.result,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/30 p-6 transition hover:border-blue-500 hover:bg-blue-50/60">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-3">
                      <Camera size={24} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      Snap Guest ID with Phone Camera
                    </span>
                    <span className="text-xs text-slate-500 text-center mt-1">
                      Tap here to open mobile camera, or browse file from desktop
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm">
                      <Upload size={13} /> Open Camera / Browse
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setIdUpdateForm({
                              ...idUpdateForm,
                              id_image_file: file,
                              id_image_preview: ev.target.result,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Guest Details Edit */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Guest Identification Details
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Guest Full Name
                    </label>
                    <input
                      type="text"
                      value={idUpdateForm.guest_name}
                      onChange={(e) => setIdUpdateForm({ ...idUpdateForm, guest_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ID / Passport Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EP987654"
                      value={idUpdateForm.guest_id_number}
                      onChange={(e) => setIdUpdateForm({ ...idUpdateForm, guest_id_number: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Guest Phone Number
                    </label>
                    <input
                      type="text"
                      value={idUpdateForm.guest_phone}
                      onChange={(e) => setIdUpdateForm({ ...idUpdateForm, guest_phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdateIdModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  disabled={submittingIdUpdate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIdUpdate}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submittingIdUpdate ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save Check-In Updates
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: FULLSCREEN GUEST ID IMAGE VIEWER
      ==================================================== */}
      {idViewerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="relative max-w-3xl w-full rounded-3xl bg-slate-900 p-4 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
              <span className="text-sm font-bold flex items-center gap-2">
                <Camera size={16} className="text-blue-400" />
                Guest Identification Document
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={getFullImageUrl(viewingIdImageUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  Open Original
                </a>
                <button
                  onClick={() => setIdViewerModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="py-4 flex items-center justify-center">
              <img
                src={getFullImageUrl(viewingIdImageUrl)}
                alt="Full ID Document"
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
