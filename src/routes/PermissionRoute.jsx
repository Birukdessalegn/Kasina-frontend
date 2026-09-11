import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RoleRedirect from "./RoleRedirect";

const rolePermissions = {
  ADMIN: ["*"],
  HOTEL_MANAGER: ["*"],

  MANAGER: [
    "dashboard",
    "frontdesk",
    "rooms",
    "reservations",
    "pos",
    "kitchen",
    "kitchen_audit",
    "bar",
    "products",
    "inventory",
    "customers",
    "purchasing",
    "expenses",
    "reports",
    "finance",
    "employees",
  ],

  COOPERATIVE_MANAGER: [
    "dashboard",
    "frontdesk",
    "rooms",
    "reservations",
    "pos",
    "orders",
    "bar",
    "kitchen",
    "customers",
    "finance",
    "reports",
  ],

  ACCOUNTANT_MANAGER: [
    "finance",
    "expenses",
    "reports",
    "payments",
    "inventory",
    "purchasing",
    "products",
    "employees",
  ],

  KITCHEN_MANAGER: ["kitchen", "kitchen_audit", "inventory", "products"],
  FNB_MANAGER: ["kitchen", "kitchen_audit", "inventory", "products", "reports"],
  FB_CONTROLLER: ["kitchen", "kitchen_audit", "inventory", "reports"],

  CAFE_SUPERVISOR: ["pos", "orders", "kitchen", "finance"],
  BAR_RESTAURANT_SUPERVISOR: ["pos", "orders", "bar", "kitchen", "finance"],

  STORE_MANAGER: ["inventory", "products"],
  STOREKEEPER: ["inventory", "products"],

  PURCHASING_MANAGER: ["purchasing", "inventory", "products"],
  PURCHASING: ["purchasing", "inventory"],

  HR_MANAGER: ["employees"],
  HR: ["employees"],

  HOUSEKEEPING_MANAGER: ["frontdesk", "rooms", "reservations"],
  HOUSEKEEPER: ["frontdesk", "rooms"],
  CLEANER: ["frontdesk", "rooms"],
  RECEPTIONIST: ["frontdesk", "rooms", "reservations", "customers", "attendance"],

  WAITER: ["pos", "orders"],
  CAFE_WAITER: ["pos", "orders"],
  BARISTA: ["pos", "orders", "bar"],
  CASHIER: ["pos", "finance"],
  CHEF: ["kitchen"],
  CAFE_CHEF: ["kitchen"],
  BARTENDER: ["bar", "pos"],
  ACCOUNTANT: ["finance", "expenses", "reports", "employees"],
  FINANCE: ["finance", "expenses", "reports", "payments", "employees"],
};

function PermissionRoute({ permission }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Backend returns roles like "waiter", "admin", etc.
  // Frontend permissions use "WAITER", "ADMIN", etc.
  const normalizedRole = user.role?.toUpperCase();

  const permissions = rolePermissions[normalizedRole] || [];

  const hasAccess =
    permissions.includes("*") ||
    permissions.includes(permission);

  if (!hasAccess) {
    return <RoleRedirect />;
  }

  return <Outlet />;
}

export default PermissionRoute;