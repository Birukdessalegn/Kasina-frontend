import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  BedDouble,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  Check,
  User,
  ShieldCheck,
  Package
} from "lucide-react";
import api from "../../../services/api";
import HousekeepingTaskModal from "../components/HousekeepingTaskModal";

function HousekeepingPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("rooms"); // 'rooms' | 'tasks' | 'linens'
  const [roomFilter, setRoomFilter] = useState("all"); // 'all' | 'cleaning' | 'available' | 'occupied' | 'maintenance'

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedRoomForTask, setSelectedRoomForTask] = useState(null);

  const fetchHousekeepingData = async () => {
    try {
      setLoading(true);
      setError("");

      const [dashRes, taskRes] = await Promise.all([
        api("/housekeeping/dashboard").catch(() => ({})),
        api("/housekeeping/tasks").catch(() => ({}))
      ]);

      setDashboardData(dashRes.data || null);
      setTasks(taskRes.data || []);
    } catch (err) {
      console.error("Failed to load housekeeping dashboard:", err);
      setError(err.message || "Failed to load housekeeping operations data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeepingData();
    const interval = setInterval(fetchHousekeepingData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await api(`/housekeeping/tasks/${taskId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      fetchHousekeepingData();
    } catch (err) {
      console.error("Failed to update task status:", err);
      alert(err.message || "Failed to update status");
    }
  };

  const handleOpenAssignModal = (room = null) => {
    setSelectedRoomForTask(room);
    setIsTaskModalOpen(true);
  };

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    if (!dashboardData?.rooms) return [];
    if (roomFilter === "all") return dashboardData.rooms;
    return dashboardData.rooms.filter((r) => r.status === roomFilter);
  }, [dashboardData, roomFilter]);

  const stats = dashboardData?.stats || {
    totalRooms: 0,
    available: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Housekeeping & Room Operations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage room cleaning workflows, cleaner assignments, and linen turnover.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenAssignModal(null)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-500 transition"
          >
            <Plus className="h-4 w-4" />
            Assign Cleaning Task
          </button>

          <button
            onClick={fetchHousekeepingData}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div
          onClick={() => setRoomFilter("all")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            roomFilter === "all" ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-bold uppercase opacity-70">Total Rooms</span>
          <p className="mt-1 text-2xl font-black">{stats.totalRooms}</p>
        </div>

        <div
          onClick={() => setRoomFilter("available")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            roomFilter === "available" ? "border-emerald-600 bg-emerald-600 text-white shadow-md" : "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60"
          }`}
        >
          <span className={`text-xs font-bold uppercase ${roomFilter === "available" ? "text-white" : "text-emerald-700"}`}>
            Ready (Clean)
          </span>
          <p className={`mt-1 text-2xl font-black ${roomFilter === "available" ? "text-white" : "text-emerald-800"}`}>
            {stats.available}
          </p>
        </div>

        <div
          onClick={() => setRoomFilter("cleaning")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            roomFilter === "cleaning" ? "border-amber-600 bg-amber-600 text-white shadow-md" : "border-amber-200 bg-amber-50/60 hover:bg-amber-100/60"
          }`}
        >
          <span className={`text-xs font-bold uppercase ${roomFilter === "cleaning" ? "text-white" : "text-amber-700"}`}>
            Needs Cleaning
          </span>
          <p className={`mt-1 text-2xl font-black ${roomFilter === "cleaning" ? "text-white" : "text-amber-800"}`}>
            {stats.cleaning}
          </p>
        </div>

        <div
          onClick={() => setRoomFilter("occupied")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            roomFilter === "occupied" ? "border-blue-600 bg-blue-600 text-white shadow-md" : "border-blue-200 bg-blue-50/60 hover:bg-blue-100/60"
          }`}
        >
          <span className={`text-xs font-bold uppercase ${roomFilter === "occupied" ? "text-white" : "text-blue-700"}`}>
            Occupied
          </span>
          <p className={`mt-1 text-2xl font-black ${roomFilter === "occupied" ? "text-white" : "text-blue-800"}`}>
            {stats.occupied}
          </p>
        </div>

        <div
          onClick={() => setRoomFilter("maintenance")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            roomFilter === "maintenance" ? "border-rose-600 bg-rose-600 text-white shadow-md" : "border-rose-200 bg-rose-50/60 hover:bg-rose-100/60"
          }`}
        >
          <span className={`text-xs font-bold uppercase ${roomFilter === "maintenance" ? "text-white" : "text-rose-700"}`}>
            Maintenance
          </span>
          <p className={`mt-1 text-2xl font-black ${roomFilter === "maintenance" ? "text-white" : "text-rose-800"}`}>
            {stats.maintenance}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("rooms")}
          className={`border-b-2 px-6 py-3 text-sm font-bold transition ${
            activeTab === "rooms"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Room Status Grid ({filteredRooms.length})
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`border-b-2 px-6 py-3 text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "tasks"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Cleaning Task Queue
          {tasks.filter((t) => t.status !== "completed" && t.status !== "inspected").length > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
              {tasks.filter((t) => t.status !== "completed" && t.status !== "inspected").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("linens")}
          className={`border-b-2 px-6 py-3 text-sm font-bold transition ${
            activeTab === "linens"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Linen & Towel Inventory
        </button>
      </div>

      {/* Tab 1: Room Status Grid */}
      {activeTab === "rooms" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => {
            const isCleaning = room.status === "cleaning";
            const isAvailable = room.status === "available";
            const isOccupied = room.status === "occupied";
            const isMaint = room.status === "maintenance";

            return (
              <div
                key={room.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                  isCleaning
                    ? "border-amber-300 bg-amber-50/20"
                    : isAvailable
                    ? "border-emerald-200 bg-emerald-50/10"
                    : isOccupied
                    ? "border-blue-200 bg-blue-50/10"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900">
                        Room {room.room_number}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        Floor {room.floor}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{room.room_type_name}</p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black uppercase border ${
                      isAvailable
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isCleaning
                        ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                        : isOccupied
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                {/* Active Cleaner info if assigned */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Assigned Staff:</span>
                  <span className="font-bold text-slate-700">
                    {room.cleaner_first_name
                      ? `${room.cleaner_first_name} ${room.cleaner_last_name || ""}`
                      : "Not Assigned"}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex items-center gap-2">
                  {isCleaning ? (
                    <>
                      {room.active_task_id ? (
                        <button
                          onClick={() => handleUpdateTaskStatus(room.active_task_id, "inspected")}
                          className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition text-center"
                        >
                          Mark Clean & Ready
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenAssignModal(room)}
                          className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 transition"
                        >
                          Dispatch Cleaner
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenAssignModal(room)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Assign Task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Cleaning Task Queue */}
      {activeTab === "tasks" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Active Cleaning Dispatches</h2>
            <span className="text-xs text-slate-400">{tasks.length} total tasks</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Room</th>
                  <th className="px-5 py-3.5">Cleaner</th>
                  <th className="px-5 py-3.5">Task Type</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Instructions</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">Room {t.room_number}</p>
                      <p className="text-xs text-slate-400">{t.room_type_name} • Floor {t.floor}</p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {t.cleaner_first_name ? t.cleaner_first_name[0] : "?"}
                        </div>
                        <span className="font-bold text-slate-700 text-xs">
                          {t.cleaner_first_name ? `${t.cleaner_first_name} ${t.cleaner_last_name || ""}` : "Unassigned"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 capitalize">
                        {(t.task_type || "").replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          t.priority === "urgent"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize border ${
                          t.status === "completed" || t.status === "inspected"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : t.status === "in_progress"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {t.notes || "-"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {t.status !== "completed" && t.status !== "inspected" && (
                        <div className="flex items-center justify-end gap-2">
                          {t.status === "pending" && (
                            <button
                              onClick={() => handleUpdateTaskStatus(t.id, "in_progress")}
                              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                            >
                              Start
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateTaskStatus(t.id, "inspected")}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition"
                          >
                            Mark Clean
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Linen & Towel Inventory */}
      {activeTab === "linens" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-sm">Hotel Linen & Bedding Tracker</h2>
            <p className="text-xs text-slate-400">Monitor stock in rooms, in laundry wash, and clean supply.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Item Name</th>
                  <th className="px-5 py-3.5 text-center">Total Stock</th>
                  <th className="px-5 py-3.5 text-center">In Rooms (In Use)</th>
                  <th className="px-5 py-3.5 text-center">In Laundry</th>
                  <th className="px-5 py-3.5 text-center">Clean & Ready</th>
                  <th className="px-5 py-3.5 text-center">Availability Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dashboardData?.linens || []).map((linen) => {
                  const availableRatio = linen.total_quantity > 0 ? (linen.clean_available / linen.total_quantity) * 100 : 0;
                  return (
                    <tr key={linen.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {linen.item_name}
                      </td>

                      <td className="px-5 py-4 text-center font-black text-slate-800">
                        {linen.total_quantity} {linen.unit}
                      </td>

                      <td className="px-5 py-4 text-center font-semibold text-blue-700">
                        {linen.in_use} {linen.unit}
                      </td>

                      <td className="px-5 py-4 text-center font-semibold text-amber-700">
                        {linen.in_laundry} {linen.unit}
                      </td>

                      <td className="px-5 py-4 text-center font-black text-emerald-700">
                        {linen.clean_available} {linen.unit}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-black ${
                            availableRatio >= 40
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {availableRatio >= 40 ? "Adequate Stock" : "Wash Laundry Urgently"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      <HousekeepingTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={fetchHousekeepingData}
        rooms={dashboardData?.rooms || []}
        cleaners={dashboardData?.cleaners || []}
        preselectedRoom={selectedRoomForTask}
      />
    </div>
  );
}

export default HousekeepingPage;
