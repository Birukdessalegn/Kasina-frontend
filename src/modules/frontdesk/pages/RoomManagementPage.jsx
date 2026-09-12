import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  DoorClosed,
  Layers,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
  Wrench
} from "lucide-react";
import {
  getRooms,
  getRoomTypes,
  createRoom,
  updateRoom,
  deleteRoom,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  updateRoomStatus
} from "../services/frontdeskApi";

export default function RoomManagementPage() {
  const [activeTab, setActiveTab] = useState("rooms"); // 'rooms' | 'types'
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Room modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    room_number: "",
    room_type_id: "",
    floor: 1,
    status: "available",
    notes: "",
  });

  // Room Type modal
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    base_rate: "",
    capacity: 2,
    description: "",
    amenities: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, tRes] = await Promise.all([getRooms(), getRoomTypes()]);
      setRooms(rRes.data || []);
      setRoomTypes(tRes.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Room modal open
  const handleOpenRoomModal = (room = null) => {
    if (room) {
      setEditingRoom(room);
      setRoomForm({
        room_number: room.room_number,
        room_type_id: String(room.room_type_id),
        floor: room.floor,
        status: room.status,
        notes: room.notes || "",
      });
    } else {
      setEditingRoom(null);
      setRoomForm({
        room_number: "",
        room_type_id: roomTypes[0]?.id ? String(roomTypes[0].id) : "",
        floor: 1,
        status: "available",
        notes: "",
      });
    }
    setRoomModalOpen(true);
  };

  // Room submit
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, roomForm);
        showToast(`Room #${roomForm.room_number} updated`);
      } else {
        await createRoom(roomForm);
        showToast(`Room #${roomForm.room_number} created`);
      }
      setRoomModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to save room", "error");
    }
  };

  // Room delete
  const handleDeleteRoom = async (id, roomNumber) => {
    if (!window.confirm(`Are you sure you want to delete Room #${roomNumber}?`)) return;
    try {
      await deleteRoom(id);
      showToast(`Room #${roomNumber} deleted`);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to delete room", "error");
    }
  };

  // Room Type modal open
  const handleOpenTypeModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        name: type.name,
        base_rate: String(type.base_rate),
        capacity: type.capacity || 2,
        description: type.description || "",
        amenities: Array.isArray(type.amenities) ? type.amenities.join(", ") : "",
      });
    } else {
      setEditingType(null);
      setTypeForm({
        name: "",
        base_rate: "",
        capacity: 2,
        description: "",
        amenities: "Wi-Fi, Smart TV, AC, Hot Shower",
      });
    }
    setTypeModalOpen(true);
  };

  // Room Type submit
  const handleSaveType = async (e) => {
    e.preventDefault();
    const amenitiesArr = typeForm.amenities
      ? typeForm.amenities.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      name: typeForm.name.trim(),
      base_rate: Number(typeForm.base_rate),
      capacity: Number(typeForm.capacity),
      description: typeForm.description.trim(),
      amenities: amenitiesArr,
    };

    try {
      if (editingType) {
        await updateRoomType(editingType.id, payload);
        showToast(`Room type '${payload.name}' updated`);
      } else {
        await createRoomType(payload);
        showToast(`Room type '${payload.name}' created`);
      }
      setTypeModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to save room category", "error");
    }
  };

  // Room Type delete
  const handleDeleteType = async (id, name) => {
    if (!window.confirm(`Delete category '${name}'? This is only allowed if no rooms belong to it.`)) return;
    try {
      await deleteRoomType(id);
      showToast(`Category '${name}' deleted`);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to delete room category", "error");
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

      {/* TABS & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex rounded-xl bg-slate-200/70 p-1">
          <button
            onClick={() => setActiveTab("rooms")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === "rooms"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DoorClosed size={16} />
            Rooms ({rooms.length})
          </button>
          <button
            onClick={() => setActiveTab("types")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === "types"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={16} />
            Room Types ({roomTypes.length})
          </button>
        </div>

        <div>
          {activeTab === "rooms" ? (
            <button
              onClick={() => handleOpenRoomModal()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Plus size={16} />
              Add Room
            </button>
          ) : (
            <button
              onClick={() => handleOpenTypeModal()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Plus size={16} />
              Add Room Type
            </button>
          )}
        </div>
      </div>

      {/* ROOMS TABLE */}
      {activeTab === "rooms" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Room #</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Floor</th>
                <th className="px-6 py-4">Nightly Rate</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    Room {room.room_number}
                  </td>
                  <td className="px-6 py-4">{room.type_name}</td>
                  <td className="px-6 py-4">Floor {room.floor}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    ${Number(room.base_rate).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        room.status === "available"
                          ? "bg-emerald-50 text-emerald-700"
                          : room.status === "occupied"
                          ? "bg-rose-50 text-rose-700"
                          : room.status === "reserved"
                          ? "bg-amber-50 text-amber-700"
                          : room.status === "cleaning"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {room.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenRoomModal(room)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Edit Room"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id, room.room_number)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete Room"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No rooms registered yet. Click "Add Room" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ROOM TYPES TABLE */}
      {activeTab === "types" && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {roomTypes.map((t) => (
            <div
              key={t.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenTypeModal(t)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteType(t.id, t.name)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-black text-blue-600">
                    ${Number(t.base_rate).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">/ night</span>
                </div>

                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                  {t.description || "No description provided."}
                </p>

                <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-slate-400" />
                    Capacity: {t.capacity}
                  </span>
                  <span className="flex items-center gap-1">
                    <DoorClosed size={12} className="text-slate-400" />
                    Total: {t.total_rooms || 0}
                  </span>
                </div>

                {/* Amenities badges */}
                {Array.isArray(t.amenities) && t.amenities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {t.amenities.map((am, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                      >
                        {am}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {roomTypes.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
              No room types configured. Add one to get started!
            </div>
          )}
        </div>
      )}

      {/* CREATE/EDIT ROOM MODAL */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRoom ? "Edit Room" : "Add New Room"}
              </h3>
              <button
                onClick={() => setRoomModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Room Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Room Category *
                </label>
                <select
                  required
                  value={roomForm.room_type_id}
                  onChange={(e) => setRoomForm({ ...roomForm, room_type_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">-- Select Category --</option>
                  {roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (${Number(t.base_rate).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Floor</label>
                <input
                  type="number"
                  min="1"
                  value={roomForm.floor}
                  onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value, 10) || 1 })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={roomForm.status}
                  onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Garden view, renovated recently"
                  value={roomForm.notes}
                  onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE/EDIT ROOM TYPE MODAL */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingType ? "Edit Room Category" : "Add Room Category"}
              </h3>
              <button
                onClick={() => setTypeModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Room"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rate per Night ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1500"
                    value={typeForm.base_rate}
                    onChange={(e) => setTypeForm({ ...typeForm, base_rate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Capacity (Guests)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={typeForm.capacity}
                    onChange={(e) => setTypeForm({ ...typeForm, capacity: parseInt(e.target.value, 10) || 2 })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short description of this room type"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amenities (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Wi-Fi, Balcony, Mini-bar, AC"
                  value={typeForm.amenities}
                  onChange={(e) => setTypeForm({ ...typeForm, amenities: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
