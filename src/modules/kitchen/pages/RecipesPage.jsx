import { useState, useEffect, useMemo } from "react";
import {
  Utensils,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  Percent,
  Layers,
  Edit2,
  Trash2,
  AlertCircle,
  Eye,
  DollarSign
} from "lucide-react";
import api from "../../../services/api";
import RecipeModal from "../components/RecipeModal";

function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api("/recipes");
      const list = res.data || (Array.isArray(res) ? res : []);
      setRecipes(list);
    } catch (err) {
      console.error("Failed to fetch recipes:", err);
      setError(err.message || "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleCreateNew = () => {
    setSelectedRecipe(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (recipe) => {
    try {
      // Fetch full recipe details with ingredient rows
      const res = await api(`/recipes/${recipe.id}`);
      setSelectedRecipe(res.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to load recipe details:", err);
      setError("Failed to open recipe details");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the recipe for "${name}"?`)) {
      return;
    }
    try {
      await api(`/recipes/${id}`, { method: "DELETE" });
      fetchRecipes();
    } catch (err) {
      console.error("Failed to delete recipe:", err);
      alert(err.message || "Failed to delete recipe");
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = recipes.length;
    let sumFoodCostPct = 0;
    let profitableCount = 0;
    let highCostCount = 0;

    recipes.forEach((r) => {
      const pct = Number(r.food_cost_percentage || 0);
      sumFoodCostPct += pct;
      if (pct <= 32) profitableCount++;
      if (pct > 40) highCostCount++;
    });

    const avgFoodCost = total > 0 ? (sumFoodCostPct / total).toFixed(1) : "0.0";

    return {
      total,
      avgFoodCost,
      profitableCount,
      highCostCount
    };
  }, [recipes]);

  // Filtered List
  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.product_name && r.product_name.toLowerCase().includes(q)) ||
        (r.category_name && r.category_name.toLowerCase().includes(q))
    );
  }, [recipes, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            F&B Recipes & Menu Costing (BOM)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage bill of materials, raw ingredient yields, and live portion margins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-md hover:bg-amber-400 transition"
          >
            <Plus className="h-4 w-4" />
            Create Recipe (BOM)
          </button>

          <button
            onClick={fetchRecipes}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Total Recipes</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Utensils className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.total}</p>
          <p className="text-xs text-slate-500 mt-1">Configured menu dishes</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Avg Food Cost</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-600">{metrics.avgFoodCost}%</p>
          <p className="text-xs text-slate-500 mt-1">Ideal target: 28% - 35%</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">High Margin Dishes</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600">{metrics.profitableCount}</p>
          <p className="text-xs text-slate-500 mt-1">Food cost &lt; 32%</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Cost Warnings</span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600">{metrics.highCostCount}</p>
          <p className="text-xs text-slate-500 mt-1">Food cost &gt; 40% threshold</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Search Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes, menu dishes or categories..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <span className="text-xs font-bold text-slate-400">
            Showing {filteredRecipes.length} of {recipes.length} recipes
          </span>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-400">
            Loading recipe specifications...
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-400">
            No recipes found. Click "Create Recipe (BOM)" to link your first menu dish to raw store ingredients.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Menu Dish</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Ingredients</th>
                  <th className="px-5 py-3.5 text-right">Yield</th>
                  <th className="px-5 py-3.5 text-right">Portion Cost</th>
                  <th className="px-5 py-3.5 text-right">Selling Price</th>
                  <th className="px-5 py-3.5 text-right">Margin</th>
                  <th className="px-5 py-3.5 text-center">Food Cost %</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecipes.map((recipe) => {
                  const portionCost = Number(recipe.cost_per_portion || 0);
                  const price = Number(recipe.selling_price || 0);
                  const margin = price - portionCost;
                  const pct = Number(recipe.food_cost_percentage || 0);

                  return (
                    <tr key={recipe.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{recipe.name}</p>
                          <p className="text-xs text-slate-400">
                            {recipe.product_name} ({recipe.product_code || "SKU"})
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {recipe.category_name || "General"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                          <Layers className="h-3.5 w-3.5 text-amber-500" />
                          {recipe.ingredient_count} raw items
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-700">
                        {recipe.yield_quantity} portion
                      </td>

                      <td className="px-5 py-4 text-right font-black text-slate-900">
                        {portionCost.toFixed(2)} ETB
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-slate-700">
                        {price.toFixed(2)} ETB
                      </td>

                      <td className="px-5 py-4 text-right font-black text-emerald-600">
                        +{margin.toFixed(2)} ETB
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-black border ${
                            pct <= 30
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : pct <= 40
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(recipe)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                            title="Edit Recipe"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(recipe.id, recipe.name)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Delete Recipe"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recipe Modal */}
      <RecipeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRecipes}
        initialRecipe={selectedRecipe}
      />
    </div>
  );
}

export default RecipesPage;
