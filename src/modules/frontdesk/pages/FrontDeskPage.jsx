import { useState, useEffect, useMemo } from "react";
import {
  BedDouble,
  DoorClosed,
  CalendarCheck,
  CalendarDays,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  Sparkles,
  CreditCard,
  Phone,
  User,
  Users,
  X,
  FileText,
  Printer,
  ChevronRight,
  Filter,
  DollarSign,
  AlertCircle
} from "lucide-react";
import {
  getRooms,
  getRoomTypes,
  getRoomStats,
  createReservation,
  checkInReservation,
  checkOutReservation,
  addReservationPayment,
  cancelReservation,
  updateRoomStatus
} from "../services/frontdeskApi";

const STATUS_CONFIG = {
  available: {
    label: "Available",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    border: "border-emerald-200 hover:border-emerald-400",
    bg: "bg-emerald-50/30",
  },
  occupied: {
    label: "Occupied",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    border: "border-rose-200 hover:border-rose-400",
    bg: "bg-rose-50/30",
  },
  reserved: {
    label: "Reserved",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    border: "border-amber-200 hover:border-amber-400",
    bg: "bg-amber-50/30",
  },
  cleaning: {
    label: "Cleaning",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
    border: "border-sky-200 hover:border-sky-400",
    bg: "bg-sky-50/30",
  },
  maintenance: {
    label: "Maintenance",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-500",
    border: "border-slate-200 hover:border-slate-400",
    bg: "bg-slate-50",
  },
};

