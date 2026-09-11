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
} from "lucide-react";
import api from "../../../services/api";

export default function OrgChartView({ onSelectEmployee }) {
  const [hierarchyData, setHierarchyData] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [selectedDept, setSelectedDept] = useState("all");

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

  // Recursive Tree Node Renderer
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
        {/* Node Card */}
        <div
          onClick={() => onSelectEmployee?.(node)}
          className={`group relative z-10 w-72 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
            isTopLeader
              ? "bg-gradient-to-br from-indigo-900 to-blue-900 text-white border-indigo-800 shadow-indigo-200/50"
              : isDivisionLeader
              ? "bg-gradient-to-br from-white to-blue-50/40 text-gray-900 border-blue-200 shadow-blue-100/50"
              : "bg-white text-gray-900 border-gray-200 hover:border-blue-300"
          } p-4`}
        >
          {/* Top meta */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isTopLeader
                  ? "bg-amber-400 text-indigo-950 border-amber-300"
                  : isDivisionLeader
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              {isTopLeader ? "Executive Lead" : node.department_name || node.department || "General"}
            </span>

            {node.outlet_name && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getOutletBadgeColor(
                  node.outlet_code || node.outlet_name
                )}`}
              >
                {node.outlet_name}
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${
                isTopLeader
                  ? "bg-white/10 text-white border border-white/20"
                  : isDivisionLeader
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {isTopLeader ? <Crown size={18} className="text-amber-300" /> : `${node.first_name?.[0] || ""}${node.last_name?.[0] || ""}`}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-bold truncate ${isTopLeader ? "text-white" : "text-gray-900"}`}>
                {node.first_name} {node.last_name}
              </h4>
              <p className={`text-xs truncate ${isTopLeader ? "text-blue-200" : "text-gray-500 font-medium"}`}>
                {node.position_title || node.role_name || node.role || "Staff Member"}
              </p>
            </div>
          </div>

          {/* Footer stats / Subordinates count */}
          <div
            className={`mt-3 pt-2.5 flex items-center justify-between text-xs border-t ${
              isTopLeader ? "border-white/15 text-blue-200" : "border-gray-100 text-gray-500"
            }`}
          >
            <span className="text-[11px] font-mono opacity-80">
              {node.employee_code || `#${node.id}`}
            </span>

            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(node.id);
                }}
                className={`flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-md transition ${
                  isTopLeader
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                }`}
              >
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <span>{node.children.length} Reports</span>
              </button>
            ) : (
              <span className="text-[10px] opacity-70">Direct Staff</span>
            )}
          </div>
        </div>

        {/* Children Connectors & Sub-tree */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center">
            {/* Vertical stem down from parent */}
            <div className="w-0.5 h-6 bg-blue-300"></div>

            {/* Horizontal branch line if multiple children */}
            {node.children.length > 1 && (
              <div className="relative w-full">
                <div className="h-0.5 bg-blue-200 mx-auto w-[calc(100%-144px)]"></div>
              </div>
            )}

            {/* Children container */}
            <div className="flex items-start justify-center gap-8 pt-2">
              {node.children.map((child) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Vertical connector down to child card */}
                  <div className="w-0.5 h-4 bg-blue-300"></div>
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
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-gray-500 bg-white rounded-2xl border border-gray-200 p-8">
        <RefreshCw size={24} className="animate-spin text-blue-600" />
        <p className="text-sm font-medium">Loading Hotel Organizational Hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 flex items-center justify-between">
        <div>
          <p className="font-semibold">Failed to load chart</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={loadHierarchy}
          className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Network size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Kasina Organizational Structure</h3>
            <p className="text-xs text-gray-500">
              Interactive reporting tree from Hotel Manager down to Outlets and Frontline Staff
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none font-medium text-gray-700"
          >
            <option value="all">All Departments</option>
            {departmentList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button
            onClick={loadHierarchy}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition"
            title="Refresh Hierarchy"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* TREE CANVAS */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-slate-50/50 p-8 shadow-inner min-h-[500px]">
        {rootNodes.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="font-medium text-sm">No organizational nodes match your filter.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-12 min-w-max pb-8">
            {rootNodes.map((root) => renderTreeNode(root, 0))}
          </div>
        )}
      </div>

      {/* UNASSIGNED REPORTING SECTION (If any staff have no reports_to yet) */}
      {unassignedNodes.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-3">
            <Sparkles size={16} />
            <span>Staff Pending Direct Supervisor Assignment ({unassignedNodes.length})</span>
          </div>
          <p className="text-xs text-amber-700 mb-4">
            These active team members are not yet connected to a supervisor in the organizational tree. Edit their employee profile to assign their reporting line.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {unassignedNodes.map((emp) => (
              <div
                key={emp.id}
                onClick={() => onSelectEmployee?.(emp)}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200/70 shadow-2xs hover:border-blue-400 cursor-pointer transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {emp.position_title || emp.role_name || emp.role || "Staff"}
                  </p>
                </div>
                {emp.outlet_name && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
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
