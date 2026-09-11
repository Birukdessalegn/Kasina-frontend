import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  X,
  CheckCircle,
  XCircle,
  CalendarDays,
  Phone,
  Briefcase,
  Clock3,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  KeyRound,
  User,
  Building2,
  Eye,
  EyeOff,
  Network,
  Store,
  GitFork,
  Crown,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import OrgChartView from "../components/OrgChartView";

// =====================================================
// CONSTANTS
// =====================================================

const roles = [
  { id: 1, name: "admin", label: "Admin" },
  { id: 2, name: "manager", label: "Manager" },
  { id: 3, name: "hotel_manager", label: "Hotel Manager" },
  { id: 4, name: "accountant_manager", label: "Accountant Manager" },
  { id: 5, name: "cooperative_manager", label: "Cooperative Manager" },
  { id: 6, name: "kitchen_manager", label: "Kitchen Manager" },
  { id: 7, name: "hr", label: "HR" },
  { id: 8, name: "finance", label: "Finance" },
  { id: 9, name: "store_manager", label: "Store Manager" },
  { id: 10, name: "purchasing_manager", label: "Purchasing Manager" },
  { id: 11, name: "cafe_supervisor", label: "Cafe Supervisor" },
  { id: 12, name: "bar_restaurant_supervisor", label: "Bar & Restaurant Supervisor" },
  { id: 13, name: "cafe_chef", label: "Cafe Chef" },
  { id: 14, name: "barista", label: "Barista" },
  { id: 15, name: "cafe_waiter", label: "Cafe Waiter" },
  { id: 16, name: "cashier", label: "Cashier" },
  { id: 17, name: "waiter", label: "Waiter" },
  { id: 18, name: "chef", label: "Chef" },
  { id: 19, name: "bartender", label: "Bartender" },
  { id: 20, name: "fb_controller", label: "F&B Controller / Kitchen Auditor" },
  { id: 21, name: "receptionist", label: "Receptionist / Front Desk" },
];

const departments = [
  { id: 1, name: "Management" },
  { id: 2, name: "Human Resources" },
  { id: 3, name: "Service" },
  { id: 4, name: "Kitchen" },
  { id: 5, name: "Bar" },
  { id: 6, name: "Finance" },
  { id: 7, name: "Administration" },
  { id: 8, name: "Food & Beverage" },
  { id: 9, name: "Front Desk" },
  { id: 10, name: "Cooperative Services" },
  { id: 11, name: "Central Store" },
  { id: 12, name: "Purchasing" },
  { id: 13, name: "Housekeeping" },
];

const statusStyles = {
  active: "bg-green-100 text-green-700",
  Active: "bg-green-100 text-green-700",

  "on leave": "bg-yellow-100 text-yellow-700",
  "On Leave": "bg-yellow-100 text-yellow-700",

  absent: "bg-red-100 text-red-700",
  Absent: "bg-red-100 text-red-700",

  inactive: "bg-gray-100 text-gray-600",
  Inactive: "bg-gray-100 text-gray-600",
};

const emptyForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  roleId: "",
  departmentId: "",
  positionId: "",
  outletId: "",
  reportsToEmployeeId: "",
  shiftStartTime: "18:00",
  shiftEndTime: "07:00",
  hireDate: "",
  salary: "",
  status: "active",
  attendance: "Present",
};

// =====================================================
// DATE & TIME HELPERS
// =====================================================

function formatDate(date) {
  if (!date) return "-";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return timeStr;
  const minutes = parts[1] || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minutes}${ampm}`;
}

function parseShiftStringToTimes(shiftStr) {
  if (!shiftStr) return { startTime: "18:00", endTime: "07:00" };

  const parseSingleTime = (str) => {
    if (!str) return null;
    const clean = str.trim().toUpperCase();

    const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = match12[2];
      const period = match12[3];
      if (period === "PM" && h < 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${m}`;
    }

    const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const h = String(parseInt(match24[1], 10)).padStart(2, "0");
      const m = match24[2];
      return `${h}:${m}`;
    }
    return null;
  };

  const parts = shiftStr.split(/[-–—to]/i);
  if (parts.length >= 2) {
    const start = parseSingleTime(parts[0]);
    const end = parseSingleTime(parts[1]);
    if (start && end) {
      return { startTime: start, endTime: end };
    }
  }

  return { startTime: "18:00", endTime: "07:00" };
}

