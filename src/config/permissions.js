export const ROLES = {
  ADMIN: "ADMIN",
  HOTEL_MANAGER: "HOTEL_MANAGER",
  COOPERATIVE_MANAGER: "COOPERATIVE_MANAGER",
  MANAGER: "MANAGER",
  ACCOUNTANT_MANAGER: "ACCOUNTANT_MANAGER",
  KITCHEN_MANAGER: "KITCHEN_MANAGER",
  FNB_MANAGER: "FNB_MANAGER",
  FB_CONTROLLER: "FB_CONTROLLER",
  CAFE_SUPERVISOR: "CAFE_SUPERVISOR",
  BAR_RESTAURANT_SUPERVISOR: "BAR_RESTAURANT_SUPERVISOR",
  STORE_MANAGER: "STORE_MANAGER",
  STOREKEEPER: "STOREKEEPER",
  PURCHASING_MANAGER: "PURCHASING_MANAGER",
  PURCHASING: "PURCHASING",
  HR_MANAGER: "HR_MANAGER",
  HR: "HR",
  HOUSEKEEPING_MANAGER: "HOUSEKEEPING_MANAGER",
  HOUSEKEEPER: "HOUSEKEEPER",
  CLEANER: "CLEANER",
  RECEPTIONIST: "RECEPTIONIST",
  WAITER: "WAITER",
  CAFE_WAITER: "CAFE_WAITER",
  BARISTA: "BARISTA",
  CASHIER: "CASHIER",
  CHEF: "CHEF",
  CAFE_CHEF: "CAFE_CHEF",
  BARTENDER: "BARTENDER",
  ACCOUNTANT: "ACCOUNTANT",
  FINANCE: "FINANCE",
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ["*"],
  [ROLES.HOTEL_MANAGER]: ["*"],

  [ROLES.MANAGER]: [
    "dashboard.view",
    "frontdesk.view",
    "frontdesk.manage",
    "housekeeping.view",
    "rooms.view",
    "rooms.manage",
    "reservations.view",
    "reservations.manage",
    "pos.view",
    "orders.view",
    "orders.create",
    "tables.view",
    "kitchen.view",
    "kitchen_audit.manage",
    "bar.view",
    "products.view",
    "inventory.view",
    "transfers.approve",
    "purchasing.view",
    "customers.view",
    "payments.view",
    "expenses.view",
    "reports.view",
    "finance.view",
    "cashier.reconcile",
    "employees.view",
    "payroll.view",
  ],

  [ROLES.COOPERATIVE_MANAGER]: [
    "dashboard.view",
    "frontdesk.view",
    "frontdesk.manage",
    "housekeeping.view",
    "rooms.view",
    "reservations.view",
    "reservations.manage",
    "pos.view",
    "orders.view",
    "orders.create",
    "tables.view",
    "kitchen.view",
    "bar.view",
    "products.view",
    "inventory.view",
    "customers.view",
    "finance.view",
    "reports.view",
    "attendance.view",
  ],

  [ROLES.ACCOUNTANT_MANAGER]: [
    "finance.view",
    "cashier.reconcile",
    "payments.view",
    "payments.verify",
    "expenses.view",
    "reports.view",
    "inventory.view",
    "purchasing.view",
    "purchasing.create",
    "products.view",
  ],

  [ROLES.KITCHEN_MANAGER]: [
    "kitchen.view",
    "kitchen.update",
    "kitchen_audit.manage",
    "inventory.view",
    "products.view",
    "reports.view",
  ],

  [ROLES.FNB_MANAGER]: [
    "kitchen.view",
    "kitchen_audit.manage",
    "inventory.view",
    "products.view",
    "reports.view",
  ],

  [ROLES.FB_CONTROLLER]: [
    "dashboard.view",
    "kitchen.view",
    "kitchen_audit.manage",
    "inventory.view",
    "transfers.approve",
    "reports.view",
  ],

  [ROLES.CAFE_SUPERVISOR]: [
    "pos.view",
    "orders.view",
    "orders.create",
    "tables.view",
    "kitchen.view",
    "payments.view",
    "payments.create",
    "finance.view",
    "cashier.reconcile",
    "attendance.view",
    "reports.view",
  ],

  [ROLES.BAR_RESTAURANT_SUPERVISOR]: [
    "pos.view",
    "orders.view",
    "orders.create",
    "tables.view",
    "bar.view",
    "kitchen.view",
    "payments.view",
    "payments.create",
    "finance.view",
    "cashier.reconcile",
    "attendance.view",
    "reports.view",
  ],

  [ROLES.STORE_MANAGER]: [
    "inventory.view",
    "inventory.update",
    "transfers.approve",
    "products.view",
    "purchasing.view",
    "reports.view",
  ],

  [ROLES.STOREKEEPER]: [
    "dashboard.view",
    "inventory.view",
    "inventory.update",
    "products.view",
  ],

  [ROLES.PURCHASING_MANAGER]: [
    "purchasing.view",
    "purchasing.create",
    "suppliers.view",
    "inventory.view",
    "products.view",
    "reports.view",
  ],

  [ROLES.PURCHASING]: [
    "dashboard.view",
    "purchasing.view",
    "purchasing.create",
    "suppliers.view",
    "inventory.view",
  ],

  [ROLES.HR_MANAGER]: [
    "employees.view",
    "attendance.view",
    "attendance.manage",
    "leave.view",
    "payroll.view",
    "reports.view",
  ],

  [ROLES.HR]: [
    "dashboard.view",
    "employees.view",
    "attendance.view",
    "leave.view",
    "payroll.view",
  ],

  [ROLES.HOUSEKEEPING_MANAGER]: [
    "frontdesk.view",
    "housekeeping.view",
    "rooms.view",
    "rooms.manage",
    "reservations.view",
    "attendance.view",
  ],

  [ROLES.HOUSEKEEPER]: [
    "dashboard.view",
    "frontdesk.view",
    "housekeeping.view",
    "rooms.view",
  ],

  [ROLES.CLEANER]: [
    "dashboard.view",
    "frontdesk.view",
    "housekeeping.view",
    "rooms.view",
  ],

  [ROLES.RECEPTIONIST]: [
    "dashboard.view",
    "frontdesk.view",
    "frontdesk.manage",
    "housekeeping.view",
    "rooms.view",
    "rooms.manage",
    "reservations.view",
    "reservations.manage",
    "payments.create",
    "attendance.view",
    "attendance.manage",
    "customers.view",
  ],

  [ROLES.WAITER]: [
    "dashboard.view",
    "pos.view",
    "orders.view",
    "orders.create",
  ],

  [ROLES.CAFE_WAITER]: [
    "pos.view",
    "orders.view",
    "orders.create",
  ],

  [ROLES.BARISTA]: [
    "pos.view",
    "orders.view",
    "orders.create",
    "bar.view",
  ],

  [ROLES.CASHIER]: [
    "dashboard.view",
    "pos.view",
    "orders.view",
    "orders.create",
    "payments.view",
    "payments.create",
    "attendance.view",
    "attendance.manage",
  ],

  [ROLES.CHEF]: [
    "dashboard.view",
    "kitchen.view",
    "kitchen.update",
  ],

  [ROLES.CAFE_CHEF]: [
    "kitchen.view",
    "kitchen.update",
  ],

  [ROLES.BARTENDER]: [
    "dashboard.view",
    "bar.view",
    "bar.update",
    "kitchen.view",
    "pos.view",
    "orders.view",
    "orders.create",
  ],

  [ROLES.ACCOUNTANT]: [
    "dashboard.view",
    "payments.view",
    "expenses.view",
    "accounting.view",
    "reports.view",
    "finance.view",
    "cashier.reconcile",
  ],

  [ROLES.FINANCE]: [
    "dashboard.view",
    "finance.view",
    "payments.view",
    "payments.verify",
    "cashier.reconcile",
    "expenses.view",
    "reports.view",
  ],
};

export function hasPermission(role, permission) {
  const normalizedRole = typeof role === "string" ? role.toUpperCase() : "";
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS[role] || [];

  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
}   