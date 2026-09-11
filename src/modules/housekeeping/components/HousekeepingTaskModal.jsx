import { useState, useEffect } from "react";
import { X, Sparkles, AlertCircle, Save } from "lucide-react";
import api from "../../../services/api";

function HousekeepingTaskModal({ isOpen, onClose, onSuccess, rooms = [], cleaners = [], preselectedRoom = null }) {
  const [formData, setFormData] = useState({
    roomId: "",
    assignedEmployeeId: "",
    taskType: "standard_clean",
    priority: "normal",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormData({
        roomId: preselectedRoom ? preselectedRoom.id : "",
        assignedEmployeeId: "",
        taskType: "standard_clean",
        priority: "normal",
        notes: ""
      });
      setError("");
    }
  }, [isOpen, preselectedRoom]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.roomId) {
      setError("Please select a room to assign");
      return;
    }

    try {
      setSubmitting(true);
      await api("/housekeeping/tasks", {
        method: "POST",
        body: JSON.stringify({
          roomId: Number(formData.roomId),
          assignedEmployeeId: formData.assignedEmployeeId ? Number(formData.assignedEmployeeId) : null,
          taskType: formData.taskType,
          priority: formData.priority,
          notes: formData.notes
        })
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to create cleaning task:", err);
      setError(err.message || "Failed to create housekeeping task");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 backdrop-blur-xs flex justify-center items-start sm:items-center">
      <div className="relative w-full max-w-lg my-4 sm:my-auto max-h-[86vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Assign Cleaning Task
              </h2>
              <p className="text-xs text-slate-500">
                Dispatch room cleaning to housekeeping staff.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Room Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Room *
            </label>
            <select
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              required
            >
              <option value="">-- Choose Room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} (Floor {r.floor} • {r.status})
                </option>
              ))}
            </select>
          </div>

          {/* Cleaner Assignment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assign Cleaner Staff
            </label>
            <select
              value={formData.assignedEmployeeId}
              onChange={(e) => setFormData({ ...formData, assignedEmployeeId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
            >
              <option value="">-- Unassigned (Any Available Cleaner) --</option>
              {cleaners.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.position_title || "Staff"})
                </option>
              ))}
            </select>
          </div>

          {/* Task Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Task Type
              </label>
              <select
                value={formData.taskType}
                onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                <option value="standard_clean">Standard Clean</option>
                <option value="deep_clean">Deep Clean / Turnover</option>
                <option value="inspection">Manager Inspection</option>
                <option value="turn_down">Evening Turn-Down</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent (Next Guest Check-in)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Instructions / Specific Requests
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Change all king linens, refill guest toiletries, check AC filter..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Dispatching..." : "Assign Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HousekeepingTaskModal;