function getEmployeeUsername(employee) {
  if (!employee) return "-";
  const emailVal = employee.email || employee.user_email || employee.userEmail || "";
  const firstVal = employee.first_name || employee.firstName || "";
  const lastVal = employee.last_name || employee.lastName || "";
  const fallbackFromEmail = emailVal ? emailVal.split("@")[0] : null;
  const fallbackFromName = firstVal ? `${firstVal}${lastVal}`.toLowerCase().replace(/\s+/g, "") : null;

  const un =
    employee.username ||
    employee.user_username ||
    employee.user_name ||
    employee.userName ||
    employee.user?.username ||
    employee.user?.user_name ||
    employee.User?.username ||
    employee.User?.user_name ||
    employee.account_username ||
    fallbackFromEmail ||
    fallbackFromName;

  return un && String(un).trim() !== "" ? String(un).trim() : "-";
}

// =====================================================
// MAIN COMPONENT
// =====================================================

function EmployeesPage() {
  const [employeeList, setEmployeeList] = useState([]);
  const [outletsList, setOutletsList] = useState([]);
  const [positionsList, setPositionsList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [activeTab, setActiveTab] = useState("directory"); // "directory" | "hierarchy"

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });

  const showToast = (type, message) => {
    setToast({
      show: true,
      type,
      message,
    });

    setTimeout(() => {
      setToast({ show: false, type: "", message: "" });
    }, 3000);
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const [empRes, outRes, posRes, roleRes, deptRes] = await Promise.all([
        api("/employees").catch(() => ({ employees: [] })),
        api("/employees/outlets").catch(() => ({ outlets: [] })),
        api("/employees/positions").catch(() => ({ positions: [] })),
        api("/employees/roles").catch(() => ({ roles: [] })),
        api("/employees/departments").catch(() => ({ departments: [] })),
      ]);

      if (outRes?.outlets) setOutletsList(outRes.outlets);
      if (posRes?.positions) setPositionsList(posRes.positions);
      if (roleRes?.roles) setRolesList(roleRes.roles);
      if (deptRes?.departments) setDepartmentsList(deptRes.departments);

      const list =
        (Array.isArray(empRes) ? empRes : null) ||
        (Array.isArray(empRes?.employees) ? empRes.employees : null) ||
        (Array.isArray(empRes?.data?.employees) ? empRes.data.employees : null) ||
        (Array.isArray(empRes?.data) ? empRes.data : null) ||
        [];

      const enriched = list.map((emp) => {
        const uName =
          emp.username ||
          emp.user_username ||
          emp.user_name ||
          emp.userName ||
          emp.user?.username ||
          (emp.email ? emp.email.split("@")[0] : null) ||
          (emp.first_name || emp.firstName
            ? `${emp.first_name || emp.firstName}${emp.last_name || emp.lastName || ""}`.toLowerCase().replace(/\s+/g, "")
            : null);

        return {
          ...emp,
          username: uName,
        };
      });

      setEmployeeList(enriched);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    return (Array.isArray(employeeList) ? employeeList : []).filter((emp) => {
      if (!search.trim()) return true;
      const searchLower = search.toLowerCase();
      const firstName = emp.first_name || emp.firstName || "";
      const lastName = emp.last_name || emp.lastName || "";
      const fullName = emp.name || `${firstName} ${lastName}`.trim();
      const code = emp.employee_code || emp.employeeCode || emp.code || "";
      const pos = emp.position_title || "";
      const outlet = emp.outlet_name || emp.outlet_code || "";
      const username = getEmployeeUsername(emp);

      return (
        firstName.toLowerCase().includes(searchLower) ||
        lastName.toLowerCase().includes(searchLower) ||
        fullName.toLowerCase().includes(searchLower) ||
        code.toLowerCase().includes(searchLower) ||
        pos.toLowerCase().includes(searchLower) ||
        outlet.toLowerCase().includes(searchLower) ||
        username.toLowerCase().includes(searchLower)
      );
    });
  }, [employeeList, search]);

  const safeEmployees = Array.isArray(employeeList) ? employeeList : [];
  const totalEmployees = safeEmployees.length;

  const activeToday = safeEmployees.filter(
    (employee) =>
      employee.attendance === "Present" &&
      String(employee.status).toLowerCase() === "active"
  ).length;

  const onLeave = safeEmployees.filter(
    (employee) =>
      String(employee.status).toLowerCase() === "on leave" ||
      employee.attendance === "On Leave"
  ).length;

  const absentToday = safeEmployees.filter(
    (employee) => employee.attendance === "Absent"
  ).length;

  const openCreateForm = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setError("");
    setShowPassword(false);
    setShowForm(true);
  };

  const openEditForm = (employee) => {
    setEditingEmployee(employee);

    const parsedShift = parseShiftStringToTimes(employee.shift);
    const un = getEmployeeUsername(employee);

    const currentRoles = rolesList.length > 0 ? rolesList : roles;
    const currentDepts = departmentsList.length > 0 ? departmentsList : departments;

    const empRoleName = String(employee.role?.name || employee.role_name || employee.role || "").toLowerCase().trim();
    const matchedRole = currentRoles.find((r) => r.name.toLowerCase() === empRoleName) ||
                        currentRoles.find((r) => String(r.id) === String(employee.role_id || employee.roleId));

    const empDeptName = String(employee.department?.name || employee.department_name || employee.department || "").toLowerCase().trim();
    const matchedDept = currentDepts.find((d) => d.name.toLowerCase() === empDeptName) ||
                        currentDepts.find((d) => String(d.id) === String(employee.department_id || employee.departmentId));

    const rawHireDate = employee.hire_date || employee.hireDate || "";
    const formattedHireDate = rawHireDate ? String(rawHireDate).split("T")[0] : "";

    setForm({
      employeeCode: employee.employee_code || employee.employeeCode || employee.code || "",
      firstName: employee.first_name || employee.firstName || "",
      lastName: employee.last_name || employee.lastName || "",
      username: un === "-" ? "" : un,
      password: "",
      email: employee.user_email || employee.email || "",
      phone: employee.phone || "",
      roleId: matchedRole ? String(matchedRole.id) : (employee.role_id || employee.roleId ? String(employee.role_id || employee.roleId) : ""),
      departmentId: matchedDept ? String(matchedDept.id) : (employee.department_id || employee.departmentId ? String(employee.department_id || employee.departmentId) : ""),
      positionId: employee.position_id || employee.positionId ? String(employee.position_id || employee.positionId) : "",
      outletId: employee.outlet_id || employee.outletId ? String(employee.outlet_id || employee.outletId) : "",
      reportsToEmployeeId: employee.reports_to_employee_id || employee.reportsToEmployeeId ? String(employee.reports_to_employee_id || employee.reportsToEmployeeId) : "",
      shiftStartTime: parsedShift.startTime,
      shiftEndTime: parsedShift.endTime,
      hireDate: formattedHireDate,
      salary: employee.salary !== null && employee.salary !== undefined ? String(employee.salary) : "",
      status: employee.status || "active",
      attendance: employee.attendance || "Present",
    });

    setError("");
    setShowPassword(false);
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      // Auto-suggest default role and department if user selects a position
      if (name === "positionId" && value) {
        const foundPos = positionsList.find((p) => String(p.id) === String(value));
        if (foundPos) {
          if (foundPos.default_role_id) {
            updated.roleId = String(foundPos.default_role_id);
          }
          if (foundPos.department_id) {
            updated.departmentId = String(foundPos.department_id);
          }
        }
      }

      return updated;
    });
  };

  const handleSaveEmployee = async (e) => {
    e?.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!form.employeeCode.trim()) {
        setError("Employee ID is required.");
        return;
      }

      if (!form.firstName.trim()) {
        setError("First name is required.");
        return;
      }

      if (!form.lastName.trim()) {
        setError("Last name is required.");
        return;
      }

      if (!form.roleId) {
        setError("Please select a role.");
        return;
      }

      if (!form.departmentId) {
        setError("Please select a department.");
        return;
      }

      if (!editingEmployee && !form.username.trim()) {
        setError("Username is required.");
        return;
      }

      if (!editingEmployee && !form.password.trim()) {
        setError("Password is required.");
        return;
      }

      const currentRoles = rolesList.length > 0 ? rolesList : roles;
      const currentDepts = departmentsList.length > 0 ? departmentsList : departments;

      const selectedRole = currentRoles.find((r) => String(r.id) === String(form.roleId));
      const selectedDept = currentDepts.find((d) => String(d.id) === String(form.departmentId));

      const payload = {
        employeeCode: form.employeeCode.trim(),
        employee_code: form.employeeCode.trim(),

        firstName: form.firstName.trim(),
        first_name: form.firstName.trim(),

        lastName: form.lastName.trim(),
        last_name: form.lastName.trim(),

        username: form.username.trim() || null,

        // Only send password if user provided a new one
        ...(form.password && form.password.trim() ? { password: form.password.trim() } : {}),

        email: form.email.trim() || null,
        phone: form.phone.trim() || null,

        roleId: Number(form.roleId),
        role_id: Number(form.roleId),
        role: selectedRole?.name || null,
        roleName: selectedRole?.name || null,

        departmentId: Number(form.departmentId),
        department_id: Number(form.departmentId),
        department: selectedDept?.name || null,
        departmentName: selectedDept?.name || null,

        positionId: form.positionId ? Number(form.positionId) : null,
        position_id: form.positionId ? Number(form.positionId) : null,

        outletId: form.outletId ? Number(form.outletId) : null,
        outlet_id: form.outletId ? Number(form.outletId) : null,

        reportsToEmployeeId: form.reportsToEmployeeId ? Number(form.reportsToEmployeeId) : null,
        reports_to_employee_id: form.reportsToEmployeeId ? Number(form.reportsToEmployeeId) : null,

        shift: form.shiftStartTime && form.shiftEndTime
          ? `${formatTimeTo12Hour(form.shiftStartTime)} - ${formatTimeTo12Hour(form.shiftEndTime)}`
          : "6:00PM - 7:00AM",

        hireDate: form.hireDate || null,
        hire_date: form.hireDate || null,

        salary: form.salary ? Number(form.salary) : 0,

        status: form.status,
      };

      console.log("Employee payload:", payload);

      if (!editingEmployee) {
        await api("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/employees/${editingEmployee.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      await fetchEmployees();

      setShowForm(false);

      showToast(
        "success",
        editingEmployee
          ? "Employee updated successfully."
          : "Employee created successfully."
      );

      setEditingEmployee(null);
      setForm(emptyForm);
    } catch (error) {
      console.error("Failed to save employee:", error);

      const errorMessage = error.message || "Failed to save employee";

      if (errorMessage.toLowerCase().includes("username already exists")) {
        showToast("error", "Username already registered.");
      } else if (errorMessage.toLowerCase().includes("email already exists")) {
        showToast("error", "Email already registered.");
      } else {
        showToast("error", errorMessage);
      }

      setError("");
    } finally {
      setSaving(false);
    }
  };

  
  const handleDeleteLoginAccount = async (employee) => {
    const employeeName =
      employee.name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to remove the login account for ${employeeName}?\n\nThis will permanently delete their username/password login credentials, while preserving all of their sales, payments, attendance, and work history.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await api(`/employees/${employee.id}/login-account`, {
        method: "DELETE",
      });

      setEmployeeList((previous) =>
        previous.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                user_id: null,
                username: null,
              }
            : item
        )
      );

      if (selectedEmployee?.id === employee.id) {
        setSelectedEmployee((prev) => ({
          ...prev,
          user_id: null,
          username: null,
        }));
      }

      showToast(
        "success",
        `Login account removed for ${employeeName}. Work history preserved.`
      );
    } catch (error) {
      console.error("Failed to remove login account:", error);
      showToast(
        "error",
        error.message || "Failed to remove login account"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    const employeeName =
      employee.name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${employeeName}?`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await api(`/employees/${employee.id}`, {
        method: "DELETE",
      });

      setEmployeeList((previous) =>
        previous.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                status: "inactive",
                attendance: "Absent",
              }
            : item
        )
      );

      setSelectedEmployee(null);

      showToast(
        "success",
        `${employeeName} has been deactivated.`
      );
    } catch (error) {
      console.error(
        "Failed to deactivate employee:",
        error
      );

      showToast(
        "error",
        error.message ||
          "Failed to deactivate employee"
      );

      setError("");
    } finally {
      setDeleting(false);
    }
  };

  const handleActivateEmployee = async (employee) => {
    const employeeName =
      employee.name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to activate ${employeeName}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setDeleting(true);

      await api(`/employees/${employee.id}/activate`, {
        method: "PUT",
      });

      setEmployeeList((previous) =>
        previous.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                status: "active",
                attendance: "Present",
                user_status: "active",
              }
            : item
        )
      );

      setSelectedEmployee((previous) =>
        previous?.id === employee.id
          ? {
              ...previous,
              status: "active",
              attendance: "Present",
              user_status: "active",
            }
          : previous
      );

      showToast(
        "success",
        `${employeeName} has been activated.`
      );
    } catch (error) {
      console.error(
        "Failed to activate employee:",
        error
      );

      showToast(
        "error",
        error.message ||
          "Failed to activate employee"
      );

      setError("");
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setSelectedEmployee(null);
    setShowRejectBox(false);
    setRejectReason("");
  };

  const getEmployeeName = (employee) => {
    if (!employee) return "Unnamed Employee";
    if (employee.name) {
      return employee.name;
    }

    const firstName = employee.first_name || employee.firstName || "";
    const lastName = employee.last_name || employee.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || "Unnamed Employee";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <div className="flex items-center gap-2">
          <Loader2
            size={20}
            className="animate-spin"
          />
          Loading employees...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* SUCCESS / ERROR POPUP */}
      {toast.show && (
        <div className="fixed right-5 top-5 z-[200]">
          <div
            className={`flex min-w-[320px] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle
                size={20}
                className="shrink-0"
              />
            ) : (
              <XCircle
                size={20}
                className="shrink-0"
              />
            )}

            <div className="flex-1">
              <p className="text-sm font-semibold">
                {toast.type === "success"
                  ? "Success"
                  : "Error"}
              </p>

              <p className="text-sm">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() =>
                setToast({
                  show: false,
                  type: "",
                  message: "",
                })
              }
              className="rounded-md p-1 opacity-60 hover:bg-black/5 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Employees & Organization
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage hotel staff, workstation outlets, and organizational reporting hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl bg-gray-100 p-1 border border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "directory"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users size={14} />
              <span>Directory</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("hierarchy")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "hierarchy"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Network size={14} />
              <span>Org Chart</span>
            </button>
          </div>

          <button
            onClick={openCreateForm}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Employee
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-700"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      {activeTab === "hierarchy" ? (
        <OrgChartView
          onSelectEmployee={(emp) => {
            const full = employeeList.find((e) => e.id === emp.id) || emp;
            setSelectedEmployee(full);
          }}
        />
      ) : (
        <>
          {/* STATISTICS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Employees"
              value={totalEmployees}
              description="Employees under management"
              icon={Users}
            />

            <StatCard
              title="Active Today"
              value={activeToday}
              description="Currently active"
              icon={UserCheck}
            />

            <StatCard
              title="On Leave"
              value={onLeave}
              description="Employees on leave"
              icon={Clock}
            />

            <StatCard
              title="Absent Today"
              value={absentToday}
              description="Not on duty"
              icon={UserX}
            />
          </div>

          {/* EMPLOYEE TABLE */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* TABLE HEADER */}
            <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Employee List
                </h2>
                <p className="text-sm text-gray-500">
                  Click an employee to view details or assign reporting hierarchy.
                </p>
              </div>

              {/* SEARCH */}
              <div className="relative w-full lg:w-80">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search name, position, outlet..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
                />
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                      Employee
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                      Position & Role
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                      Department & Outlet
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                      Reports To
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                      Status & Shift
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((employee) => {
                    const employeeName = getEmployeeName(employee);
                    const initials = employeeName
                      .split(" ")
                      .filter(Boolean)
                      .map((name) => name[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const positionTitle = employee.position_title || employee.positionTitle;
                    const outletName = employee.outlet_name || employee.outletName;
                    const reportsToName = employee.reports_to_name || employee.reportsToName;

                    return (
                      <tr
                        key={employee.id}
                        onClick={() => setSelectedEmployee(employee)}
                        className="cursor-pointer transition hover:bg-gray-50"
                      >
                        {/* EMPLOYEE */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700 border border-blue-100">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {employeeName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {employee.employee_code ||
                                  employee.employeeCode ||
                                  employee.code ||
                                  `EMP-${String(employee.id).padStart(3, "0")}`}
                                {employee.username && ` • @${employee.username}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* POSITION & ROLE */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {positionTitle || "-"}
                            </p>
                            <span className="inline-block mt-0.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium capitalize text-blue-700">
                              {(() => {
                                const r =
                                  employee.role?.name ||
                                  employee.role_name ||
                                  employee.roleName ||
                                  (typeof employee.role === "string" ? employee.role : null) ||
                                  "-";
                                return r.toLowerCase() === "fb_controller" ? "F&B Controller" : r;
                              })()}
                            </span>
                          </div>
                        </td>

                        {/* DEPARTMENT & OUTLET */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm text-gray-800 font-medium">
                              {employee.department?.name ||
                                employee.department_name ||
                                employee.departmentName ||
                                (typeof employee.department === "string"
                                  ? employee.department
                                  : null) ||
                                "-"}
                            </p>
                            {outletName ? (
                              <span className="inline-block mt-0.5 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                                📍 {outletName}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Hotel-wide</span>
                            )}
                          </div>
                        </td>

                        {/* REPORTS TO */}
                        <td className="px-5 py-4 text-sm">
                          {reportsToName ? (
                            <span className="font-medium text-gray-800">
                              👤 {reportsToName}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              👑 Executive / Root
                            </span>
                          )}
                        </td>

                        {/* STATUS & SHIFT */}
                        <td className="px-5 py-4">
                          <div>
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                statusStyles[employee.status] ||
                                "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {employee.status || "-"}
                            </span>
                            <p className="text-[11px] text-gray-500 mt-1">
                              {employee.shift || "6:00PM - 7:00AM"}
                            </p>
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td
                          className="px-5 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-2">
                            {/* Remove Login Account Only (preserves sales/work history) */}
                            {employee.user_id && (
                              <button
                                onClick={() => handleDeleteLoginAccount(employee)}
                                disabled={deleting}
                                className="rounded-lg p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                                title="Remove Login Account (Keeps History)"
                              >
                                <KeyRound size={17} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditForm(employee)}
                              className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit employee"
                            >
                              <Pencil size={17} />
                            </button>

                            {String(employee.status).toLowerCase() === "inactive" ? (
                              <button
                                onClick={() => handleActivateEmployee(employee)}
                                disabled={deleting}
                                className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                                title="Activate employee"
                              >
                                <UserCheck size={17} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteEmployee(employee)}
                                disabled={deleting}
                                className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                title="Deactivate employee"
                              >
                                <Trash2 size={17} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-5 py-12 text-center text-sm text-gray-500"
                      >
                        {search
                          ? "No employees found matching your search."
                          : "No employees have been added yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TODAY'S STAFF */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Today&apos;s Staff
              </h2>
              <p className="text-sm text-gray-500">
                Staff members currently on active shift.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {employeeList
                .filter(
                  (employee) =>
                    String(employee.status).toLowerCase() === "active"
                )
                .map((employee) => {
                  const employeeName = getEmployeeName(employee);
                  const initials = employeeName
                    .split(" ")
                    .filter(Boolean)
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {employeeName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.position_title || employee.role || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-700">
                          {employee.shift || "-"}
                        </p>
                        <p className="mt-1 text-xs text-green-600">
                          Active
                        </p>
                      </div>
                    </div>
                  );
                })}

              {employeeList.filter(
                (employee) =>
                  String(employee.status).toLowerCase() === "active"
              ).length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-gray-400">
                  No active employees today.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =================================================
          CREATE / EDIT MODAL
      ================================================= */}
      {showForm && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/50 p-3 sm:p-6 backdrop-blur-sm flex justify-center items-start sm:items-center">
          <div className="relative w-full max-w-3xl my-4 sm:my-auto max-h-[86vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="shrink-0 flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEmployee
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingEmployee
                    ? "Update employee information."
                    : "Create an employee and their login account."}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSaveEmployee}
              className="flex-1 space-y-6 overflow-y-auto p-6"
            >
              {/* PERSONAL INFORMATION */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <User
                    size={18}
                    className="text-blue-600"
                  />
                  <h3 className="font-semibold text-gray-900">
                    Personal Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Employee Code"
                    name="employeeCode"
                    value={form.employeeCode}
                    onChange={handleFormChange}
                    placeholder="e.g. EMP-001"
                    required
                  />

                  <FormInput
                    label="First Name"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleFormChange}
                    placeholder="e.g. Brook"
                    required
                  />

                  <FormInput
                    label="Last Name"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleFormChange}
                    placeholder="e.g. Hailu"
                    required
                  />

                  <FormInput
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="brook@kasina.com"
                  />

                  <FormInput
                    label="Phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="+251 91 123 4567"
                  />

                  <FormInput
                    label="Hire Date"
                    name="hireDate"
                    type="date"
                    value={form.hireDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {/* LOGIN CREDENTIALS */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound
                    size={18}
                    className="text-blue-600"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Login Credentials
                    </h3>
                    <p className="text-xs text-gray-500">
                      These credentials will be stored in the users table.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleFormChange}
                    placeholder="e.g. brook"
                    required={!editingEmployee}
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Password{" "}
                      {!editingEmployee && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleFormChange}
                        placeholder={
                          editingEmployee
                            ? "Leave blank to keep current password"
                            : "Enter password"
                        }
                        className="w-full rounded-lg border border-gray-200 pl-3 pr-10 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {editingEmployee && (
                      <p className="mt-1 text-xs text-gray-400">
                        Only enter a password if you want to change it.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* JOB INFORMATION */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Briefcase
                    size={18}
                    className="text-blue-600"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Job Information & Organizational Placement
                    </h3>
                    <p className="text-xs text-gray-500">
                      Assign official position, workstation outlet, and direct reporting supervisor.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Position */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Position / Title
                    </label>
                    <select
                      name="positionId"
                      value={form.positionId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option value="">Select official position (optional)</option>
                      {positionsList.map((pos) => (
                        <option key={pos.id} value={pos.id}>
                          {pos.title} {pos.department_name ? `(${pos.department_name})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assigned Outlet */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Assigned Workstation / Outlet
                    </label>
                    <select
                      name="outletId"
                      value={form.outletId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option value="">General Hotel / Not Station-Specific</option>
                      {outletsList.map((out) => (
                        <option key={out.id} value={out.id}>
                          {out.name} ({out.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reports To / Supervisor */}
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Reports To (Direct Supervisor in Hierarchy)
                    </label>
                    <select
                      name="reportsToEmployeeId"
                      value={form.reportsToEmployeeId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option value="">None (Top Executive / General Management)</option>
                      {employeeList
                        .filter((e) => !editingEmployee || e.id !== editingEmployee.id)
                        .map((mgr) => {
                          const mName = getEmployeeName(mgr);
                          const mPos = mgr.position_title || mgr.role_name || mgr.role || "";
                          return (
                            <option key={mgr.id} value={mgr.id}>
                              {mName} {mPos ? `— ${mPos}` : ""}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      System Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="roleId"
                      value={form.roleId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option value="">Select role</option>
                      {(rolesList.length > 0 ? rolesList : roles).map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label || (role.name.charAt(0).toUpperCase() + role.name.slice(1))}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option value="">Select department</option>
                      {(departmentsList.length > 0 ? departmentsList : departments).map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SHIFT TIME INTERVAL SELECTOR */}
                  <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4 mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 uppercase tracking-wider">
                        <Clock size={15} className="text-blue-600" />
                        Shift Working Hours (Time Interval)
                      </label>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                        {formatTimeTo12Hour(form.shiftStartTime)} - {formatTimeTo12Hour(form.shiftEndTime)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Shift Start Time
                        </label>
                        <input
                          type="time"
                          name="shiftStartTime"
                          value={form.shiftStartTime}
                          onChange={handleFormChange}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Shift End Time
                        </label>
                        <input
                          type="time"
                          name="shiftEndTime"
                          value={form.shiftEndTime}
                          onChange={handleFormChange}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>

                    {/* Quick Shift Preset Options */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200/60 pt-2.5">
                      <span className="text-[11px] font-semibold text-gray-500">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, shiftStartTime: "18:00", shiftEndTime: "07:00" }))}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                          form.shiftStartTime === "18:00" && form.shiftEndTime === "07:00"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        🌙 Night (6:00PM - 7:00AM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, shiftStartTime: "07:00", shiftEndTime: "18:00" }))}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                          form.shiftStartTime === "07:00" && form.shiftEndTime === "18:00"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        ☀️ Day (7:00AM - 6:00PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, shiftStartTime: "16:00", shiftEndTime: "01:00" }))}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                          form.shiftStartTime === "16:00" && form.shiftEndTime === "01:00"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        🌇 Evening (4:00PM - 1:00AM)
                      </button>
                    </div>
                  </div>

                  <FormInput
                    label="Salary"
                    name="salary"
                    type="number"
                    value={form.salary}
                    onChange={handleFormChange}
                    placeholder="10000"
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editingEmployee
                    ? "Update Employee"
                    : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          EMPLOYEE DETAILS MODAL
      ================================================= */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 p-3 sm:p-6 backdrop-blur-sm flex justify-center items-start sm:items-center"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-2xl my-4 sm:my-auto max-h-[86vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="shrink-0 flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Employee Details
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Employee information and account details.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* PROFILE */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-700">
                    {getEmployeeName(selectedEmployee)
                      .split(" ")
                      .filter(Boolean)
                      .map((name) => name[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {getEmployeeName(selectedEmployee)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedEmployee.employee_code || "-"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm capitalize text-gray-600">
                        {String(selectedEmployee.role || "").toLowerCase() === "fb_controller"
                          ? "F&B Controller"
                          : selectedEmployee.role || "-"}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">
                        {selectedEmployee.department || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openEditForm(selectedEmployee)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              </div>

              {/* LOGIN */}
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Login Account
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoBox
                    icon={User}
                    label="Username"
                    value={getEmployeeUsername(selectedEmployee)}
                  />
                  <InfoBox
                    icon={KeyRound}
                    label="Account Status"
                    value={
                      selectedEmployee.user_status || selectedEmployee.status
                    }
                  />
                </div>
              </div>

              {/* EMPLOYEE INFORMATION */}
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Organizational & Workstation Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoBox
                    icon={Briefcase}
                    label="Position / Title"
                    value={selectedEmployee.position_title || selectedEmployee.role || "-"}
                  />
                  <InfoBox
                    icon={Store}
                    label="Assigned Outlet"
                    value={selectedEmployee.outlet_name || "General Hotel"}
                  />
                  <InfoBox
                    icon={Crown}
                    label="Reports To (Supervisor)"
                    value={selectedEmployee.reports_to_name || "Executive Lead / Root"}
                  />
                  <InfoBox
                    icon={Building2}
                    label="Department"
                    value={selectedEmployee.department_name || selectedEmployee.department || "-"}
                  />
                  <InfoBox
                    icon={Phone}
                    label="Phone"
                    value={selectedEmployee.phone}
                  />
                  <InfoBox
                    icon={Clock3}
                    label="Shift"
                    value={selectedEmployee.shift}
                  />
                  <InfoBox
                    icon={UserCheck}
                    label="Status"
                    value={selectedEmployee.status}
                  />
                  <InfoBox
                    icon={CalendarDays}
                    label="Hire Date"
                    value={formatDate(selectedEmployee.hire_date)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// FORM INPUT
// =====================================================

function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}{" "}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      />
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{value}</h2>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>
        <div className="rounded-lg bg-gray-100 p-3">
          <Icon size={22} className="text-gray-700" />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// INFO BOX
// =====================================================

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-gray-500" />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-gray-900">
        {value || "-"}
      </p>
    </div>
  );
}

export default EmployeesPage;