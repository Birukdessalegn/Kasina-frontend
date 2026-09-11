import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Utensils, AlertCircle, Save, DollarSign } from "lucide-react";
import api from "../../../services/api";

function RecipeModal({ isOpen, onClose, onSuccess, initialRecipe = null }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

    const selectedMenuProd = products.find((p) => p.id === Number(formData.productId));
    const sellingPrice = selectedMenuProd ? Number(selectedMenuProd.price || 0) : 0;
    const margin = sellingPrice - portionCost;
    const foodCostPct = sellingPrice > 0 ? (portionCost / sellingPrice) * 100 : 0;

    return {
      totalBatchCost: Number(total.toFixed(2)),
      portionCost: Number(portionCost.toFixed(2)),
      sellingPrice,
      margin: Number(margin.toFixed(2)),
      foodCostPct: Number(foodCostPct.toFixed(1))
    };
  }, [formData.ingredients, formData.yieldQuantity, formData.productId, products]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.productId) {
      setError("Please select the target menu item for this recipe");
      return;
    }
    if (!formData.name.trim()) {
      setError("Please provide a recipe name");
      return;
    }
    if (formData.ingredients.length === 0) {
      setError("Please add at least one ingredient");
      return;
    }

    try {
      setSubmitting(true);
      if (initialRecipe) {
        await api(`/recipes/${initialRecipe.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formData.name,
            yieldQuantity: Number(formData.yieldQuantity),
            preparationNotes: formData.preparationNotes,
            ingredients: formData.ingredients
          })
        });
      } else {
        await api("/recipes", {
          method: "POST",
          body: JSON.stringify({
            productId: Number(formData.productId),
            name: formData.name,
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Menu Item *
              </label>
              <select
                disabled={!!initialRecipe || loadingProducts}
                value={formData.productId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition"
                required
              >
                <option value="">-- Select Dish --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price} ETB)
                  </option>
                ))}
              </select>
            </div>

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

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800">
                Ingredients & Quantities (BOM)
              </h3>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Ingredient
              </button>
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
      </div>
    </div>
  );
}

export default RecipeModal;