export default function FrontDeskPage() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, reserved: 0, cleaning: 0, maintenance: 0, occupancyRate: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingType, setBookingType] = useState("walkin"); // 'walkin' | 'reservation'
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [activeReservation, setActiveReservation] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "cash", notes: "" });

  const [toast, setToast] = useState(null);

  // Booking Form State
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [bookingForm, setBookingForm] = useState({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    guest_id_number: "",
    room_id: "",
    check_in_date: today,
    check_out_date: tomorrow,
    adults: 1,
    children: 0,
    rate_per_night: "",
    initial_payment: "",
    payment_method: "cash",
    transaction_reference: "",
    special_requests: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsRes, typesRes, statsRes] = await Promise.all([
        getRooms(),
        getRoomTypes(),
        getRoomStats(),
      ]);
      setRooms(roomsRes.data || []);
      setRoomTypes(typesRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) {
      showToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute available floors
  const floors = useMemo(() => {
    const uniqueFloors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
    return uniqueFloors;
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
      if (selectedFloor !== "all" && String(r.floor) !== String(selectedFloor)) return false;
      if (selectedType !== "all" && String(r.room_type_id) !== String(selectedType)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = r.room_number.toLowerCase().includes(q);
        const matchesGuest = r.guest_name && r.guest_name.toLowerCase().includes(q);
        const matchesType = r.type_name && r.type_name.toLowerCase().includes(q);
        if (!matchesNum && !matchesGuest && !matchesType) return false;
      }
      return true;
    });
  }, [rooms, selectedStatus, selectedFloor, selectedType, searchQuery]);

  // Handle open booking modal
  const handleOpenBooking = (room = null, type = "walkin") => {
    setSelectedRoom(room);
    setBookingType(type);
    const selectedTypeId = room ? room.room_type_id : (roomTypes[0]?.id || "");
    const matchingType = roomTypes.find((t) => t.id === selectedTypeId);
    const baseRate = room ? room.base_rate : (matchingType?.base_rate || "");

    setBookingForm({
      guest_name: "",
      guest_phone: "",
      guest_email: "",
      guest_id_number: "",
      room_id: room ? String(room.id) : "",
      check_in_date: today,
      check_out_date: tomorrow,
      adults: 1,
      children: 0,
      rate_per_night: baseRate ? String(baseRate) : "",
      initial_payment: "",
      payment_method: "cash",
      transaction_reference: "",
      special_requests: "",
    });
    setBookingModalOpen(true);
  };

  // Handle change in booking form dates/room to calculate total
  const calculatedNights = useMemo(() => {
    if (!bookingForm.check_in_date || !bookingForm.check_out_date) return 1;
    const d1 = new Date(bookingForm.check_in_date);
    const d2 = new Date(bookingForm.check_out_date);
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [bookingForm.check_in_date, bookingForm.check_out_date]);

  const calculatedTotal = useMemo(() => {
    const rate = Number(bookingForm.rate_per_night) || 0;
    return rate * calculatedNights;
  }, [bookingForm.rate_per_night, calculatedNights]);

  // Submit booking
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.room_id) {
      showToast("Please select a room", "error");
      return;
    }
    if (!bookingForm.guest_name.trim()) {
      showToast("Guest name is required", "error");
      return;
    }

    try {
      await createReservation({
        ...bookingForm,
        is_walkin: bookingType === "walkin",
      });
      showToast(
        bookingType === "walkin"
          ? "Guest checked in successfully!"
          : "Reservation confirmed successfully!"
      );
      setBookingModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to create booking", "error");
    }
  };

  // Handle quick room status update (e.g. cleaning -> available)
  const handleStatusChange = async (roomId, newStatus) => {
    try {
      await updateRoomStatus(roomId, newStatus);
      showToast(`Room marked as ${newStatus}`);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to update room status", "error");
    }
  };

  // Open Checkout Modal
  const handleOpenCheckout = (room) => {
    if (!room.current_reservation_id) {
      showToast("No active reservation found on this room", "error");
      return;
    }
    setSelectedRoom(room);
    const balance = Number(room.total_amount || 0) - Number(room.paid_amount || 0);
    setActiveReservation({
      id: room.current_reservation_id,
      room_number: room.room_number,
      guest_name: room.guest_name,
      check_in_date: room.check_in_date,
      check_out_date: room.check_out_date,
      total_amount: Number(room.total_amount || 0),
      paid_amount: Number(room.paid_amount || 0),
      balance_due: balance > 0 ? balance : 0,
      payment_amount: balance > 0 ? balance : 0,
      payment_method: "cash",
      notes: "",
    });
    setCheckoutModalOpen(true);
  };

  // Submit Checkout
  const handleConfirmCheckout = async (e) => {
    e.preventDefault();
    try {
      await checkOutReservation(activeReservation.id, {
        payment_amount: activeReservation.payment_amount,
        payment_method: activeReservation.payment_method,
        notes: activeReservation.notes,
      });
      showToast(`Room ${activeReservation.room_number} checked out successfully!`);
      setCheckoutModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to check out", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Rooms</span>
            <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
              <DoorClosed size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.total || 0}</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-700">Available</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-800">{stats.available || 0}</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-rose-700">Occupied</span>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-800">{stats.occupied || 0}</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-amber-700">Reserved</span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-800">{stats.reserved || 0}</p>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-sky-700">Cleaning</span>
            <span className="rounded-lg bg-sky-100 p-1 text-sky-600">
              <Sparkles size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-sky-800">{stats.cleaning || 0}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Occupancy</span>
            <span className="text-xs font-bold text-slate-700">{stats.occupancyRate || 0}%</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(100, stats.occupancyRate || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* TOOLBAR: FILTERS + ACTIONS */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          {["all", "available", "occupied", "reserved", "cleaning", "maintenance"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                selectedStatus === st
                  ? "bg-slate-900 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Floor filter */}
          {floors.length > 0 && (
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">All Floors</option>
              {floors.map((f) => (
                <option key={f} value={f}>
                  Floor {f}
                </option>
              ))}
            </select>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search room, guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 w-44"
            />
          </div>

          {/* New Walk-in Button */}
          <button
            onClick={() => handleOpenBooking(null, "walkin")}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Walk-in Check-In
          </button>

          {/* New Reservation Button */}
          <button
            onClick={() => handleOpenBooking(null, "reservation")}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition"
          >
            <CalendarCheck size={16} />
            New Reservation
          </button>
        </div>
      </div>

      {/* ROOMS GRID */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <DoorClosed className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-800">No rooms found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {rooms.length === 0
              ? "You have no rooms created yet. Go to Room Management to add your hotel rooms."
              : "Try adjusting your search or filter parameters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => {
            const config = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;
            return (
              <div
                key={room.id}
                className={`relative flex flex-col justify-between rounded-2xl border ${config.border} bg-white p-5 shadow-sm transition hover:shadow-md`}
              >
                <div>
                  {/* Top Bar: Room # & Status Badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-slate-900">
                          #{room.room_number}
                        </span>
                        <span className="text-xs text-slate-400">Floor {room.floor}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-600">{room.type_name}</p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                      {config.label}
                    </span>
                  </div>

                  {/* Rate */}
                  <div className="mt-3 text-xs text-slate-500">
                    Rate: <span className="font-semibold text-slate-800">${Number(room.base_rate).toFixed(2)}</span> / night
                  </div>

                  {/* Occupied / Reserved Guest info */}
                  {room.status === "occupied" && (
                    <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <User size={14} className="text-rose-600" />
                        <span className="truncate">{room.guest_name}</span>
                      </div>
                      {room.guest_phone && (
                        <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                          <Phone size={12} />
                          <span>{room.guest_phone}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between border-t border-rose-100/60 pt-2 text-[11px] text-slate-600">
                        <span>Check-out:</span>
                        <span className="font-semibold text-slate-800">
                          {room.check_out_date?.split("T")[0]}
                        </span>
                      </div>
                    </div>
                  )}

                  {room.status === "reserved" && (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <CalendarCheck size={14} className="text-amber-600" />
                        <span className="truncate">{room.guest_name}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-amber-100/60 pt-2 text-[11px] text-slate-600">
                        <span>Check-in date:</span>
                        <span className="font-semibold text-slate-800">
                          {room.check_in_date?.split("T")[0]}
                        </span>
                      </div>
                    </div>
                  )}

                  {room.status === "cleaning" && (
                    <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-xs flex items-center gap-2 text-sky-800">
                      <Sparkles size={16} />
                      <span>Housekeeping in progress</span>
                    </div>
                  )}

                  {room.status === "maintenance" && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center gap-2 text-slate-600">
                      <Wrench size={16} />
                      <span>Out of order / Under repair</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 border-t border-slate-100 pt-3">
                  {room.status === "available" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenBooking(room, "walkin")}
                        className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition text-center"
                      >
                        Walk-In
                      </button>
                      <button
                        onClick={() => handleOpenBooking(room, "reservation")}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition text-center"
                      >
                        Reserve
                      </button>
                    </div>
                  )}

                  {room.status === "occupied" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenCheckout(room)}
                        className="flex-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                      >
                        Check-Out & Pay
                      </button>
                    </div>
                  )}

                  {room.status === "reserved" && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await checkInReservation(room.current_reservation_id);
                            showToast(`Room ${room.room_number} checked in!`);
                            loadData();
                          } catch (err) {
                            showToast(err.message, "error");
                          }
                        }}
                        className="flex-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
                      >
                        Confirm Check-In
                      </button>
                    </div>
                  )}

                  {room.status === "cleaning" && (
                    <button
                      onClick={() => handleStatusChange(room.id, "available")}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      <CheckCircle2 size={14} />
                      Ready / Mark Available
                    </button>
                  )}

                  {room.status === "maintenance" && (
                    <button
                      onClick={() => handleStatusChange(room.id, "available")}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Restore to Available
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================
          MODAL: NEW WALK-IN / RESERVATION
      ==================================================== */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {bookingType === "walkin" ? "Guest Walk-In Check-In" : "New Room Reservation"}
                </h3>
                <p className="text-xs text-slate-500">
                  {bookingType === "walkin"
                    ? "Assign an available room and check in the guest immediately."
                    : "Reserve a room for future dates."}
                </p>
              </div>
              <button
                onClick={() => setBookingModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="p-6 space-y-5">
              {/* Type Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setBookingType("walkin")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    bookingType === "walkin"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ⚡ Instant Walk-in
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType("reservation")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    bookingType === "reservation"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📅 Advance Reservation
                </button>
              </div>

              {/* Guest Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Guest Information
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abebe Bekele"
                      value={bookingForm.guest_name}
                      onChange={(e) => setBookingForm({ ...bookingForm, guest_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+251 91 123 4567"
                      value={bookingForm.guest_phone}
                      onChange={(e) => setBookingForm({ ...bookingForm, guest_phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="guest@example.com"
                      value={bookingForm.guest_email}
                      onChange={(e) => setBookingForm({ ...bookingForm, guest_email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ID / Passport No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EP1234567"
                      value={bookingForm.guest_id_number}
                      onChange={(e) => setBookingForm({ ...bookingForm, guest_id_number: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Room & Stay Dates */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Stay & Room Selection
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Room *
                    </label>
                    <select
                      required
                      value={bookingForm.room_id}
                      onChange={(e) => {
                        const rId = e.target.value;
                        const r = rooms.find((x) => String(x.id) === String(rId));
                        setBookingForm({
                          ...bookingForm,
                          room_id: rId,
                          rate_per_night: r ? String(r.base_rate) : bookingForm.rate_per_night,
                        });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose a Room --</option>
                      {rooms
                        .filter((r) => r.status === "available" || (selectedRoom && r.id === selectedRoom.id))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            Room #{r.room_number} - {r.type_name} (${Number(r.base_rate).toFixed(2)}/nt)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rate Per Night ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={bookingForm.rate_per_night}
                      onChange={(e) => setBookingForm({ ...bookingForm, rate_per_night: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Check-In Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingForm.check_in_date}
                      onChange={(e) => setBookingForm({ ...bookingForm, check_in_date: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Check-Out Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={bookingForm.check_in_date}
                      value={bookingForm.check_out_date}
                      onChange={(e) => setBookingForm({ ...bookingForm, check_out_date: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Adults</label>
                    <input
                      type="number"
                      min="1"
                      value={bookingForm.adults}
                      onChange={(e) => setBookingForm({ ...bookingForm, adults: parseInt(e.target.value, 10) || 1 })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Children</label>
                    <input
                      type="number"
                      min="0"
                      value={bookingForm.children}
                      onChange={(e) => setBookingForm({ ...bookingForm, children: parseInt(e.target.value, 10) || 0 })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Total Calculation & Payment */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-slate-600">
                    Stay Duration: <strong className="text-slate-900">{calculatedNights} Night(s)</strong>
                  </span>
                  <span className="text-slate-600">
                    Total Accommodation: <strong className="text-blue-600 font-bold">${calculatedTotal.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {bookingType === "walkin" ? "Initial Payment / Full Payment" : "Advance Deposit"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={bookingForm.initial_payment}
                      onChange={(e) => setBookingForm({ ...bookingForm, initial_payment: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={bookingForm.payment_method}
                      onChange={(e) => setBookingForm({ ...bookingForm, payment_method: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card (POS / Visa / Mastercard)</option>
                      <option value="telebirr">Telebirr</option>
                      <option value="cbe_birr">CBE Birr</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
                >
                  {bookingType === "walkin" ? "Check In Guest" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: CHECK-OUT & BILL SETTLEMENT
      ==================================================== */}
      {checkoutModalOpen && activeReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Check-Out: Room #{activeReservation.room_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Settle balance, complete checkout, and free room for cleaning.
                </p>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckout} className="p-6 space-y-5">
              {/* Guest & Stay Details */}
              <div className="rounded-2xl bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Guest Name:</span>
                  <span className="font-bold text-slate-900">{activeReservation.guest_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dates:</span>
                  <span className="font-medium text-slate-800">
                    {activeReservation.check_in_date?.split("T")[0]} → {activeReservation.check_out_date?.split("T")[0]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Charged:</span>
                  <span className="font-semibold text-slate-900">
                    ${Number(activeReservation.total_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Previously Paid:</span>
                  <span className="font-semibold text-emerald-600">
                    -${Number(activeReservation.paid_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="font-bold text-slate-800">Outstanding Balance:</span>
                  <span className="font-extrabold text-rose-600">
                    ${Number(activeReservation.balance_due).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Settlement Payment Input */}
              {activeReservation.balance_due > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Amount Now ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={activeReservation.payment_amount}
                      onChange={(e) =>
                        setActiveReservation({
                          ...activeReservation,
                          payment_amount: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={activeReservation.payment_method}
                      onChange={(e) =>
                        setActiveReservation({
                          ...activeReservation,
                          payment_method: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card (POS / Visa / Mastercard)</option>
                      <option value="telebirr">Telebirr</option>
                      <option value="cbe_birr">CBE Birr</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition"
                >
                  Process Check-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
