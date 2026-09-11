import { useState, useEffect, useMemo } from "react";
import { useRestaurant } from "../../../context/RestaurantContext";
import { useAuth } from "../../../context/AuthContext";
import TableSelector from "../components/TableSelector";
import CategoryTabs from "../components/CategoryTabs";
import ProductGrid from "../components/ProductGrid";
import CurrentOrder from "../components/CurrentOrder";
import api from "../../../services/api";
import ActiveOrders from "../components/ActiveOrders";
import DrinkPortionModal from "../components/DrinkPortionModal";
import { getCustomShotsMap } from "../../products/ProductsPage";
import CashierShiftBanner from "../components/CashierShiftBanner";
import ShiftStartModal from "../components/ShiftStartModal";
import ShiftCloseModal from "../components/ShiftCloseModal";
import { getCurrentShift } from "../services/posApi";
import { Utensils, Wine, Coffee, Layers, Store } from "lucide-react";

function POSPage() {
  const { user } = useAuth();
  const {
    tables,
    loadingTables,
    fetchTables,
    fetchKitchenOrders,
  } = useRestaurant();

  const userRoleUpper = (user?.role || "").toUpperCase();
  const shiftOutletCode = (currentShift?.outlet_code || "").toUpperCase();
  const shiftOutletId = currentShift?.outlet_id;
  const userOutletCode = (user?.outletCode || user?.outlet_code || "").toUpperCase();
  const userOutletId = user?.outletId || user?.outlet_id;

  const effectiveOutletCode = shiftOutletCode || userOutletCode;
  const effectiveOutletId = shiftOutletId || userOutletId;

  const isCafeActor =
    userRoleUpper.includes("CAFE") ||
    userRoleUpper === "BARISTA" ||
    effectiveOutletCode === "CAFE" ||
    effectiveOutletId === 2;

  const isBartender =
    userRoleUpper === "BARTENDER" ||
    user?.role_id === 8 ||
    effectiveOutletCode === "BAR" ||
    effectiveOutletId === 3;

  const isRestaurantActor =
    userRoleUpper === "WAITER" ||
    userRoleUpper === "CHEF" ||
    effectiveOutletCode === "RESTAURANT" ||
    effectiveOutletId === 4;

  const isCashier = userRoleUpper.includes("CASHIER") || user?.role_id === 5;
  const isManagerOrAdmin =
    ["ADMIN", "HOTEL_MANAGER", "COOPERATIVE_MANAGER", "MANAGER", "FNB_MANAGER"].includes(userRoleUpper) ||
    user?.role_id === 1 ||
    user?.role_id === 2;

  const canSwitchVenue = isManagerOrAdmin || (isCashier && !effectiveOutletCode) || (!isCafeActor && !isBartender && !isRestaurantActor);

  const initialVenue = isCafeActor ? "cafe" : isBartender ? "bar" : isRestaurantActor ? "restaurant" : "all";
  const [activeVenue, setActiveVenue] = useState(initialVenue);
  const [activeCategory, setActiveCategory] = useState("all");

  const [orderItems, setOrderItems] = useState([]);
  const [orderType, setOrderType] = useState("Dine In");
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [portionModalProduct, setPortionModalProduct] = useState(null);

  const [currentShift, setCurrentShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [isStartShiftModalOpen, setIsStartShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  const fetchCurrentShift = async () => {
    try {
      setLoadingShift(true);
      const res = await getCurrentShift();
      setCurrentShift(res.data || null);
    } catch (err) {
      console.warn("Current cashier shift fetch:", err);
      setCurrentShift(null);
    } finally {
      setLoadingShift(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
  }, []);

  useEffect(() => {
    if (shiftOutletCode === "CAFE" || shiftOutletId === 2) {
      setActiveVenue("cafe");
    } else if (shiftOutletCode === "BAR" || shiftOutletId === 3) {
      setActiveVenue("bar");
    } else if (shiftOutletCode === "RESTAURANT" || shiftOutletId === 4) {
      setActiveVenue("restaurant");
    }
  }, [shiftOutletCode, shiftOutletId]);

  const venueCategories = useMemo(() => {
    if (activeVenue === "cafe") {
      return [
        { id: "all", label: "☕ All Cafe & Bakery" },
        { id: "coffee", label: "☕ Coffee & Espresso" },
        { id: "tea", label: "🍵 Teas & Herbal" },
        { id: "bakery", label: "🥐 Bakery & Pastries" },
        { id: "juices", label: "🧃 Fresh Juices & Smoothies" },
        { id: "desserts", label: "🍰 Cakes & Desserts" },
        { id: "breakfast", label: "🥪 Cafe Breakfast & Snacks" },
      ];
    }
    if (activeVenue === "bar") {
      return [
        { id: "all", label: "🍸 All Bar Drinks" },
        { id: "beers", label: "🍺 Beers & Ciders" },
        { id: "liquors", label: "🥃 Spirits & Liquors" },
        { id: "wines", label: "🍷 Wines" },
        { id: "cocktails", label: "🍹 Cocktails" },
        { id: "soft_drinks", label: "🥤 Soft Drinks" },
      ];
    }
    if (activeVenue === "restaurant") {
      return [
        { id: "all", label: "🍽️ All Restaurant Menu" },
        { id: "mains", label: "🍖 Main Dishes & Grills" },
        { id: "traditional", label: "🍲 Ethiopian Traditional" },
        { id: "fastfood", label: "🍕 Pizza & Burgers" },
        { id: "salads", label: "🥗 Salads & Starters" },
        { id: "drinks", label: "🥤 Dining Beverages" },
      ];
    }
    return [
      { id: "all", label: "🌐 All Products" },
      { id: "food", label: "🍽️ Food & Kitchen" },
      { id: "bar", label: "🍸 Bar & Drinks" },
      { id: "cafe", label: "☕ Cafe & Bakery" },
      { id: "desserts", label: "🍰 Desserts" },
      { id: "specials", label: "⭐ Specials" },
    ];
  }, [activeVenue]);


  // Helper to identify spirit/liquor bottle products that should open the portion serving modal
  const isSpiritOrLiquorProduct = (product) => {
    if (!product) return false;

    const catName = (product.category_name || product.category || "").toLowerCase();
    const catType = (product.category_type || product.type || "").toLowerCase();
    const pName = (product.product_name || product.name || "").toLowerCase();
    const menuType = (product.menu_type || product.menuType || "").toLowerCase();
    const unit = (product.unit || "").toLowerCase();

    // 1. Definite Food Check -> NEVER trigger shot portion modal for food!
    const isFood =
      menuType === "food" ||
      catType === "food" ||
      catName.includes("food") ||
      catName.includes("dish") ||
      catName.includes("grill") ||
      catName.includes("kitchen") ||
      catName.includes("traditional") ||
      catName.includes("breakfast") ||
      catName.includes("lunch") ||
      catName.includes("dinner") ||
      catName.includes("starter") ||
      catName.includes("main") ||
      catName.includes("snack") ||
      catName.includes("dessert") ||
      catName.includes("pizza") ||
      catName.includes("burger") ||
      catName.includes("sandwich") ||
      catName.includes("salad") ||
      catName.includes("soup") ||
      ["plate", "portion", "pcs", "order", "bowl", "slice", "serving"].includes(unit);

    if (isFood) return false;

    // 2. Soft drinks, beer, wine, water, tea, coffee -> directly added, NOT shots
    const isNonSpiritDrink =
      catName.includes("beer") ||
      catName.includes("soft") ||
      catName.includes("water") ||
      catName.includes("juice") ||
      catName.includes("soda") ||
      catName.includes("hot drink") ||
      catName.includes("coffee") ||
      catName.includes("tea") ||
      pName.includes("beer") ||
      pName.includes("coca") ||
      pName.includes("water") ||
      pName.includes("sprite") ||
      pName.includes("fanta") ||
      pName.includes("pepsi") ||
      pName.includes("espresso") ||
      pName.includes("cappuccino") ||
      pName.includes("macchiato");

    if (isNonSpiritDrink) return false;

    // 3. Spirits, Whiskey, Vodka, Gin, Rum, Tequila, Cognac, Liquor
    const isSpiritCat =
      catName.includes("whiskey") ||
      catName.includes("whisky") ||
      catName.includes("spirit") ||
      catName.includes("liquor") ||
      catName.includes("vodka") ||
      catName.includes("gin") ||
      catName.includes("rum") ||
      catName.includes("tequila") ||
      catName.includes("brandy") ||
      catName.includes("cognac");

    const isSpiritName =
      pName.includes("whiskey") ||
      pName.includes("whisky") ||
      pName.includes("red label") ||
      pName.includes("black label") ||
      pName.includes("jack daniel") ||
      pName.includes("jameson") ||
      pName.includes("vodka") ||
      pName.includes("gin") ||
      pName.includes("rum") ||
      pName.includes("tequila") ||
      pName.includes("brandy") ||
      pName.includes("cognac");

    // 4. Explicit shot configuration check (only if not food and explicitly marked for drink/liquor)
    const localMap = getCustomShotsMap();
    const localData = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];
    const isExplicitShot =
      (product.is_shot_item === true || product.isShotItem === true || localData?.isShotItem === true) &&
      (menuType === "drink" || catType === "beverage" || catType === "liquor" || isSpiritCat || isSpiritName);

    return isSpiritCat || isSpiritName || isExplicitShot;
  };

  const handleAddProduct = (product) => {
    if (isSpiritOrLiquorProduct(product)) {
      setPortionModalProduct(product);
      return;
    }

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const handleSelectPortion = (portionOption) => {
    if (!portionModalProduct) return;

    const itemUniqueId = `${portionModalProduct.id}_${portionOption.id}`;
    const formattedName = `${portionModalProduct.name} (${portionOption.title})`;

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.cartId === itemUniqueId || item.id === itemUniqueId);
      if (existingItem) {
        return prevItems.map((item) =>
          (item.cartId === itemUniqueId || item.id === itemUniqueId)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prevItems,
        {
          ...portionModalProduct,
          cartId: itemUniqueId,
          id: itemUniqueId,
          originalId: portionModalProduct.id,
          name: formattedName,
          price: portionOption.price,
          quantity: 1,
          portion: portionOption.id,
          portionTitle: portionOption.title,
          shotsDeduction: portionOption.shots,
          notes: `${portionOption.title} (${portionOption.shots} Shots)`,
        },
      ];
    });

    setPortionModalProduct(null);
  };

  const handleSendToKitchen = async () => {
    if (orderItems.length === 0) {
      return;
    }
    if (orderType === "Dine In" && !selectedTable) {
      alert("Please select a table for Dine In orders.");
      return;
    }

    try {
      const orderNumber = `ORD-${Date.now()}`;

      const rawTableId = Number(selectedTable?.id);
      const tableId = (!isNaN(rawTableId) && rawTableId > 0) ? rawTableId : null;

      const orderData = {
        orderNumber,
        orderType:
          orderType === "Dine In"
            ? "dine_in"
            : orderType === "Takeaway"
            ? "takeaway"
            : "delivery",

        tableId,
        is_bar_order: isBartender || Boolean(selectedTable?.is_bar_seat),

        waiterId: user?.employee_id || user?.employeeId || user?.id || 1,
        waiter_id: user?.employee_id || user?.employeeId || user?.id || 1,
        waiterName: user?.username || user?.name || null,
        waiter_name: user?.username || user?.name || null,
        bartender_id: isBartender ? (user?.employee_id || user?.employeeId || user?.id || 1) : null,
        bartender_name: isBartender ? (user?.username || user?.name || null) : null,

        items: orderItems.map((item) => ({
          productId: item.originalId || item.id,
          product_id: item.originalId || item.id,
          name: item.name,
          product_name: item.name,
          price: item.price,
          unit_price: item.price,
          quantity: item.quantity,
          portion: item.portion || "",
          shotsDeduction: item.shotsDeduction || null,
          notes: item.notes || "",
        })),

        notes: "",
      };

      const response = await api("/pos/orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      console.log("Order created:", response);

      // Explicitly update table status to occupied if table was selected
      if (selectedTable?.id) {
        try {
          await api(`/tables/${selectedTable.id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: "occupied" }),
          });
        } catch (tableErr) {
          console.log("Table status update note:", tableErr);
        }
      }

      setOrderItems([]);
      setSelectedTable(null);

      // Instantly refresh table status and active orders in Restaurant Context
      if (fetchTables) {
        fetchTables();
      }
      if (fetchKitchenOrders) {
        fetchKitchenOrders();
      }

      const isBarOrder = isBartender || Boolean(selectedTable?.is_bar_seat);
      alert(isBarOrder ? "Order sent to Bar successfully!" : "Order sent to kitchen successfully!");

    } catch (error) {
      console.error("Failed to create order:", error);

      alert(
        error.message ||
        "Failed to send order to kitchen"
      );
    }
  };

  const handleIncrease = (productId) => {
    setOrderItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const handleDecrease = (productId) => {
    setOrderItems((prevItems) =>
      prevItems
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemove = (productId) => {
    setOrderItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  };

  const handleClear = () => {
    setOrderItems([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Point of Sale
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage restaurant and bar orders.
          </p>
        </div>
      </div>

      {/* Cashier Shift Status Banner */}
      <CashierShiftBanner
        currentShift={currentShift}
        loadingShift={loadingShift}
        onStartShiftClick={() => setIsStartShiftModalOpen(true)}
        onCloseShiftClick={() => setIsCloseShiftModalOpen(true)}
      />

      <ActiveOrders />

      {/* Order Type */}
      <div className="flex gap-2">
        {["Dine In", "Takeaway"].map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              orderType === type
                ? "bg-blue-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Main POS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Left side */}
        <div className="space-y-6 xl:col-span-2">

          {/* Tables */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Tables
              </h2>

              <p className="text-sm text-gray-500">
                Select a table for this order.
              </p>
            </div>

            <TableSelector
              tables={tables}
              loading={loadingTables}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
            />
          </div>

          {/* Venue Switcher or Indicator */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
            {canSwitchVenue ? (
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                <button
                  type="button"
                  onClick={() => { setActiveVenue("all"); setActiveCategory("all"); }}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${activeVenue === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  🌐 All Outlets
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveVenue("restaurant"); setActiveCategory("all"); }}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition ${activeVenue === "restaurant" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <Utensils className="h-3.5 w-3.5" />
                  Restaurant
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveVenue("bar"); setActiveCategory("all"); }}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition ${activeVenue === "bar" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <Wine className="h-3.5 w-3.5" />
                  Main Bar
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveVenue("cafe"); setActiveCategory("all"); }}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition ${activeVenue === "cafe" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <Coffee className="h-3.5 w-3.5" />
                  Cafe & Bakery
                </button>
              </div>
            ) : (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold border ${
                activeVenue === "cafe"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : activeVenue === "bar"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}>
                {activeVenue === "cafe" ? <Coffee className="h-4 w-4 text-emerald-600" /> : activeVenue === "bar" ? <Wine className="h-4 w-4 text-amber-600" /> : <Utensils className="h-4 w-4 text-blue-600" />}
                <span>
                  {activeVenue === "cafe"
                    ? "☕ Cafe & Bakery Menu Mode"
                    : activeVenue === "bar"
                    ? "🍸 Main Bar Drinks Mode"
                    : "🍽️ Main Restaurant Dining Mode"}
                </span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold shadow-2xs">
                  {userRoleUpper.replace(/_/g, " ")}
                </span>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
              {venueCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activeCategory === category.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeVenue === "cafe"
                    ? "Search cafe items, coffee..."
                    : activeVenue === "bar"
                    ? "Search bar drinks, beers..."
                    : activeVenue === "restaurant"
                    ? "Search restaurant dishes..."
                    : "Search products..."
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-5">
            <ProductGrid
              onAddProduct={handleAddProduct}
              activeCategory={activeCategory}
              orderItems={orderItems}
              searchTerm={searchTerm}
              isBartender={isBartender}
              isCafeActor={isCafeActor}
              venue={activeVenue}
            />
          </div>
        </div>

        {/* Right side */}
        <div className="xl:col-span-1">
          <CurrentOrder
            orderItems={orderItems}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
            onClear={handleClear}
            onSendToKitchen={handleSendToKitchen}
            selectedTable={selectedTable}
            orderType={orderType}
          />
        </div>

      </div>

            {/* CASHIER SHIFT MANAGEMENT MODALS */}
      <ShiftStartModal
        isOpen={isStartShiftModalOpen}
        onClose={() => setIsStartShiftModalOpen(false)}
        cashierName={user?.name || user?.username}
        onShiftStarted={(newShift) => {
          setCurrentShift(newShift);
          setIsStartShiftModalOpen(false);
          fetchCurrentShift();
        }}
      />

      <ShiftCloseModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        currentShift={currentShift}
        onShiftClosed={() => {
          setCurrentShift(null);
          setIsCloseShiftModalOpen(false);
          fetchCurrentShift();
        }}
      />

      {/* DRINK PORTION SELECTOR MODAL */}
      {portionModalProduct && (
        <DrinkPortionModal
          product={portionModalProduct}
          onClose={() => setPortionModalProduct(null)}
          onSelectPortion={handleSelectPortion}
        />
      )}

    </div>
  );
}

export default POSPage;