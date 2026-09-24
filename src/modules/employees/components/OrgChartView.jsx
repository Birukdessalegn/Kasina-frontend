import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Network,
  ChevronDown,
  ChevronRight,
  Building2,
  Store,
  Briefcase,
  Shield,
  UserCheck,
  Search,
  RefreshCw,
  Crown,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
} from "lucide-react";
import api from "../../../services/api";
import { printOrgChartArea } from "../../../utils/printHelper";

export default function OrgChartView({ onSelectEmployee }) {
  const [hierarchyData, setHierarchyData] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [selectedDept, setSelectedDept] = useState("all");
  const [zoomLevel, setZoomLevel] = useState(1);

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      setError(null);

      const [hierRes, empRes] = await Promise.all([
        api("/employees/hierarchy").catch(() => ({ hierarchy: [] })),
        api("/employees").catch(() => ({ employees: [] })),
      ]);

      const hierList = hierRes.hierarchy || hierRes.data || (Array.isArray(hierRes) ? hierRes : []);
      const empList = empRes.employees || empRes.data || (Array.isArray(empRes) ? empRes : []);

      setHierarchyData(hierList);
      setAllEmployees(empList);
    } catch (err) {
      console.error("Failed to load hierarchy:", err);
      setError("Failed to load organizational hierarchy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  const toggleCollapse = (nodeId) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Build tree from raw hierarchy or fallback to all employees
  const { rootNodes, unassignedNodes, departmentList } = useMemo(() => {
    const list = hierarchyData.length > 0 ? hierarchyData : allEmployees;
    const byId = {};
    const depts = new Set();

    list.forEach((emp) => {
      byId[emp.id] = {
        ...emp,
        children: [],
      };
      if (emp.department || emp.department_name) {
        depts.add(emp.department || emp.department_name);
      }
    });

    const roots = [];
    const unassigned = [];

    list.forEach((emp) => {
      const node = byId[emp.id];
      const supId = emp.reports_to_employee_id || emp.reportsToEmployeeId;

      if (supId && byId[supId] && byId[supId].id !== emp.id) {
        byId[supId].children.push(node);
      } else if (!supId) {
        // Roots: Check if top level manager
        const isManager =
          String(emp.role || emp.role_name).toLowerCase().includes("manager") ||
          String(emp.role || emp.role_name).toLowerCase().includes("admin") ||
          String(emp.position_title || "").toLowerCase().includes("manager");
        
        if (isManager || list.some((other) => (other.reports_to_employee_id || other.reportsToEmployeeId) === emp.id)) {
          roots.push(node);
        } else {
          // Leaf node with no manager set
          unassigned.push(node);
        }
      } else {
        unassigned.push(node);
      }
    });

    return {
      rootNodes: roots.length > 0 ? roots : list.map((e) => byId[e.id]),
      unassignedNodes: unassigned,
      departmentList: Array.from(depts),
    };
  }, [hierarchyData, allEmployees]);

  const expandAll = () => setCollapsedNodes({});

  const collapseAll = () => {
    const all = {};
    const markCollapsed = (nodes) => {
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          all[n.id] = true;
          markCollapsed(n.children);
        }
      });
    };
    markCollapsed(rootNodes);
    setCollapsedNodes(all);
  };

  const handlePrint = () => {
    printOrgChartArea("printable-org-chart", "Kasina Hotel - Organizational Hierarchy");
  };

  const matchesFilter = (emp) => {
    if (!emp) return false;
    const fullName = `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.toLowerCase();
    const pos = String(emp.position_title || "").toLowerCase();
    const dept = String(emp.department || emp.department_name || "").toLowerCase();
    const outlet = String(emp.outlet_name || emp.outlet_code || "").toLowerCase();
    const s = search.toLowerCase().trim();

    const matchesSearch = !s || fullName.includes(s) || pos.includes(s) || dept.includes(s) || outlet.includes(s);
    const matchesDept = selectedDept === "all" || dept === selectedDept.toLowerCase();

    return matchesSearch && matchesDept;
  };

  const getOutletBadgeColor = (code) => {
    const c = String(code || "").toUpperCase();
    if (c.includes("CAFE")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (c.includes("BAR")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (c.includes("RESTAURANT")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (c.includes("STORE")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (c.includes("RECEPTION")) return "bg-indigo-100 text-indigo-800 border-indigo-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Compact Recursive Tree Node Renderer
  const renderTreeNode = (node, depth = 0) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const matches = matchesFilter(node);
    const hasMatchingDescendant = (n) => {
      if (matchesFilter(n)) return true;
      return (n.children || []).some(hasMatchingDescendant);
    };

    if (search && !matches && !hasMatchingDescendant(node)) {
      return null;
    }

    const isTopLeader = depth === 0;
    const isDivisionLeader = depth === 1;

    return (
      <div key={node.id} className="relative flex flex-col items-center">
        {/* Compact Node Card */}
        <div
          onClick={() => onSelectEmployee?.(node)}
          className={`group relative z-10 w-52 rounded-xl border transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 print:shadow-none print:break-inside-avoid ${
            isTopLeader
              ? "bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-950 text-white border-indigo-700 shadow-indigo-200/40 print:bg-gray-900 print:text-white print:border-gray-800"
              : isDivisionLeader
              ? "bg-gradient-to-br from-white to-blue-50/50 text-gray-900 border-blue-200 shadow-blue-50/50 print:bg-white print:border-gray-400"
              : "bg-white text-gray-900 border-gray-200 hover:border-blue-400 print:bg-white print:border-gray-300"
          } p-2.5`}
        >
          {/* Top meta badges */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border truncate max-w-[110px] ${
                isTopLeader
                  ? "bg-amber-400 text-indigo-950 border-amber-300 font-extrabold print:bg-gray-200 print:text-gray-900"
                  : isDivisionLeader
                  ? "bg-blue-100 text-blue-800 border-blue-200 font-semibold print:bg-gray-100 print:text-gray-800"
                  : "bg-gray-100 text-gray-700 border-gray-200 print:bg-gray-50"
              }`}
            >
              {isTopLeader ? "Executive Lead" : node.department_name || node.department || "General"}
            </span>

            {node.outlet_name && (
              <span
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded border truncate max-w-[85px] ${getOutletBadgeColor(
                  node.outlet_code || node.outlet_name
                )} print:border-gray-300 print:bg-gray-100 print:text-gray-800`}
              >
                {node.outlet_name}
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs shadow-2xs ${
                isTopLeader
                  ? "bg-white/15 text-white border border-white/20 print:bg-gray-800 print:text-white"
                  : isDivisionLeader
                  ? "bg-blue-600 text-white print:bg-gray-700 print:text-white"
                  : "bg-gray-100 text-gray-700 print:bg-gray-200 print:text-gray-900"
              }`}
            >
              {isTopLeader ? <Crown size={14} className="text-amber-300 print:text-amber-400" /> : `${node.first_name?.[0] || ""}${node.last_name?.[0] || ""}`}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-bold truncate leading-tight ${isTopLeader ? "text-white" : "text-gray-900"}`}>
                {node.first_name} {node.last_name}
              </h4>
              <p className={`text-[10px] truncate leading-tight mt-0.5 ${isTopLeader ? "text-blue-200 print:text-gray-300" : "text-gray-500 font-medium"}`}>
                {node.position_title || node.role_name || node.role || "Staff Member"}
              </p>
            </div>
          </div>

          {/* Compact Footer stats / Subordinates count */}
          <div
            className={`mt-2 pt-1.5 flex items-center justify-between text-[10px] border-t ${
              isTopLeader ? "border-white/15 text-blue-200 print:border-gray-700 print:text-gray-300" : "border-gray-100 text-gray-400 print:border-gray-200 print:text-gray-600"
            }`}
          >
            <span className="font-mono text-[9px] opacity-75">
              {node.employee_code || `#${node.id}`}
            </span>

            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(node.id);
                }}
                className={`flex items-center gap-0.5 font-semibold text-[9px] px-1.5 py-0.5 rounded transition ${
                  isTopLeader
                    ? "bg-white/15 hover:bg-white/25 text-white print:bg-transparent print:text-gray-300"
                    : "bg-blue-50 hover:bg-blue-100 text-blue-700 print:bg-gray-100 print:text-gray-700"
                }`}
              >
                {isCollapsed ? <ChevronRight size={11} className="print:hidden" /> : <ChevronDown size={11} className="print:hidden" />}
                <span>{node.children.length} {node.children.length === 1 ? "Report" : "Reports"}</span>
              </button>
            ) : (
              <span className="text-[9px] opacity-60">Staff</span>
            )}
          </div>
        </div>

        {/* Children Connectors & Sub-tree */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center w-full">
            {/* Vertical stem down from parent */}
            <div className="w-0.5 h-3.5 bg-blue-300 print:bg-gray-500"></div>

            {/* Horizontal branch line if multiple children */}
            {node.children.length > 1 && (
              <div className="relative w-full">
                <div className="h-0.5 bg-blue-200 print:bg-gray-400 mx-auto w-[calc(100%-104px)]"></div>
              </div>
            )}

            {/* Children container with compact gap */}
            <div className="flex items-start justify-center gap-3.5 pt-1">
              {node.children.map((child) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Vertical connector down to child card */}
                  <div className="w-0.5 h-3 bg-blue-300 print:bg-gray-500"></div>
                  {renderTreeNode(child, depth + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2.5 text-gray-500 bg-white rounded-2xl border border-gray-200 p-6">
        <RefreshCw size={20} className="animate-spin text-blue-600" />
        <p className="text-xs font-medium">Loading Hotel Organizational Hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-center justify-between">
        <div>
          <p className="font-semibold text-xs">Failed to load chart</p>
          <p className="text-[11px]">{error}</p>
        </div>
        <button
          onClick={loadHierarchy}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 print:space-y-2 print:m-0 print:p-0">
      {/* SCOPED PRINT STYLES FOR LANDSCAPE HIGH-RES EXPORT */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .org-print-canvas {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            min-height: auto !important;
          }
        }
      `}</style>

      {/* TOOLBAR (Hidden when printing) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white p-3 sm:px-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Network size={16} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">Hotel Organizational Structure</h3>
            <p className="text-[11px] text-gray-500 leading-tight">
              Reporting hierarchy from General Manager down to Outlets and Frontline Staff
            </p>
          </div>
        </div>

        {/* Filter, Zoom & Print controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[150px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by name, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none font-medium text-gray-700"
          >
            <option value="all">All Departments</option>
            {departmentList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Quick Expand / Collapse */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-[11px] font-medium">
            <button
              onClick={expandAll}
              className="px-2 py-1 hover:bg-white hover:text-blue-600 transition"
              title="Expand all levels"
            >
              Expand All
            </button>
            <div className="w-px h-3.5 bg-gray-200"></div>
            <button
              onClick={collapseAll}
              className="px-2 py-1 hover:bg-white hover:text-blue-600 transition"
              title="Collapse all levels"
            >
              Collapse All
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-gray-600">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
              className="p-1 hover:bg-white hover:text-blue-600 transition"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-gray-500 min-w-[32px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.2, Number((z + 0.1).toFixed(1))))}
              className="p-1 hover:bg-white hover:text-blue-600 transition"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-white hover:text-blue-600 border-l border-gray-200 transition"
              title="Reset zoom to 100%"
            >
              <Maximize2 size={12} />
            </button>
          </div>

          <button
            onClick={loadHierarchy}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition"
            title="Refresh Hierarchy"
          >
            <RefreshCw size={13} />
          </button>

          {/* PRINT CHART BUTTON */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
            title="Print Org Chart / Export as PDF"
          >
            <Printer size={13} />
            <span>Print Chart</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE CONTAINER (Isolated by printOrgChartArea & print media query) */}
      <div id="printable-org-chart" className="w-full bg-white space-y-4 print:space-y-2">
        {/* FORMAL PRINT HEADER (Visible on print & PDF export) */}
        <div className="hidden print:block mb-4 border-b border-gray-400 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">KASINA HOTEL MANAGEMENT SYSTEM</h1>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mt-0.5">
                Official Organizational Hierarchy & Reporting Structure
              </p>
            </div>
            <div className="text-right text-[10px] text-gray-600 space-y-0.5">
              <p><span className="font-medium text-gray-500">Date:</span> {new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              <p><span className="font-medium text-gray-500">Department:</span> {selectedDept === "all" ? "All Departments" : selectedDept}</p>
              <p><span className="font-medium text-gray-500">Active Staff:</span> {allEmployees.length} Members</p>
            </div>
          </div>
        </div>

        {/* TREE CANVAS */}
        <div className="org-print-canvas w-full overflow-x-auto rounded-xl border border-gray-200 bg-slate-50/60 p-4 sm:p-6 shadow-inner min-h-[420px]">
          {rootNodes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={28} className="mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-xs">No organizational nodes match your filter.</p>
            </div>
          ) : (
            <div 
              className="flex flex-col items-center gap-8 min-w-max pb-6 transition-transform duration-150 origin-top print:gap-6 print:min-w-full"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {rootNodes.map((root) => renderTreeNode(root, 0))}
            </div>
          )}
        </div>

        {/* PRINT FOOTER (Visible only on print) */}
        <div className="hidden print:flex items-center justify-between pt-3 border-t border-gray-300 text-[9px] text-gray-500">
          <span>Kasina Hotel Operations Management System • Human Resources Division</span>
          <span>Confidential Organizational Chart • Generated for Internal Management</span>
        </div>
      </div>

      {/* UNASSIGNED REPORTING SECTION (Hidden on print to keep chart clean) */}
      {unassignedNodes.length > 0 && (
        <div className="print:hidden rounded-xl border border-amber-200 bg-amber-50/30 p-3.5">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs mb-1.5">
            <Sparkles size={14} />
            <span>Staff Pending Direct Supervisor Assignment ({unassignedNodes.length})</span>
          </div>
          <p className="text-[11px] text-amber-700 mb-2.5">
            These team members are not yet linked to a manager in the organizational tree. Edit their profile to assign their supervisor.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {unassignedNodes.map((emp) => (
              <div
                key={emp.id}
                onClick={() => onSelectEmployee?.(emp)}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200/80 shadow-2xs hover:border-blue-400 cursor-pointer transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {emp.position_title || emp.role_name || emp.role || "Staff"}
                  </p>
                </div>
                {emp.outlet_name && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 shrink-0 ml-1">
                    {emp.outlet_name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
