import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Utensils, AlertCircle, Save, DollarSign } from "lucide-react";
import api from "../../../services/api";

function RecipeModal({ isOpen, onClose, onSuccess, initialRecipe = null }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Quick-Add Dish State
  const [isQuickAddDish, setIsQuickAddDish] = useState(false);
  const [newDishData, setNewDishData] = useState({
    name: "",
    price: "",
    categoryId: "",
  });

  // Quick-Add Ingredient Modal/Drawer State
  const [showQuickAddIngredient, setShowQuickAddIngredient] = useState(false);
  const [quickAddIngTargetIdx, setQuickAddIngTargetIdx] = useState(null);
  const [quickAddIngLoading, setQuickAddIngLoading] = useState(false);
  const [quickAddIngError, setQuickAddIngError] = useState("");
  const [newIngredientData, setNewIngredientData] = useState({
    name: "",
    costPrice: "",
    unit: "kg",
    categoryId: "",
  });

  const [formData, setFormData] = useState({
    productId: "",
    name: "",
    yieldQuantity: 1,
    preparationNotes: "",
    ingredients: [
      { ingredientProductId: "", quantity: 1, unit: "pcs", notes: "" }
    ]
  });

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchCategories();
      setIsQuickAddDish(false);
      setNewDishData({ name: "", price: "", categoryId: "" });
      setShowQuickAddIngredient(false);
      setQuickAddIngError("");
      setNewIngredientData({ name: "", costPrice: "", unit: "kg", categoryId: "" });

      if (initialRecipe) {
        setFormData({
          productId: initialRecipe.product_id || "",
          name: initialRecipe.name || "",
          yieldQuantity: initialRecipe.yield_quantity || 1,
          preparationNotes: initialRecipe.preparation_notes || "",
          ingredients: (initialRecipe.ingredients || []).map((ing) => ({
            ingredientProductId: ing.ingredient_product_id,
            quantity: ing.quantity,
            unit: ing.unit || "pcs",
            notes: ing.notes || ""
          }))
        });
      } else {
        setFormData({
          productId: "",
          name: "",
          yieldQuantity: 1,
          preparationNotes: "",
          ingredients: [{ ingredientProductId: "", quantity: 1, unit: "pcs", notes: "" }]
        });
      }
      setError("");
    }
  }, [isOpen, initialRecipe]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await api("/products");
      const list = res.products || res.data || (Array.isArray(res) ? res : []);
      setProducts(list);
    } catch (err) {
      console.error("Failed to load products for recipe modal:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api("/products/categories");
      setCategories(res.categories || []);
    } catch (err) {
      console.warn("Failed to load categories for recipe modal:", err);
    }
  };

  const handleProductSelect = (prodId) => {
    const selected = products.find((p) => p.id === Number(prodId));
    setFormData((prev) => ({
      ...prev,
      productId: prodId,
      name: prev.name || (selected ? selected.name : "")
    }));
  };

  const handleAddIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { ingredientProductId: "", quantity: 1, unit: "pcs", notes: "" }
      ]
    }));
  };

  const handleRemoveIngredient = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    if (field === "ingredientProductId" && value === "__NEW_ING__") {
      setQuickAddIngTargetIdx(index);
      setShowQuickAddIngredient(true);
      return;
    }

    setFormData((prev) => {
      const updated = [...prev.ingredients];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-set unit if ingredient selected
      if (field === "ingredientProductId") {
        const ingProd = products.find((p) => p.id === Number(value));
        if (ingProd && ingProd.unit) {
          updated[index].unit = ingProd.unit;
        }
      }

      return { ...prev, ingredients: updated };
    });
  };

  // Quick-create an ingredient and assign it immediately
  const handleCreateQuickIngredient = async (e) => {
    e?.preventDefault();
    if (!newIngredientData.name.trim()) {
      setQuickAddIngError("Ingredient name is required");
      return;
    }
    const cost = parseFloat(newIngredientData.costPrice) || 0;

    try {
      setQuickAddIngLoading(true);
      setQuickAddIngError("");

      const payload = {
        name: newIngredientData.name.trim(),
        price: cost, // fallback price
        costPrice: cost,
        unit: newIngredientData.unit || "kg",
        categoryId: newIngredientData.categoryId ? Number(newIngredientData.categoryId) : null,
        isAvailable: true,
        isActive: true,
      };

      const res = await api("/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdProduct = res.product;
      if (!createdProduct) {
        throw new Error("Ingredient creation did not return product details");
      }

      // Add to local products state
      setProducts((prev) => [createdProduct, ...prev]);

      // Assign to the selected row
      if (quickAddIngTargetIdx !== null && formData.ingredients[quickAddIngTargetIdx]) {
        handleIngredientChange(quickAddIngTargetIdx, "ingredientProductId", createdProduct.id);
        handleIngredientChange(quickAddIngTargetIdx, "unit", createdProduct.unit || "kg");
      } else {
        // Append as new line item
        setFormData((prev) => ({
          ...prev,
          ingredients: [
            ...prev.ingredients,
            {
              ingredientProductId: createdProduct.id,
              quantity: 1,
              unit: createdProduct.unit || "kg",
              notes: "",
            },
          ],
        }));
      }

      // Close quick add
      setShowQuickAddIngredient(false);
      setNewIngredientData({ name: "", costPrice: "", unit: "kg", categoryId: "" });
      setQuickAddIngTargetIdx(null);
    } catch (err) {
      console.error("Failed to create quick ingredient:", err);
      setQuickAddIngError(err.message || "Failed to create ingredient");
    } finally {
      setQuickAddIngLoading(false);
    }
  };

  // Live Cost Calculations
  const calculatedCost = useMemo(() => {
    let total = 0;
    formData.ingredients.forEach((line) => {
      const prod = products.find((p) => p.id === Number(line.ingredientProductId));
      const unitCost = prod ? Number(prod.cost_price || prod.price || 0) : 0;
      const qty = Number(line.quantity || 0);
      total += qty * unitCost;
    });

    const yieldQty = Number(formData.yieldQuantity || 1);
    const portionCost = yieldQty > 0 ? total / yieldQty : 0;

    let sellingPrice = 0;
    if (isQuickAddDish) {
      sellingPrice = parseFloat(newDishData.price) || 0;
    } else {
      const selectedMenuProd = products.find((p) => p.id === Number(formData.productId));
      sellingPrice = selectedMenuProd ? Number(selectedMenuProd.price || 0) : 0;
    }

    const margin = sellingPrice - portionCost;
    const foodCostPct = sellingPrice > 0 ? (portionCost / sellingPrice) * 100 : 0;

    return {
      totalBatchCost: Number(total.toFixed(2)),
      portionCost: Number(portionCost.toFixed(2)),
      sellingPrice,
      margin: Number(margin.toFixed(2)),
      foodCostPct: Number(foodCostPct.toFixed(1))
    };
  }, [formData.ingredients, formData.yieldQuantity, formData.productId, products, isQuickAddDish, newDishData.price]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let targetProductId = formData.productId;
    let recipeName = formData.name;

    // If user is quick-adding a new dish
    if (isQuickAddDish && !initialRecipe) {
      if (!newDishData.name.trim()) {
        setError("Please enter the name for the new menu item/dish");
        return;
      }
      if (newDishData.price === "" || isNaN(Number(newDishData.price))) {
        setError("Please enter a valid selling price for the new dish");
        return;
      }

      recipeName = recipeName.trim() || newDishData.name.trim();
    } else {
      if (!formData.productId) {
        setError("Please select the target menu item for this recipe");
        return;
      }
      if (!formData.name.trim()) {
        setError("Please provide a recipe name");
        return;
      }
    }

    if (formData.ingredients.length === 0) {
      setError("Please add at least one ingredient");
      return;
    }

    const invalidIng = formData.ingredients.find(
      (ing) => !ing.ingredientProductId || !ing.quantity || Number(ing.quantity) <= 0
    );
    if (invalidIng) {
      setError("Please ensure all ingredients have an item selected and a quantity greater than 0");
      return;
    }

    try {
      setSubmitting(true);

      // Step 1: Create new dish if in quick-add mode
      if (isQuickAddDish && !initialRecipe) {
        const dishRes = await api("/products", {
          method: "POST",
          body: JSON.stringify({
            name: newDishData.name.trim(),
            price: Number(newDishData.price),
            costPrice: calculatedCost.portionCost, // automatically populate estimated portion cost
            categoryId: newDishData.categoryId ? Number(newDishData.categoryId) : null,
            unit: "portion",
            isAvailable: true,
            isActive: true,
          }),
        });

        if (!dishRes.product || !dishRes.product.id) {
          throw new Error("Could not create the new dish product");
        }
        targetProductId = dishRes.product.id;
        recipeName = recipeName || dishRes.product.name;
      }

      // Step 2: Create or update recipe
      if (initialRecipe) {
        await api(`/recipes/${initialRecipe.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: recipeName,
            yieldQuantity: Number(formData.yieldQuantity),
            preparationNotes: formData.preparationNotes,
            ingredients: formData.ingredients
          })
        });
      } else {
        await api("/recipes", {
          method: "POST",
          body: JSON.stringify({
            productId: Number(targetProductId),
            name: recipeName,
            yieldQuantity: Number(formData.yieldQuantity),
            preparationNotes: formData.preparationNotes,
            ingredients: formData.ingredients
          })
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save recipe:", err);
      setError(err.message || "Failed to save recipe");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 backdrop-blur-xs flex justify-center items-start sm:items-center">
      <div className="relative w-full max-w-3xl my-4 sm:my-auto max-h-[86vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {initialRecipe ? "Edit Recipe & BOM" : "Create Recipe & Bill of Materials"}
              </h2>
              <p className="text-xs text-slate-500">
                Configure raw ingredient ratios and track live portion food cost.
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Fields */}
          <div className="space-y-3">
            {/* Target Menu Item / Quick Add Toggle */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800">
                  {isQuickAddDish ? "Create New Menu Item (Dish)" : "Target Menu Item *"}
                </label>
                {!initialRecipe && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickAddDish(!isQuickAddDish);
                      if (!isQuickAddDish) {
                        setFormData((prev) => ({ ...prev, productId: "" }));
                      }
                    }}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isQuickAddDish ? "Choose Existing Product Instead" : "+ Quick-Add New Dish"}
                  </button>
                )}
              </div>

              {!isQuickAddDish ? (
                <div>
                  <select
                    disabled={!!initialRecipe || loadingProducts}
                    value={formData.productId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden transition"
                    required={!isQuickAddDish}
                  >
                    <option value="">-- Select Dish --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price} ETB)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Dish Name *
                    </label>
                    <input
                      type="text"
                      value={newDishData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDishData({ ...newDishData, name: val });
                        if (!formData.name || formData.name === newDishData.name) {
                          setFormData((prev) => ({ ...prev, name: val }));
                        }
                      }}
                      placeholder="e.g. Special Grilled Burger"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Selling Price (ETB) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newDishData.price}
                      onChange={(e) => setNewDishData({ ...newDishData, price: e.target.value })}
                      placeholder="e.g. 450"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Category
                    </label>
                    <select
                      value={newDishData.categoryId}
                      onChange={(e) => setNewDishData({ ...newDishData, categoryId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                    >
                      <option value="">General / Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Recipe Name & Portion Yield */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Classic Beef Burger"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Portion Yield *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.yieldQuantity}
                  onChange={(e) => setFormData({ ...formData, yieldQuantity: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800">
                Ingredients & Quantities (BOM)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddIngTargetIdx(null);
                    setShowQuickAddIngredient(true);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition"
                >
                  <Plus className="h-3 w-3" />
                  New Raw Ingredient
                </button>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {formData.ingredients.map((line, idx) => {
                const selectedProd = products.find((p) => p.id === Number(line.ingredientProductId));
                const unitCost = selectedProd ? Number(selectedProd.cost_price || selectedProd.price || 0) : 0;
                const subtotal = Number(line.quantity || 0) * unitCost;

                return (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                    {/* Item Select */}
                    <div className="flex-1">
                      <select
                        value={line.ingredientProductId}
                        onChange={(e) => handleIngredientChange(idx, "ingredientProductId", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                        required
                      >
                        <option value="">-- Pick Inventory Item --</option>
                        <option value="__NEW_ING__" className="font-bold text-amber-600">
                          ✨ + Quick-Add New Ingredient...
                        </option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Cost: {p.cost_price || p.price || 0} ETB/{p.unit || "unit"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-24">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={line.quantity}
                        onChange={(e) => handleIngredientChange(idx, "quantity", e.target.value)}
                        placeholder="Qty"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden text-right"
                        required
                      />
                    </div>

                    {/* Unit */}
                    <div className="w-20">
                      <input
                        type="text"
                        value={line.unit}
                        onChange={(e) => handleIngredientChange(idx, "unit", e.target.value)}
                        placeholder="Unit"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Calculated Line Cost */}
                    <div className="w-24 text-right">
                      <span className="text-xs font-black text-slate-700">
                        {subtotal.toFixed(2)} ETB
                      </span>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      disabled={formData.ingredients.length === 1}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preparation Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Preparation Notes / Chef Instructions
            </label>
            <textarea
              rows={2}
              value={formData.preparationNotes}
              onChange={(e) => setFormData({ ...formData, preparationNotes: e.target.value })}
              placeholder="e.g. Sear patty for 3 minutes on high heat, toast brioche bun..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition"
            />
          </div>

          {/* Live Costing Analysis Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-900 p-4 text-white">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total Batch Cost</p>
              <p className="text-base font-black text-white">{calculatedCost.totalBatchCost} ETB</p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-400">Portion Food Cost</p>
              <p className="text-base font-black text-amber-400">{calculatedCost.portionCost} ETB</p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-400">Menu Price & Margin</p>
              <p className="text-base font-black text-emerald-400">
                +{calculatedCost.margin} ETB
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-400">Food Cost %</p>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-black ${
                calculatedCost.foodCostPct <= 30
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : calculatedCost.foodCostPct <= 40
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}>
                {calculatedCost.foodCostPct}%
              </span>
            </div>
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
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md hover:bg-amber-400 disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving Recipe..." : "Save Recipe"}
            </button>
          </div>
        </form>

        {/* Quick Add Ingredient Popup Dialog */}
        {showQuickAddIngredient && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Quick-Add Raw Ingredient
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Creates an inventory item with cost tracking
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAddIngredient(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {quickAddIngError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{quickAddIngError}</span>
                </div>
              )}

              <form onSubmit={handleCreateQuickIngredient} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ingredient Name *
                  </label>
                  <input
                    type="text"
                    value={newIngredientData.name}
                    onChange={(e) =>
                      setNewIngredientData({ ...newIngredientData, name: e.target.value })
                    }
                    placeholder="e.g. Minced Beef / Olive Oil"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cost Price (ETB) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newIngredientData.costPrice}
                      onChange={(e) =>
                        setNewIngredientData({ ...newIngredientData, costPrice: e.target.value })
                      }
                      placeholder="e.g. 350.00"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Unit of Measure *
                    </label>
                    <select
                      value={newIngredientData.unit}
                      onChange={(e) =>
                        setNewIngredientData({ ...newIngredientData, unit: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden"
                    >
                      <option value="kg">kg (Kilogram)</option>
                      <option value="g">g (Gram)</option>
                      <option value="liters">liters (Liter)</option>
                      <option value="ml">ml (Milliliter)</option>
                      <option value="pcs">pcs (Piece/Count)</option>
                      <option value="pack">pack (Package)</option>
                      <option value="tbsp">tbsp (Tablespoon)</option>
                      <option value="tsp">tsp (Teaspoon)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category (Optional)
                  </label>
                  <select
                    value={newIngredientData.categoryId}
                    onChange={(e) =>
                      setNewIngredientData({ ...newIngredientData, categoryId: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="">General / Raw Materials</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickAddIngredient(false)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quickAddIngLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 disabled:opacity-50 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {quickAddIngLoading ? "Adding..." : "Add to Recipe"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeModal;
