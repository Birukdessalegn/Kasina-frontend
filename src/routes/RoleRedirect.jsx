import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role?.toUpperCase();

  switch (role) {
    case "CHEF":
    case "CAFE_CHEF":
    case "KITCHEN_MANAGER":
      return <Navigate to="/kitchen" replace />;

    case "ADMIN":
    case "HOTEL_MANAGER":
    case "COOPERATIVE_MANAGER":
    case "MANAGER":
      return <Navigate to="/dashboard" replace />;

    case "WAITER":
    case "CAFE_WAITER":
    case "BARISTA":
    case "CASHIER":
    case "CAFE_SUPERVISOR":
    case "BAR_RESTAURANT_SUPERVISOR":
      return <Navigate to="/pos" replace />;

    case "BARTENDER":
      return <Navigate to="/bar" replace />;

    case "RECEPTIONIST":
    case "HOUSEKEEPING_MANAGER":
      return <Navigate to="/frontdesk" replace />;

    case "STORE_MANAGER":
    case "STOREKEEPER":
      return <Navigate to="/inventory" replace />;

    case "PURCHASING_MANAGER":
    case "PURCHASING":
      return <Navigate to="/purchasing" replace />;

    case "ACCOUNTANT_MANAGER":
    case "ACCOUNTANT":
    case "FINANCE":
      return <Navigate to="/finance" replace />;

    case "HR_MANAGER":
    case "HR":
      return <Navigate to="/employees" replace />;

    case "FNB_MANAGER":
    case "FB_CONTROLLER":
      return <Navigate to="/kitchen/audit" replace />;

    default:
      return <Navigate to="/dashboard" replace />;
  }
}

export default RoleRedirect;