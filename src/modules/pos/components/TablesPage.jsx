import { useEffect, useState, useMemo } from "react";
import { 
  Plus, 
  Users, 
  MapPin, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X, 
  Wine, 
  UtensilsCrossed, 
  Crown, 
  Armchair, 
  Search, 
  Check, 
  Sparkles,
  Coffee
} from "lucide-react";
import api from "../../../services/api";

// Helper to determine if a table is in the Cafe & Bakery section
export const isCafeTable = (table) => {
  if (!table) return false;
  return (
    Number(table.outlet_id) === 2 ||
    String(table.outlet_code || "").toUpperCase() === "CAFE" ||
    table.type === "cafe" ||
    table.section === "CAFE" ||
    String(table.location || "").toLowerCase().includes("cafe") ||
    String(table.table_number || table.tableNumber || "").toLowerCase().startsWith("cf") ||
    String(table.table_number || table.tableNumber || "").toLowerCase().includes("cafe")
  );
};

// Helper to determine if a table record is a bar stool or bar seating
export const isBarTable = (table) => {
  if (!table) return false;
  return (
    Number(table.outlet_id) === 3 ||
    String(table.outlet_code || "").toUpperCase() === "BAR" ||
    table.is_bar_seat === true ||
    table.is_bar_seat === 1 ||
    table.is_bar_seat === "true" ||
    table.isBarSeat === true ||
    table.type === "bar" ||
    table.section === "BAR" ||
    String(table.location || "").toLowerCase().includes("bar") ||
    String(table.table_number || table.tableNumber || "").toLowerCase().startsWith("bar") ||
    String(table.table_number || table.tableNumber || "").toLowerCase().startsWith("b-")
  );
};

// Backwards-compatible export for older callers
export const isBarSeatTable = isBarTable;

// Helper to determine if a table is Restaurant dining
export const isRestaurantTable = (table) => {
  if (!table) return false;
  if (isCafeTable(table) || isBarTable(table)) return false;
  return (
    Number(table.outlet_id) === 4 ||
    String(table.outlet_code || "").toUpperCase() === "RESTAURANT" ||
    table.type === "restaurant" ||
    table.type === "dining" ||
    table.section === "RESTAURANT" ||
    table.section === "DINING" ||
    true
  );
};

// Helper to determine if a table is VIP
export const isVipTable = (table) => {
  if (!table) return false;
  return (
    table.type === "vip" ||
    table.section === "VIP" ||
    table.is_vip === true ||
    String(table.location || "").toLowerCase().includes("vip") ||
    String(table.table_number || table.tableNumber || "").toLowerCase().startsWith("vip")
  );
};

function TablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | CAFE | BAR | RESTAURANT | VIP
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    venue: "restaurant", // "cafe" | "bar" | "restaurant"
    outlet_id: 4,
    tableNumber: "T-01",
    capacity: 4,
    location: "Main Dining Hall",
    isBarSeat: false,
    isVip: false,
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const data = await api("/pos/tables");
      setTables(data.tables || data.data || (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error("Failed to fetch tables:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Close popup with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showForm) {
        setShowForm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showForm]);

  // Suggest next table number for chosen venue
  const suggestNextTableNumber = (venue, isBarCounter = false) => {
    if (venue === "cafe") {
      const cafeCount = tables.filter(isCafeTable).length + 1;
      return `CF-${String(cafeCount).padStart(2, "0")}`;
    }
    if (venue === "bar") {
      const barCount = tables.filter(isBarTable).length + 1;
      return isBarCounter
        ? `BAR-${String(barCount).padStart(2, "0")}`
        : `B-${String(barCount).padStart(2, "0")}`;
    }
    // restaurant
    const restCount = tables.filter(isRestaurantTable).length + 1;
    return `T-${String(restCount).padStart(2, "0")}`;
  };

  // Switch venue (Cafe, Bar, Restaurant) with sensible defaults
  const handleVenueChange = (venue) => {
    if (venue === "cafe") {
      setFormData((prev) => ({
        ...prev,
        venue: "cafe",
        outlet_id: 2,
        capacity: 2,
        location: "Cafe Lounge",
        isBarSeat: false,
        tableNumber: suggestNextTableNumber("cafe"),
      }));
    } else if (venue === "bar") {
      setFormData((prev) => ({
        ...prev,
        venue: "bar",
        outlet_id: 3,
        capacity: 1,
        location: "Cocktail Bar Counter",
        isBarSeat: true,
        tableNumber: suggestNextTableNumber("bar", true),
      }));
    } else {
      // restaurant
      setFormData((prev) => ({
        ...prev,
        venue: "restaurant",
        outlet_id: 4,
        capacity: 4,
        location: "Main Dining Hall",
        isBarSeat: false,
        tableNumber: suggestNextTableNumber("restaurant"),
      }));
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();

    const isBar = formData.venue === "bar";
    const isCafe = formData.venue === "cafe";
    const isBarSeat = isBar && formData.isBarSeat;

    const type = formData.isVip ? "vip" : isCafe ? "cafe" : isBar ? "bar" : "dining";
    const section = formData.isVip ? "VIP" : isCafe ? "CAFE" : isBar ? "BAR" : "DINING";

    const payload = {
      tableNumber: formData.tableNumber.trim(),
      table_number: formData.tableNumber.trim(),
      capacity: Number(formData.capacity) || 1,
      outlet_id: formData.outlet_id,
      outletId: formData.outlet_id,
      is_bar_seat: isBarSeat,
      isBarSeat: isBarSeat,
      type: type,
      section: section,
      location: formData.location.trim(),
    };

    try {
      const data = await api("/pos/tables", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newTable = data.table || data.data || {
        id: Date.now(),
        ...payload,
        status: "available",
      };

      setTables((previous) => [...previous, newTable]);

      const venueLabel = isCafe ? "Cafe Table" : isBar ? (isBarSeat ? "Bar Stool" : "Bar Table") : "Restaurant Table";
      showToast(`${venueLabel} "${formData.tableNumber}" created successfully!`, "success");

      // Reset form with next sequence
      setFormData((prev) => ({
        ...prev,
        tableNumber: suggestNextTableNumber(prev.venue, prev.isBarSeat),
      }));

      setShowForm(false);
    } catch (error) {
      console.error("Create table error:", error);
      showToast(error.message || "Failed to create table", "error");
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm("Are you sure you want to delete this table / seat?")) return;

    try {
      try {
        await api(`/tables/${id}`, {
          method: "DELETE",
        });
      } catch {
        await api(`/pos/tables/${id}`, {
          method: "DELETE",
        });
      }

      setTables((previous) => previous.filter((table) => table.id !== id));
      showToast("Table deleted successfully!", "success");
    } catch (error) {
      console.error("Delete table error:", error);
      showToast(error.message || "Failed to delete table", "error");
    }
  };

  // Metrics calculations for Cafe, Bar, Restaurant, VIP
  const metrics = useMemo(() => {
    const total = tables.length;
    let cafeCount = 0;
    let barCount = 0;
    let restaurantCount = 0;
    let vipCount = 0;
    let availableCount = 0;
    let totalCapacity = 0;

    tables.forEach((t) => {
      totalCapacity += Number(t.capacity) || 1;
      if (t.status === "available" || !t.status) availableCount++;
      if (isVipTable(t)) vipCount++;

      if (isCafeTable(t)) {
        cafeCount++;
      } else if (isBarTable(t)) {
        barCount++;
      } else {
        restaurantCount++;
      }
    });

    return {
      total,
      cafeCount,
      barCount,
      restaurantCount,
      vipCount,
      availableCount,
      totalCapacity,
    };
  }, [tables]);

  // Filtered tables based on tab & search
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // Tab filter
      if (activeTab === "CAFE" && !isCafeTable(t)) return false;
      if (activeTab === "BAR" && !isBarTable(t)) return false;
      if (activeTab === "RESTAURANT" && !isRestaurantTable(t)) return false;
      if (activeTab === "VIP" && !isVipTable(t)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = String(t.table_number || t.tableNumber || "").toLowerCase();
        const loc = String(t.location || "").toLowerCase();
        const sec = String(t.section || "").toLowerCase();
        const out = String(t.outlet_name || "").toLowerCase();
        return num.includes(q) || loc.includes(q) || sec.includes(q) || out.includes(q);
      }

      return true;
    });
  }, [tables, activeTab, searchQuery]);

  return (
    <div className="relative w-full space-y-4 sm:space-y-5 pb-12">
      {/* SUCCESS / ERROR TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 ${
            toast.type === "success"
              ? "bg-slate-900/95 border border-emerald-500/40 text-emerald-200"
              : "bg-slate-900/95 border border-rose-500/40 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}

          <span className="text-sm font-semibold">{toast.message}</span>

          <button
            onClick={() => setToast(null)}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* HEADER & ACTIONS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Tables & Floor Management
            </h1>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
              Floor Plan
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time visual table and seating map across Cafe, Bar, and Restaurant.
          </p>
        </div>

        {/* Create Table Button - Opens Modal Popup */}
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95 shrink-0"
        >
          <Plus size={15} />
          Create New Table
        </button>
      </div>

      {/* STATS OVERVIEW CARDS: CAFE, BAR, RESTAURANT, VIP (COMPACT) */}
      <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-5">
        {/* Total */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Seating</span>
            <Armchair className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <p className="mt-1 text-xl font-black text-slate-900">{metrics.total}</p>
          <p className="text-[10px] text-slate-400">{metrics.totalCapacity} total capacity</p>
        </div>

        {/* Cafe */}
        <div className="rounded-xl border border-emerald-200/70 bg-linear-to-br from-emerald-50/50 to-teal-50/30 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
              <Coffee className="h-3 w-3 text-emerald-600" /> Cafe
            </span>
            <span className="rounded-full bg-emerald-200/70 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-900">
              Bakery
            </span>
          </div>
          <p className="mt-1 text-xl font-black text-emerald-950">{metrics.cafeCount}</p>
          <p className="text-[10px] text-emerald-700">Coffee & pastries</p>
        </div>

        {/* Bar */}
        <div className="rounded-xl border border-amber-200/70 bg-linear-to-br from-amber-50/50 to-orange-50/30 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
              <Wine className="h-3 w-3 text-amber-600" /> Bar
            </span>
            <span className="rounded-full bg-amber-200/70 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-900">
              Counter
            </span>
          </div>
          <p className="mt-1 text-xl font-black text-amber-950">{metrics.barCount}</p>
          <p className="text-[10px] text-amber-700">Stools & cocktail seats</p>
        </div>

        {/* Restaurant */}
        <div className="rounded-xl border border-blue-200/70 bg-linear-to-br from-blue-50/50 to-indigo-50/30 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
              <UtensilsCrossed className="h-3 w-3 text-blue-600" /> Restaurant
            </span>
            <span className="rounded-full bg-blue-200/70 px-1.5 py-0.2 text-[9px] font-extrabold text-blue-900">
              Dining
            </span>
          </div>
          <p className="mt-1 text-xl font-black text-blue-950">{metrics.restaurantCount}</p>
          <p className="text-[10px] text-blue-700">Main dining floor</p>
        </div>

        {/* VIP */}
        <div className="rounded-xl border border-purple-200/70 bg-linear-to-br from-purple-50/50 to-pink-50/30 p-3 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 flex items-center gap-1">
              <Crown className="h-3 w-3 text-purple-600" /> VIP
            </span>
            <span className="rounded-full bg-purple-200/70 px-1.5 py-0.2 text-[9px] font-extrabold text-purple-900">
              Lounge
            </span>
          </div>
          <p className="mt-1 text-xl font-black text-purple-950">{metrics.vipCount}</p>
          <p className="text-[10px] text-purple-700">Executive booths</p>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Tables ({metrics.total})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CAFE")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "CAFE"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-800 hover:bg-emerald-100/60"
            }`}
          >
            <Coffee className="h-3 w-3" />
            Cafe ({metrics.cafeCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BAR")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "BAR"
                ? "bg-amber-500 text-slate-950 shadow-2xs"
                : "text-amber-800 hover:bg-amber-100/60"
            }`}
          >
            <Wine className="h-3 w-3" />
            Bar ({metrics.barCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("RESTAURANT")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "RESTAURANT"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-blue-800 hover:bg-blue-100/60"
            }`}
          >
            <UtensilsCrossed className="h-3 w-3" />
            Restaurant ({metrics.restaurantCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("VIP")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "VIP"
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-purple-800 hover:bg-purple-100/60"
            }`}
          >
            <Crown className="h-3 w-3" />
            VIP ({metrics.vipCount})
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search cafe, bar, table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8.5 pr-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* TABLES HIGH-DENSITY COMPACT GRID */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
              {activeTab === "CAFE"
                ? "☕ Cafe & Bakery Floor"
                : activeTab === "BAR"
                ? "🍸 Bar Counter Stools & High-Tops"
                : activeTab === "RESTAURANT"
                ? "🍽️ Restaurant Dining Floor"
                : activeTab === "VIP"
                ? "👑 VIP Lounge & Private Booths"
                : "All Floor Seating"}
            </h2>
            <p className="text-[11px] text-slate-400">
              Showing {filteredTables.length} of {tables.length} configured tables / seats
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-14 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-xs font-semibold text-slate-500">Loading tables...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Armchair className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-700">No tables found</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {searchQuery
                ? "No seating matching your search."
                : `No seats configured under ${activeTab}. Click "Create New Table" above to add one.`}
            </p>
          </div>
        ) : (
          /* SMALL, COMPACT HIGH-DENSITY CARDS */
          <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
            {filteredTables.map((table) => {
              const isCafe = isCafeTable(table);
              const isBar = isBarTable(table);
              const isVip = isVipTable(table);
              const isAvailable = table.status === "available" || !table.status;

              return (
                <div
                  key={table.id}
                  className={`group relative flex flex-col justify-between rounded-xl border p-2.5 transition duration-150 hover:shadow-md ${
                    isCafe
                      ? "border-emerald-200 bg-linear-to-b from-emerald-50/50 to-white hover:border-emerald-400"
                      : isBar
                      ? "border-amber-200 bg-linear-to-b from-amber-50/50 to-white hover:border-amber-400"
                      : isVip
                      ? "border-purple-200 bg-linear-to-b from-purple-50/50 to-white hover:border-purple-400"
                      : "border-slate-200 bg-white hover:border-blue-400"
                  }`}
                >
                  <div>
                    {/* Top Row: Venue Icon + Status Badge + Delete */}
                    <div className="flex items-center justify-between gap-1">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isCafe
                            ? "bg-emerald-100 text-emerald-800"
                            : isBar
                            ? "bg-amber-100 text-amber-900"
                            : isVip
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isCafe ? (
                          <Coffee size={12} />
                        ) : isBar ? (
                          <Wine size={12} />
                        ) : isVip ? (
                          <Crown size={12} />
                        ) : (
                          <UtensilsCrossed size={12} />
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Micro status indicator */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            isAvailable
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAvailable ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                            }`}
                          />
                          {isAvailable ? "Avail" : "Busy"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteTable(table.id)}
                          title="Delete Table"
                          className="rounded-md p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Venue Pills */}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded px-1 py-0.2 text-[8px] font-extrabold uppercase tracking-wider ${
                          isCafe
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : isBar
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-blue-100 text-blue-900 border border-blue-200"
                        }`}
                      >
                        {isCafe ? "Cafe" : isBar ? "Bar" : "Dining"}
                      </span>

                      {isVip && (
                        <span className="rounded bg-purple-100 px-1 py-0.2 text-[8px] font-extrabold uppercase tracking-wider text-purple-900 border border-purple-200">
                          👑 VIP
                        </span>
                      )}
                    </div>

                    {/* Table Name */}
                    <h3 className="mt-1 text-sm font-black text-slate-900 truncate leading-snug">
                      {table.table_number || table.tableNumber || `T-${table.id}`}
                    </h3>
                  </div>

                  {/* Seat Details Footer (Small & Compact) */}
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100/90 pt-1.5 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 font-bold text-slate-700">
                      <Users size={11} className="text-slate-400" />
                      {table.capacity || 1}p
                    </span>

                    <span className="truncate max-w-[65px] text-[9px] text-slate-400" title={table.location || ""}>
                      {table.location || (isCafe ? "Cafe" : isBar ? "Bar" : "Main")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP MODAL: CREATE NEW TABLE */}
      {showForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowForm(false)}
        >
          <div 
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
                    <Sparkles size={14} />
                  </div>
                  <h2 className="text-base font-black text-slate-900 sm:text-lg">
                    Create New Table / Seat
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select venue (<strong className="text-slate-700">Cafe</strong>, <strong className="text-slate-700">Bar</strong>, or <strong className="text-slate-700">Restaurant</strong>) to route orders correctly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-4">
              {/* Step 1: Venue Choice Cards */}
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  1. Venue / Outlet Designation *
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* CAFE */}
                  <button
                    type="button"
                    onClick={() => handleVenueChange("cafe")}
                    className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      formData.venue === "cafe"
                        ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-2xs"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                        <Coffee size={14} />
                      </div>
                      {formData.venue === "cafe" && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span className="mt-2 font-black text-xs text-slate-900 block">
                      Cafe
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Bakery & Coffee
                    </span>
                    <span className="mt-1.5 inline-block rounded bg-emerald-100/90 px-1 py-0.2 text-[8px] font-black text-emerald-900">
                      CF-xx • 2 seats
                    </span>
                  </button>

                  {/* BAR */}
                  <button
                    type="button"
                    onClick={() => handleVenueChange("bar")}
                    className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      formData.venue === "bar"
                        ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-2xs"
                        : "border-slate-200 bg-white hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold">
                        <Wine size={14} />
                      </div>
                      {formData.venue === "bar" && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span className="mt-2 font-black text-xs text-slate-900 block">
                      Bar
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Counter & Stool
                    </span>
                    <span className="mt-1.5 inline-block rounded bg-amber-100/90 px-1 py-0.2 text-[8px] font-black text-amber-900">
                      BAR-xx • 1 seat
                    </span>
                  </button>

                  {/* RESTAURANT */}
                  <button
                    type="button"
                    onClick={() => handleVenueChange("restaurant")}
                    className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      formData.venue === "restaurant"
                        ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 shadow-2xs"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold">
                        <UtensilsCrossed size={14} />
                      </div>
                      {formData.venue === "restaurant" && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span className="mt-2 font-black text-xs text-slate-900 block">
                      Restaurant
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Main Dining Room
                    </span>
                    <span className="mt-1.5 inline-block rounded bg-blue-100/90 px-1 py-0.2 text-[8px] font-black text-blue-900">
                      T-xx • 4 seats
                    </span>
                  </button>
                </div>
              </div>

              {/* Bar Sub-type (if Bar is chosen) */}
              {formData.venue === "bar" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 flex items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
                  <span className="font-bold text-amber-950 text-[11px]">Bar Format:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          isBarSeat: true,
                          capacity: 1,
                          location: "Cocktail Bar Counter",
                          tableNumber: prev.tableNumber.startsWith("BAR-") ? prev.tableNumber : suggestNextTableNumber("bar", true),
                        }));
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        formData.isBarSeat
                          ? "bg-amber-500 text-slate-950 shadow-2xs"
                          : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      🍸 Stool (1p)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          isBarSeat: false,
                          capacity: 4,
                          location: "Bar Lounge",
                          tableNumber: prev.tableNumber.startsWith("B-") ? prev.tableNumber : suggestNextTableNumber("bar", false),
                        }));
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        !formData.isBarSeat
                          ? "bg-amber-500 text-slate-950 shadow-2xs"
                          : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      🛋️ Table (2-4p)
                    </button>
                  </div>
                </div>
              )}

              {/* VIP Toggle (Compact) */}
              <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-purple-600" />
                  <div>
                    <span className="text-xs font-bold text-purple-950 block leading-tight">
                      Mark as VIP / Private Booth
                    </span>
                    <span className="text-[10px] text-purple-700 block">
                      Prioritized with VIP badge on POS terminals
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVip}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        isVip: checked,
                        capacity: checked ? Math.max(6, prev.capacity) : prev.capacity,
                        location: checked ? `${prev.location} (VIP)` : prev.location.replace(" (VIP)", ""),
                      }));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Step 2: Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Table Number */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Table Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tableNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tableNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g. CF-01, BAR-01, T-01"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Seat Capacity */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Capacity (Seats) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        capacity: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {/* Preset chips */}
                  <div className="mt-1 flex items-center gap-1">
                    {[1, 2, 4, 6, 8].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, capacity: num }))}
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold transition ${
                          formData.capacity === num
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Floor Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="e.g. Main Hall, Patio"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
                >
                  Create {formData.venue === "cafe" ? "Cafe Table" : formData.venue === "bar" ? "Bar Seat" : "Restaurant Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TablesPage;