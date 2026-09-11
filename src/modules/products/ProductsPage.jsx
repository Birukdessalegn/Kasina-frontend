import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Package,
  Utensils,
  Wine,
  Coffee,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Star,
  Users,
  UserCheck,
  Sparkles,
  BookOpen,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

import api from "../../services/api";

// Helper to format food/drink image URLs
export const formatImageUrl = (url) => {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  const baseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const getCustomShotsMap = () => {
  try {
    return JSON.parse(localStorage.getItem("rbms_custom_shots_map") || "{}");
  } catch {
    return {};
  }
};

export const setCustomProductShots = (productIdOrCode, shots, isShotItem = true) => {
  try {
    if (!productIdOrCode) return;
    const map = getCustomShotsMap();
    map[String(productIdOrCode)] = {
      shots: Number(shots) > 0 ? Number(shots) : 30,
      isShotItem: Boolean(isShotItem),
    };
    localStorage.setItem("rbms_custom_shots_map", JSON.stringify(map));
  } catch (err) {
    console.warn("Could not save custom shots map", err);
  }
};

// Helpers to determine Venue / Menu allocation (Restaurant vs Bar vs Cafe)
export const isBarProduct = (product) => {
  if (!product) return false;
  const catName = (product.category_name || product.category || "").toLowerCase();
  const catType = (product.category_type || product.type || "").toLowerCase();
  const prepCode = (product.preparation_outlet_code || "").toLowerCase();
  const pName = (product.name || product.product_name || "").toLowerCase();

  return (
    prepCode === "bar" ||
    catType === "liquor" ||
    catType === "bar" ||
    product.is_shot_item === true ||
    product.isShotItem === true ||
    catName.includes("beer") ||
    catName.includes("wine") ||
    catName.includes("cider") ||
    catName.includes("spirit") ||
    catName.includes("liquor") ||
    catName.includes("whiskey") ||
    catName.includes("vodka") ||
    catName.includes("gin") ||
    catName.includes("cocktail") ||
    catName.includes("draught") ||
    pName.includes("beer") ||
    pName.includes("wine") ||
    pName.includes("whiskey") ||
    pName.includes("vodka")
  );
};

export const isCafeProduct = (product) => {
  if (!product) return false;
  if (isBarProduct(product)) return false;
  const catName = (product.category_name || product.category || "").toLowerCase();
  const prepCode = (product.preparation_outlet_code || "").toLowerCase();
  const pName = (product.name || product.product_name || "").toLowerCase();

  return (
    prepCode.includes("cafe") ||
    catName.includes("hot beverage") ||
    catName.includes("coffee") ||
    catName.includes("tea") ||
    catName.includes("juice") ||
    catName.includes("soft") ||
    catName.includes("pastry") ||
    catName.includes("dessert") ||
    catName.includes("bakery") ||
    catName.includes("cake") ||
    pName.includes("espresso") ||
    pName.includes("cappuccino") ||
    pName.includes("latte") ||
    pName.includes("macchiato") ||
    pName.includes("tea")
  );
};

export const isRestaurantProduct = (product) => {
  if (!product) return false;
  if (isBarProduct(product)) return false;
  if (isCafeProduct(product)) return false;
  return true;
};

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [venueFilter, setVenueFilter] = useState("all"); // "all" | "restaurant" | "bar" | "cafe"

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [activeTab, setActiveTab] = useState("catalog"); // "catalog" | "menu"
  const [menuAudienceFilter, setMenuAudienceFilter] = useState("all"); // "all" | "customer" | "employee"

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [basePriceInput, setBasePriceInput] = useState("");

  const [form, setForm] = useState({
    productCode: "",
    name: "",
    categoryId: "",
    description: "",
    price: "",
    costPrice: "",
    staffPrice: "",
    unit: "pcs",
    imageUrl: "",
    isAvailable: true,
    isActive: true,
    menuType: "both", // "both" | "customer" | "employee"
    isTodaysSpecial: false,
    shotsCapacity: "30",
    isShotItem: false,
    venue: "restaurant", // "restaurant" | "bar" | "cafe"
    preparationOutletId: "",
  });

  // ============================================================
  // FETCH PRODUCTS
  // ============================================================

  const fetchProducts = async () => {
    try {
      setError("");

      const response = await api("/products");
      const rawProducts = response.products || [];
      const localMap = getCustomShotsMap();
      const enriched = rawProducts.map((p) => {
        const cat = (p.category_name || p.category || p.type || "").toLowerCase();
        const pName = (p.name || p.product_name || "").toLowerCase();
        const isFoodOrSoft =
          cat.includes("food") ||
          cat.includes("kitchen") ||
          cat.includes("beer") ||
          cat.includes("soft") ||
          cat.includes("water") ||
          cat.includes("wine") ||
          pName.includes("salad") ||
          pName.includes("beer") ||
          pName.includes("water") ||
          pName.includes("coca") ||
          pName.includes("pizza") ||
          pName.includes("burger");

        const local = localMap[String(p.id)] || localMap[String(p.product_code || p.productCode)];
        const isExplicitShot = p.is_shot_item === true || p.isShotItem === true || local?.isShotItem === true;
        const isSpiritBottle =
          !isFoodOrSoft &&
          (cat.includes("whiskey") ||
            cat.includes("spirit") ||
            cat.includes("liquor") ||
            cat.includes("vodka") ||
            cat.includes("gin") ||
            cat.includes("rum") ||
            cat.includes("tequila") ||
            pName.includes("whiskey") ||
            pName.includes("red label") ||
            pName.includes("black label") ||
            pName.includes("jack daniel") ||
            pName.includes("jameson") ||
            pName.includes("vodka") ||
            pName.includes("gin") ||
            pName.includes("rum") ||
            pName.includes("tequila"));

        const isShot = !isFoodOrSoft && (isExplicitShot || isSpiritBottle);
        const cap = isShot
          ? Number(p.shots_capacity || p.shotsCapacity || p.bottle_shots || local?.shots || 30)
          : 0;

        return {
          ...p,
          shots_capacity: cap,
          shotsCapacity: cap,
          is_shot_item: Boolean(isShot),
          isShotItem: Boolean(isShot),
        };
      });

      setProducts(enriched);
    } catch (error) {
      console.error("Failed to fetch products:", error);

      setError(
        error.message || "Failed to load products"
      );
    }
  };

  // ============================================================
  // FETCH CATEGORIES
  // ============================================================

  const fetchCategories = async () => {
    try {
      const response = await api("/products/categories");

      setCategories(response.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);

      setError(
        error.message || "Failed to load categories"
      );
    }
  };

  const fetchOutlets = async () => {
    try {
      const response = await api("/products/outlets");
      setOutlets(response.outlets || []);
    } catch (error) {
      console.warn("Failed to fetch outlets:", error);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchOutlets(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => {
      const nextVal = type === "checkbox" ? checked : value;
      const updated = {
        ...previous,
        [name]: nextVal,
      };

      if (name === "categoryId") {
        const catObj = categories.find((c) => String(c.id) === String(value));
        const catType = (catObj?.type || catObj?.name || "").toLowerCase();
        if (catType.includes("food") || catType.includes("kitchen")) {
          if (["bottle", "shot", "half_bottle"].includes(updated.unit)) {
            updated.unit = "plate";
          }
          updated.isShotItem = false;
        }
      }

      return updated;
    });
  };

  // ============================================================
  // OPEN MODAL
  // ============================================================

  // ============================================================
  // FILE CHANGE & IMAGE PREVIEW
  // ============================================================

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  // ============================================================
  // OPEN MODAL
  // ============================================================

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview("");
    setBasePriceInput("");

    setForm({
      productCode: "",
      name: "",
      categoryId: "",
      description: "",
      price: "",
      costPrice: 0,
      staffPrice: "",
      unit: "pcs",
      imageUrl: "",
      isAvailable: true,
      isActive: true,
      menuType: "both",
      isTodaysSpecial: false,
      shotsCapacity: "30",
      isShotItem: false,
      venue: venueFilter !== "all" ? venueFilter : "restaurant",
      preparationOutletId: "",
    });

    setShowModal(true);
  };

  const openEditModal = (prod) => {
    setError("");
    setSuccess("");
    setEditingProduct(prod);
    setImageFile(null);
    setImagePreview(prod.image_url || prod.imageUrl || "");
    const prodPrice = Number(prod.price || 0);
    setBasePriceInput(prodPrice > 0 ? (prodPrice / 1.15).toFixed(2) : "");

    const localMap = getCustomShotsMap();
    const localData = localMap[String(prod.id)] || localMap[String(prod.product_code || prod.productCode)];
    const resolvedShots = String(
      prod.shots_capacity ??
      prod.shotsCapacity ??
      prod.bottle_shots ??
      localData?.shots ??
      30
    );
    const resolvedIsShotItem =
      prod.is_shot_item ??
      prod.isShotItem ??
      localData?.isShotItem ??
      (Number(resolvedShots) > 0);

    const catName = (prod.category_name || "").toLowerCase();
    const isBar = isBarProduct(prod);
    const isCafe = isCafeProduct(prod);
    const resolvedVenue = isBar ? "bar" : isCafe ? "cafe" : "restaurant";

    setForm({
      productCode: prod.product_code || prod.productCode || "",
      name: prod.name || "",
      categoryId: prod.category_id || prod.categoryId || "",
      description: prod.description || "",
      price: prod.price || "",
      costPrice: prod.cost_price || prod.costPrice || 0,
      staffPrice: prod.staff_price || prod.staffPrice || "",
      unit: prod.unit || "pcs",
      imageUrl: prod.image_url || prod.imageUrl || "",
      isAvailable: prod.is_available ?? prod.isAvailable ?? true,
      isActive: prod.is_active ?? prod.isActive ?? true,
      menuType: prod.menu_type || prod.menuType || "both",
      isTodaysSpecial: prod.is_todays_special ?? prod.isTodaysSpecial ?? false,
      shotsCapacity: resolvedShots,
      isShotItem: Boolean(resolvedIsShotItem),
      venue: resolvedVenue,
      preparationOutletId: prod.preparation_outlet_id || prod.preparationOutletId || "",
    });

    setShowModal(true);
  };

  // ============================================================
  // CLOSE MODAL
  // ============================================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
  };

  // ============================================================
  // CREATE / EDIT PRODUCT (MULTIPART FORM-DATA)
  // ============================================================

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.name.trim()) {
        throw new Error("Product name is required");
      }

      if (form.price === "") {
        throw new Error("Selling price is required");
      }

      if (Number(form.price) < 0) {
        throw new Error("Selling price cannot be negative");
      }

      const parseNumStr = (val, fallback = "0") => {
        if (val === undefined || val === null || val === "" || String(val).toLowerCase() === "undefined" || isNaN(Number(val))) {
          return fallback;
        }
        return String(Number(val));
      };

      const safePrice = parseNumStr(form.price, "0");
      const safeCostPrice = parseNumStr(form.costPrice, "0");
      const safeStaffPrice = parseNumStr(form.staffPrice, "0");
      const safeShotsCapacity = parseNumStr(form.shotsCapacity, "30");

      // Build FormData payload for multipart image upload (supports both camelCase & snake_case backend keys)
      const formData = new FormData();
      const code = (form.productCode || "").trim();
      if (code) {
        formData.append("productCode", code);
        formData.append("product_code", code);
      }

      formData.append("name", form.name.trim());
      formData.append("product_name", form.name.trim());

      if (form.categoryId) {
        formData.append("categoryId", String(form.categoryId));
        formData.append("category_id", String(form.categoryId));
      }

      if (form.description.trim()) {
        formData.append("description", form.description.trim());
      }

      formData.append("price", safePrice);
      formData.append("unit_price", safePrice);

      formData.append("costPrice", safeCostPrice);
      formData.append("cost_price", safeCostPrice);

      formData.append("staffPrice", safeStaffPrice);
      formData.append("staff_price", safeStaffPrice);

      formData.append("shotsCapacity", safeShotsCapacity);
      formData.append("shots_capacity", safeShotsCapacity);

      formData.append("isShotItem", String(form.isShotItem));
      formData.append("is_shot_item", String(form.isShotItem));

      formData.append("unit", form.unit || "pcs");
      formData.append("menuType", form.menuType || "both");
      formData.append("menu_type", form.menuType || "both");

      formData.append("isAvailable", String(form.isAvailable));
      formData.append("is_available", String(form.isAvailable));

      formData.append("isActive", String(form.isActive));
      formData.append("is_active", String(form.isActive));

      formData.append("isTodaysSpecial", String(form.isTodaysSpecial));
      formData.append("is_todays_special", String(form.isTodaysSpecial));

      if (form.preparationOutletId) {
        formData.append("preparationOutletId", String(form.preparationOutletId));
        formData.append("preparation_outlet_id", String(form.preparationOutletId));
      }

      if (form.imageUrl.trim()) {
        formData.append("imageUrl", form.imageUrl.trim());
        formData.append("image_url", form.imageUrl.trim());
      }

      // Attach file if selected from gallery
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const endpoint = editingProduct ? `/products/${editingProduct.id}` : "/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await api(endpoint, {
        method,
        body: formData,
      });

      // Persist custom shots immediately to local registry so it's instantly available
      const savedShotsNum = Number(safeShotsCapacity);
      const savedProdId = editingProduct?.id || res?.product?.id || res?.id || res?.data?.id;
      if (savedProdId) {
        setCustomProductShots(savedProdId, savedShotsNum, form.isShotItem);
      }
      if (code) {
        setCustomProductShots(code, savedShotsNum, form.isShotItem);
      }

      setSuccess(editingProduct ? "Product updated successfully." : "Product created successfully.");
      setShowModal(false);
      await fetchProducts();

    } catch (error) {
      console.error(
        "Save product error:",
        error
      );

      setError(
        error.message ||
          "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // FAST INLINE MENU TOGGLE
  // ============================================================

  const handleToggleMenuSetting = async (product, payload) => {
    try {
      // Optimistic state update
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...payload } : p))
      );

      await api(`/products/${product.id}/menu`, {
        method: "PUT",
        body: JSON.stringify({
          menuType: payload.menu_type !== undefined ? payload.menu_type : product.menu_type,
          isAvailable: payload.is_available !== undefined ? payload.is_available : product.is_available,
          isTodaysSpecial: payload.is_todays_special !== undefined ? payload.is_todays_special : product.is_todays_special,
          staffPrice: payload.staff_price !== undefined ? payload.staff_price : product.staff_price,
        }),
      });
    } catch (err) {
      console.error("Failed to update menu setting:", err);
      setError("Failed to update menu setting.");
      await fetchProducts();
    }
  };

  // ============================================================
  // FILTER PRODUCTS
  // ============================================================

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchText =
        search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        product.name
          ?.toLowerCase()
          .includes(searchText) ||
        product.product_code
          ?.toLowerCase()
          .includes(searchText);

      const matchesCategory =
        categoryFilter === "all" ||
        String(product.category_id) ===
          String(categoryFilter);

      const matchesVenue =
        venueFilter === "all" ||
        (venueFilter === "restaurant" && isRestaurantProduct(product)) ||
        (venueFilter === "bar" && isBarProduct(product)) ||
        (venueFilter === "cafe" && isCafeProduct(product));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesVenue
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    venueFilter,
  ]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const totalProducts = products.length;

  const restaurantCount = products.filter(isRestaurantProduct).length;
  const barCount = products.filter(isBarProduct).length;
  const cafeCount = products.filter(isCafeProduct).length;

  // ============================================================
  // CATEGORY ICON
  // ============================================================

  const getCategoryIcon = (type) => {
    switch (type) {
      case "food":
        return Utensils;

      case "bar":
        return Wine;

      case "drink":
        return Coffee;

      default:
        return Package;
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading products...
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Products & Menu Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage food & drinks catalog, customer menus, staff meal rules, and daily specials.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />

          Add Product
        </button>

      </div>

      {/* ======================================================
          TOP TAB SWITCHER (CATALOG vs DAILY MENU MANAGER)
      ====================================================== */}

      <div className="flex border-b border-slate-200">

        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "catalog"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package className="h-4 w-4" />
          Master Catalog ({products.length})
        </button>

        <button
          onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "menu"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Daily Menu Manager (Customer vs Staff)
        </button>

      </div>

      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5" />

          {success}
        </div>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <XCircle className="h-5 w-5" />

          {error}

          <button
            onClick={() => setError("")}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

        <SummaryCard
          title="All Menu Items"
          value={totalProducts}
          icon={Package}
        />

        <SummaryCard
          title="🍽️ Restaurant Menu"
          value={restaurantCount}
          icon={Utensils}
        />

        <SummaryCard
          title="🍸 Bar Menu"
          value={barCount}
          icon={Wine}
        />

        <SummaryCard
          title="☕ Cafe Menu"
          value={cafeCount}
          icon={Coffee}
        />

      </div>

      {/* ======================================================
          PRODUCTS CONTAINER (CATALOG vs MENU MANAGER)
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* VENUE / MENU FILTER TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 bg-slate-50/70">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">
            Menu View:
          </span>

          <button
            type="button"
            onClick={() => setVenueFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              venueFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>🌐</span>
            All Menus ({totalProducts})
          </button>

          <button
            type="button"
            onClick={() => setVenueFilter("restaurant")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              venueFilter === "restaurant"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>🍽️</span>
            Restaurant Menu ({restaurantCount})
          </button>

          <button
            type="button"
            onClick={() => setVenueFilter("bar")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              venueFilter === "bar"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>🍸</span>
            Bar Menu ({barCount})
          </button>

          <button
            type="button"
            onClick={() => setVenueFilter("cafe")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              venueFilter === "cafe"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>☕</span>
            Cafe Menu ({cafeCount})
          </button>
        </div>

        {/* Toolbar */}

        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">

          {/* Search */}

          <div className="relative w-full md:max-w-sm">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />

          </div>

          <div className="flex flex-wrap items-center gap-3">

            {/* Menu Audience Filter (Only in Menu Tab) */}

            {activeTab === "menu" && (
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">

                <button
                  type="button"
                  onClick={() => setMenuAudienceFilter("all")}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    menuAudienceFilter === "all"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Items
                </button>

                <button
                  type="button"
                  onClick={() => setMenuAudienceFilter("customer")}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold transition ${
                    menuAudienceFilter === "customer"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Customer Menu
                </button>

                <button
                  type="button"
                  onClick={() => setMenuAudienceFilter("employee")}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold transition ${
                    menuAudienceFilter === "employee"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Employee Menu
                </button>

              </div>
            )}

            {/* Category Filter */}

            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            >

              <option value="all">
                All Categories
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}

            </select>

          </div>

        </div>

        {/* Table / Content */}

        {filteredProducts.length === 0 ? (

          <div className="flex h-56 flex-col items-center justify-center">

            <Package className="mb-3 h-10 w-10 text-slate-300" />

            <p className="text-sm font-medium text-slate-500">
              No products found
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Create your first product or adjust search filters.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                <tr>

                  <th className="px-5 py-4">
                    Product
                  </th>

                  <th className="px-5 py-4">
                    Category
                  </th>

                  <th className="px-5 py-4">
                    Customer Price
                  </th>

                  <th className="px-5 py-4">
                    Staff Price
                  </th>

                  <th className="px-5 py-4">
                    Menu Audience
                  </th>

                  {activeTab === "menu" && (
                    <th className="px-5 py-4 text-center">
                      Today's Special
                    </th>
                  )}

                  <th className="px-5 py-4 text-center">
                    Available Today
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredProducts
                  .filter((product) => {
                    if (activeTab !== "menu" || menuAudienceFilter === "all") return true;
                    const scope = product.menu_type || "both";
                    if (menuAudienceFilter === "customer") return scope === "customer" || scope === "both";
                    if (menuAudienceFilter === "employee") return scope === "employee" || scope === "both";
                    return true;
                  })
                  .map((product) => {

                    const CategoryIcon =
                      getCategoryIcon(
                        product.category_type
                      );

                    const menuScope = product.menu_type || "both";

                    return (
                      <tr
                        key={product.id}
                        onClick={() => openEditModal(product)}
                        className="transition hover:bg-slate-100/80 cursor-pointer active:bg-slate-200/60"
                        title="Click to view & edit product price and details"
                      >

                        {/* Product */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 overflow-hidden">

                              {(product.image_url || product.imageUrl) ? (
                                <img
                                  src={formatImageUrl(product.image_url || product.imageUrl)}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <CategoryIcon className="h-5 w-5" />
                              )}

                              {product.is_todays_special && (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                                  <Star className="h-2.5 w-2.5 fill-white" />
                                </span>
                              )}

                            </div>

                            <div>

                              <div className="flex items-center gap-2">

                                <p className="font-semibold text-slate-900">
                                  {product.name}
                                </p>

                                {product.is_todays_special && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Special
                                  </span>
                                )}

                              </div>

                              {product.product_code && (
                                <p className="text-xs text-slate-400">
                                  {product.product_code}
                                </p>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* Category */}

                        <td className="px-5 py-4">

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {product.category_name ||
                              "Uncategorized"}
                          </span>

                        </td>

                        {/* Customer Price */}

                        <td className="px-5 py-4 font-semibold text-slate-900">

                          {Number(
                            product.price || 0
                          ).toLocaleString()}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            ETB / {product.unit || "pcs"}
                          </span>

                          {Boolean(product.is_shot_item || product.isShotItem) && Number(product.shots_capacity || product.shotsCapacity) > 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-purple-700 border border-purple-200">
                                🥃 {product.shots_capacity || product.shotsCapacity || 30} Shots/Bottle
                              </span>
                            </div>
                          )}

                        </td>

                        {/* Staff Price */}

                        <td className="px-5 py-4 font-medium text-slate-700">

                          {Number(product.staff_price || 0) === 0 ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                              Free (0 ETB)
                            </span>
                          ) : (
                            <span>
                              {Number(product.staff_price).toLocaleString()} ETB
                            </span>
                          )}

                        </td>

                        {/* Menu Audience Toggle */}

                        <td className="px-5 py-4">

                          {activeTab === "menu" ? (
                            <select
                              value={menuScope}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                handleToggleMenuSetting(product, {
                                  menu_type: e.target.value,
                                })
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            >
                              <option value="both">Both (Cust & Staff)</option>
                              <option value="customer">Customer Only</option>
                              <option value="employee">Employee Only</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                menuScope === "customer"
                                  ? "bg-blue-100 text-blue-800"
                                  : menuScope === "employee"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {menuScope === "customer"
                                ? "Customer Only"
                                : menuScope === "employee"
                                ? "Employee Only"
                                : "Both"}
                            </span>
                          )}

                        </td>

                        {/* Today's Special Toggle (Menu Tab) */}

                        {activeTab === "menu" && (
                          <td className="px-5 py-4 text-center">

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMenuSetting(product, {
                                  is_todays_special: !product.is_todays_special,
                                });
                              }}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                product.is_todays_special
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  product.is_todays_special
                                    ? "fill-amber-500 text-amber-500"
                                    : ""
                                }`}
                              />
                              {product.is_todays_special ? "Special" : "Normal"}
                            </button>

                          </td>
                        )}

                        {/* Available Today Switch */}

                        <td className="px-5 py-4 text-center">

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMenuSetting(product, {
                                is_available: !product.is_available,
                              });
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                              product.is_available
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                          >

                            <span
                              className={`h-2 w-2 rounded-full ${
                                product.is_available
                                  ? "bg-emerald-500"
                                  : "bg-red-500"
                              }`}
                            />

                            {product.is_available ? "Available" : "Sold Out"}

                          </button>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ======================================================
          CREATE PRODUCT MODAL
      ====================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-3 sm:p-6 backdrop-blur-sm flex justify-center items-start sm:items-center">

          <div className="relative my-4 sm:my-auto max-h-[86vh] w-full max-w-2xl flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

            {/* Modal Header */}

            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  Add Product
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create a food, drink, or bar product.
                </p>

              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* Form */}

            <form
              onSubmit={handleCreateProduct}
              className="flex-1 space-y-5 overflow-y-auto p-6"
            >

              {/* ======================================================
                  TARGET MENU / VENUE SELECTOR (Restaurant, Bar, Cafe)
              ====================================================== */}
              <div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Target Menu / Operational Venue *
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Select where this item is served
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const kitOutlet = outlets.find(o => o.code === "RESTAURANT_KITCHEN" || o.type === "kitchen");
                      setForm(prev => ({
                        ...prev,
                        venue: "restaurant",
                        preparationOutletId: kitOutlet ? String(kitOutlet.id) : prev.preparationOutletId,
                        unit: ["bottle", "shot", "glass"].includes(prev.unit) ? "plate" : prev.unit,
                        isShotItem: false,
                      }));
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition text-center cursor-pointer ${
                      form.venue === "restaurant"
                        ? "border-amber-500 bg-amber-50 text-amber-950 font-black shadow-xs ring-2 ring-amber-400/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-2xl mb-1">🍽️</span>
                    <span className="text-xs font-bold">Restaurant Menu</span>
                    <span className="text-[10px] text-slate-500 font-normal">Food, Grills & Dishes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const barOutlet = outlets.find(o => o.code === "BAR" || o.type === "bar");
                      setForm(prev => ({
                        ...prev,
                        venue: "bar",
                        preparationOutletId: barOutlet ? String(barOutlet.id) : prev.preparationOutletId,
                        unit: prev.unit === "plate" ? "bottle" : prev.unit,
                        isShotItem: true,
                      }));
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition text-center cursor-pointer ${
                      form.venue === "bar"
                        ? "border-purple-600 bg-purple-50 text-purple-950 font-black shadow-xs ring-2 ring-purple-400/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-2xl mb-1">🍸</span>
                    <span className="text-xs font-bold">Bar Menu</span>
                    <span className="text-[10px] text-slate-500 font-normal">Liquor, Beers & Drinks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cafeOutlet = outlets.find(o => o.code === "CAFE_KITCHEN" || o.code === "CAFE");
                      setForm(prev => ({
                        ...prev,
                        venue: "cafe",
                        preparationOutletId: cafeOutlet ? String(cafeOutlet.id) : prev.preparationOutletId,
                        unit: ["plate", "bottle"].includes(prev.unit) ? "cup" : prev.unit,
                        isShotItem: false,
                      }));
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition text-center cursor-pointer ${
                      form.venue === "cafe"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-400/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-2xl mb-1">☕</span>
                    <span className="text-xs font-bold">Cafe Menu</span>
                    <span className="text-[10px] text-slate-500 font-normal">Coffee, Teas & Pastries</span>
                  </button>
                </div>

                {/* TICKET ROUTING STATION */}
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <label className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wide">
                      Order Routing / Preparation Station
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Where should this ticket print/display when ordered at POS?
                    </span>
                  </div>
                  <select
                    name="preparationOutletId"
                    value={form.preparationOutletId}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="">-- Automatic Routing by Category --</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code === "RESTAURANT_KITCHEN"
                          ? "🍳 Restaurant Kitchen (KDS Display)"
                          : o.code === "BAR"
                          ? "🍸 Main Bar Counter (Display & Drinks Ticket)"
                          : o.code === "CAFE_KITCHEN"
                          ? "☕ Cafe Kitchen / Bakery Station"
                          : o.code === "CAFE"
                          ? "☕ Cafe Service Counter"
                          : o.code === "RESTAURANT"
                          ? "🍽️ Restaurant Service Station"
                          : o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Name + Code */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Product Name *">

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Classic Burger"
                    required
                    className={inputClass}
                  />

                </FormField>

                <FormField label="Product Code">

                  <input
                    name="productCode"
                    value={form.productCode}
                    onChange={handleChange}
                    placeholder="e.g. FD-001"
                    className={inputClass}
                  />

                </FormField>

              </div>

              {/* Category + Unit */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Category">

                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    className={inputClass}
                  >

                    <option value="">
                      -- Select category --
                    </option>

                    <optgroup label="🍽️ Restaurant & Kitchen Categories">
                      {categories.filter(c => (c.type || '').toLowerCase() === 'food').map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="🍸 Bar & Liquor Categories">
                      {categories.filter(c => ['liquor', 'bar'].includes((c.type || '').toLowerCase()) || c.name.toLowerCase().includes('beer') || c.name.toLowerCase().includes('wine') || c.name.toLowerCase().includes('spirit')).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="☕ Cafe & Beverage Categories">
                      {categories.filter(c => (c.type || '').toLowerCase() === 'beverage' && !c.name.toLowerCase().includes('beer') && !c.name.toLowerCase().includes('wine')).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>

                    {categories.some(c => !['food', 'liquor', 'bar', 'beverage'].includes((c.type || '').toLowerCase())) && (
                      <optgroup label="📦 General Categories">
                        {categories.filter(c => !['food', 'liquor', 'bar', 'beverage'].includes((c.type || '').toLowerCase())).map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </optgroup>
                    )}

                  </select>

                </FormField>

                <FormField label="Portion / Unit">

                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <optgroup label="🍽️ Food & Kitchen Servings">
                      <option value="plate">Plate (Main dishes / Food meals)</option>
                      <option value="portion">Portion (Salads / Appetizers / Sides)</option>
                      <option value="bowl">Bowl (Soups / Stews)</option>
                      <option value="pcs">Pieces / pcs (Burgers / Sambusa / Shisha)</option>
                    </optgroup>

                    <optgroup label="🍸 Bar & Beverage Servings">
                      <option value="bottle">Full Bottle (Liquor / Wine / Beer)</option>
                      <option value="half_bottle">Half Bottle</option>
                      <option value="glass">Glass (Cocktails / Wine)</option>
                      <option value="shot">Shot Glass (Spirits / Liquor)</option>
                      <option value="can">Can (Soft Drinks / Canned Beer)</option>
                      <option value="cup">Cup (Coffee / Tea)</option>
                    </optgroup>

                    <optgroup label="⚖️ Volume & Bulk Weight">
                      <option value="liter">Liter (l)</option>
                      <option value="kg">Kilogram (kg)</option>
                    </optgroup>
                  </select>

                </FormField>

              </div>

              {/* Prices with Live VAT Auto-Calculation */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Base Price (Excl. VAT)">

                  <input
                    type="number"
                    value={basePriceInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBasePriceInput(val);
                      if (val !== "" && !isNaN(Number(val))) {
                        const finalWithVat = (Number(val) * 1.15).toFixed(2);
                        setForm((prev) => ({ ...prev, price: finalWithVat }));
                      } else {
                        setForm((prev) => ({ ...prev, price: "" }));
                      }
                    }}
                    placeholder="1000"
                    min="0"
                    step="0.01"
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Net price before 15% VAT (e.g. 1,000)
                  </p>

                </FormField>

                <FormField label="Final Customer Price (Incl. 15% VAT) *">

                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    readOnly
                    disabled
                    placeholder="Auto-calculated (e.g. 1,150)"
                    className={`${inputClass} bg-slate-100 font-semibold text-slate-700 cursor-not-allowed`}
                  />
                  <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                    Auto-calculated with 15% VAT for POS & Receipts
                  </p>

                </FormField>

              </div>

              {/* VAT Live Preview Card */}
              {Number(form.price) > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 shadow-sm">
                  <p className="font-bold text-emerald-900 text-xs mb-1.5 flex items-center gap-1.5">
                    ✨ Live VAT & Price Breakdown (15% Ethiopian VAT)
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Base Net Price (Excl. VAT):</span>
                      <span className="font-mono font-medium">{(Number(form.price) / 1.15).toFixed(2)} ETB</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>+ 15% VAT Amount:</span>
                      <span className="font-mono font-medium">+{(Number(form.price) - Number(form.price) / 1.15).toFixed(2)} ETB</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-1.5 font-bold text-emerald-950 text-sm">
                      <span>Final Selling Price (Saved on POS):</span>
                      <span className="font-mono text-emerald-700">{Number(form.price).toFixed(2)} ETB</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Staff Price (ETB)">

                  <input
                    type="number"
                    name="staffPrice"
                    value={form.staffPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={inputClass}
                  />

                </FormField>

              </div>

              {/* Menu Scope & Today's Special */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Menu Assignment">

                  <select
                    name="menuType"
                    value={form.menuType || "both"}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="both">
                      Both (Customers & Employees)
                    </option>
                    <option value="customer">
                      Customer Only
                    </option>
                    <option value="employee">
                      Employee / Staff Only
                    </option>
                  </select>

                </FormField>

                <div className="flex items-end">

                  <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-3">

                    <div className="flex items-center gap-2">

                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />

                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Today's Special
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Highlight in POS & Menu
                        </p>
                      </div>

                    </div>

                    <input
                      type="checkbox"
                      name="isTodaysSpecial"
                      checked={form.isTodaysSpecial}
                      onChange={handleChange}
                      className="h-4 w-4 accent-amber-500"
                    />

                  </label>

                </div>

              </div>

              {/* Spirit & Liquor Portion Configuration (Only shown for beverage/spirits or if enabled) */}
              {(() => {
                const selectedCat = categories.find((c) => String(c.id) === String(form.categoryId));
                const catType = (selectedCat?.type || selectedCat?.name || "").toLowerCase();
                const isFoodCategory = catType.includes("food") || catType.includes("kitchen");
                if (isFoodCategory && !form.isShotItem) return null;

                return (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wine className="h-5 w-5 text-purple-600" />
                        <div>
                          <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                            Spirit / Liquor Shot & Bottle Setup
                          </h4>
                          <p className="text-[11px] text-purple-700">
                            Configure custom shots per bottle (Single/Double Shot, Half & Full Bottle)
                          </p>
                        </div>
                      </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">
                      Enable Portion Items
                    </span>
                    <input
                      type="checkbox"
                      name="isShotItem"
                      checked={form.isShotItem}
                      onChange={handleChange}
                      className="h-4 w-4 rounded-sm accent-purple-600 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="space-y-3 pt-2 border-t border-purple-200/60">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Custom Shots Per Bottle Capacity *">
                      <input
                        type="number"
                        name="shotsCapacity"
                        value={form.shotsCapacity ?? ""}
                        onChange={handleChange}
                        placeholder="e.g. 25, 30, 40"
                        min="1"
                        step="1"
                        className="w-full rounded-xl border border-purple-300 bg-white px-3.5 py-2.5 text-sm font-extrabold text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 shadow-xs"
                      />
                    </FormField>

                    <div className="flex items-center">
                      <p className="text-xs text-slate-600 font-semibold italic">
                        Type total shots inside 1 full bottle (e.g. 25 for 750ml, 40 for 1L).
                      </p>
                    </div>
                  </div>

                  {/* LIVE PORTION PRICE CALCULATOR PREVIEW */}
                  {Number(form.price) > 0 && Number(form.shotsCapacity || 30) > 0 && (
                    <div className="rounded-xl bg-white p-3 border border-purple-200 text-xs space-y-2 shadow-xs">
                      <p className="font-extrabold text-purple-900 uppercase text-[10px] tracking-wider">
                        Live Calculated Portion Prices (Custom {form.shotsCapacity || 30} Shots Bottle):
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-bold text-slate-800">
                        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">Single Shot</span>
                          <span className="text-purple-700">{Number(form.price).toFixed(2)} ETB</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">Double Shot (2x)</span>
                          <span className="text-purple-700">{(Number(form.price) * 2).toFixed(2)} ETB</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">Half Bottle ({Math.round(Number(form.shotsCapacity || 30) / 2)} Shots)</span>
                          <span className="text-purple-700">{(Number(form.price) * Math.round(Number(form.shotsCapacity || 30) / 2)).toFixed(2)} ETB</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">Full Bottle ({form.shotsCapacity || 30} Shots)</span>
                          <span className="text-purple-700">{(Number(form.price) * Number(form.shotsCapacity || 30)).toFixed(2)} ETB</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

              {/* Description */}

              <FormField label="Description">

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the product..."
                  rows="3"
                  className={inputClass}
                />

              </FormField>

              {/* Image Upload & URL */}

              <FormField label="Product Image (Upload from Local Storage or Paste URL)">

                <div className="space-y-3">

                  {/* Image Preview Thumbnail */}

                  {imagePreview ? (
                    <div className="relative flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">

                      <img
                        src={formatImageUrl(imagePreview)}
                        alt="Product Preview"
                        className="h-16 w-16 rounded-lg object-cover shadow-sm"
                      />

                      <div className="flex-1 min-w-0">

                        <p className="truncate text-xs font-semibold text-slate-800">
                          {imageFile ? imageFile.name : "Uploaded Image"}
                        </p>

                        <p className="text-[11px] text-slate-500">
                          {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : "Image attached"}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Remove Image"
                      >
                        <X className="h-4 w-4" />
                      </button>

                    </div>
                  ) : null}

                  {/* File Input Upload Button */}

                  <div className="relative">

                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 transition hover:border-blue-500 hover:bg-blue-50/30">

                      <Upload className="h-4 w-4 text-blue-600" />

                      <span className="text-xs font-semibold text-slate-700">
                        {imageFile ? "Change Image File" : "Choose Image from Computer / Gallery"}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                    </label>

                  </div>

                  {/* Optional Image URL Input */}

                  <div className="relative">

                    <input
                      name="imageUrl"
                      value={form.imageUrl}
                      onChange={(e) => {
                        handleChange(e);
                        if (e.target.value) {
                          setImagePreview(e.target.value);
                        }
                      }}
                      placeholder="Or paste image URL (https://...)"
                      className={inputClass}
                    />

                  </div>

                </div>

              </FormField>

              {/* Toggles */}

              <div className="grid gap-3 sm:grid-cols-2">

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">

                  <div>

                    <p className="text-sm font-semibold text-slate-800">
                      Available
                    </p>

                    <p className="text-xs text-slate-400">
                      Can be ordered from POS
                    </p>

                  </div>

                  <input
                    type="checkbox"
                    name="isAvailable"
                    checked={form.isAvailable}
                    onChange={handleChange}
                    className="h-4 w-4 accent-blue-600"
                  />

                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">

                  <div>

                    <p className="text-sm font-semibold text-slate-800">
                      Active
                    </p>

                    <p className="text-xs text-slate-400">
                      Product exists in the system
                    </p>

                  </div>

                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 accent-blue-600"
                  />

                </label>

              </div>

              {/* Buttons */}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {saving
                    ? "Creating..."
                    : "Create Product"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>

      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}


// ============================================================
// FORM FIELD
// ============================================================

function FormField({
  label,
  children,
}) {
  return (
    <div className="space-y-1.5">

      <label className="text-xs font-semibold text-slate-700">
        {label}
      </label>

      {children}

    </div>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10";


export default ProductsPage;