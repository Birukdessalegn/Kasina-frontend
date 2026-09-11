import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import api from "../../../services/api";

export const isBarProduct = (product) => {
  if (!product) return false;
  const catName = (product.category_name || product.category || "").toLowerCase();
  const catType = (product.category_type || product.type || "").toLowerCase();
  const pName = (product.name || product.product_name || "").toLowerCase();
  const prepCode = (product.preparation_outlet_code || "").toLowerCase();
  const prepId = Number(product.preparation_outlet_id || 0);

  return (
    prepCode === "bar" ||
    prepId === 3 ||
    product.outlet_id === 3 ||
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
    pName.includes("vodka") ||
    pName.includes("gin") ||
    pName.includes("rum") ||
    pName.includes("tequila")
  );
};

export const isCafeProduct = (product) => {
  if (!product) return false;
  if (isBarProduct(product)) return false;

  const catName = (product.category_name || product.category || "").toLowerCase();
  const catType = (product.category_type || product.type || "").toLowerCase();
  const pName = (product.name || product.product_name || "").toLowerCase();
  const prepCode = (product.preparation_outlet_code || "").toLowerCase();
  const prepId = Number(product.preparation_outlet_id || 0);

  return (
    prepCode.includes("cafe") ||
    prepId === 2 ||
    prepId === 5 ||
    product.outlet_id === 2 ||
    product.outlet_id === 5 ||
    catType.includes("cafe") ||
    catName.includes("cafe") ||
    catName.includes("hot beverage") ||
    catName.includes("coffee") ||
    catName.includes("tea") ||
    catName.includes("juice") ||
    catName.includes("smoothie") ||
    catName.includes("bakery") ||
    catName.includes("pastry") ||
    catName.includes("croissant") ||
    catName.includes("muffin") ||
    catName.includes("cake") ||
    catName.includes("dessert") ||
    catName.includes("toast") ||
    pName.includes("espresso") ||
    pName.includes("cappuccino") ||
    pName.includes("latte") ||
    pName.includes("macchiato") ||
    pName.includes("americano") ||
    pName.includes("croissant") ||
    pName.includes("muffin") ||
    pName.includes("danish") ||
    pName.includes("cake") ||
    pName.includes("tea") ||
    pName.includes("smoothie")
  );
};

export const isFoodProduct = (product) => {
  if (!product) return false;
  if (isBarProduct(product)) return false;
  if (isCafeProduct(product)) return false;
  return true;
};

// Backwards compatibility alias
const isDrinkProduct = (product) => isBarProduct(product);

function ProductGrid({
  onAddProduct,
  activeCategory = "all",
  orderItems = [],
  searchTerm = "",
  isBartender = false,
  isCafeActor = false,
  venue = "all", // "all" | "restaurant" | "bar" | "cafe"
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const effectiveVenue =
    venue !== "all"
      ? venue
      : isCafeActor
      ? "cafe"
      : isBartender
      ? "bar"
      : "all";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api("/products");
        setProducts(response.products || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setError(error.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    // 1. Venue Level Restriction
    if (effectiveVenue === "cafe" && !isCafeProduct(product)) {
      return false;
    }
    if (effectiveVenue === "bar" && !isBarProduct(product)) {
      return false;
    }
    if (effectiveVenue === "restaurant" && !isFoodProduct(product)) {
      return false;
    }

    const catName = (product.category_name || product.category || "").toLowerCase();
    const catType = (product.category_type || product.type || "").toLowerCase();
    const pName = (product.name || product.product_name || "").toLowerCase();

    // 2. Category Matching
    let matchesCategory = false;
    if (activeCategory === "all") {
      matchesCategory = true;
    } 
    // Cafe Specific Categories
    else if (activeCategory === "coffee") {
      matchesCategory = isCafeProduct(product) && (catName.includes("coffee") || catName.includes("hot") || pName.includes("espresso") || pName.includes("cappuccino") || pName.includes("latte") || pName.includes("macchiato") || pName.includes("coffee"));
    } else if (activeCategory === "tea") {
      matchesCategory = isCafeProduct(product) && (catName.includes("tea") || pName.includes("tea") || pName.includes("chai"));
    } else if (activeCategory === "bakery") {
      matchesCategory = isCafeProduct(product) && (catName.includes("bakery") || catName.includes("pastry") || pName.includes("croissant") || pName.includes("muffin") || pName.includes("bread") || pName.includes("danish"));
    } else if (activeCategory === "juices") {
      matchesCategory = isCafeProduct(product) && (catName.includes("juice") || catName.includes("smoothie") || pName.includes("juice") || pName.includes("smoothie"));
    } else if (activeCategory === "cafe_desserts" || (effectiveVenue === "cafe" && activeCategory === "desserts")) {
      matchesCategory = isCafeProduct(product) && (catName.includes("dessert") || catName.includes("cake") || pName.includes("cake") || pName.includes("pie"));
    } else if (activeCategory === "breakfast") {
      matchesCategory = isCafeProduct(product) && (catName.includes("breakfast") || catName.includes("sandwich") || pName.includes("toast") || pName.includes("sandwich") || pName.includes("egg"));
    }
    // Restaurant Specific Categories
    else if (activeCategory === "food") {
      matchesCategory = isFoodProduct(product);
    } else if (activeCategory === "mains") {
      matchesCategory = isFoodProduct(product) && (catName.includes("main") || catName.includes("grill") || catName.includes("meat") || catName.includes("steak") || pName.includes("steak") || pName.includes("grill") || pName.includes("fish") || pName.includes("chicken"));
    } else if (activeCategory === "traditional") {
      matchesCategory = isFoodProduct(product) && (catName.includes("traditional") || catName.includes("ethiopian") || pName.includes("tibs") || pName.includes("kitfo") || pName.includes("doro") || pName.includes("shiro") || pName.includes("beyaynetu") || pName.includes("firfir"));
    } else if (activeCategory === "fastfood") {
      matchesCategory = isFoodProduct(product) && (catName.includes("fast") || catName.includes("pizza") || catName.includes("burger") || pName.includes("pizza") || pName.includes("burger") || pName.includes("sandwich") || pName.includes("fries"));
    } else if (activeCategory === "salads") {
      matchesCategory = isFoodProduct(product) && (catName.includes("salad") || catName.includes("soup") || catName.includes("starter") || pName.includes("salad") || pName.includes("soup"));
    }
    // Bar Specific Categories
    else if (activeCategory === "drinks" || activeCategory === "bar") {
      matchesCategory = isBarProduct(product);
    } else if (activeCategory === "beers") {
      matchesCategory = isBarProduct(product) && (catName.includes("beer") || catName.includes("cider") || pName.includes("beer") || pName.includes("draught"));
    } else if (activeCategory === "liquors" || activeCategory === "spirits") {
      matchesCategory = isBarProduct(product) && (catType === "liquor" || catName.includes("spirit") || catName.includes("liquor") || catName.includes("whiskey") || catName.includes("vodka") || catName.includes("gin") || catName.includes("rum") || catName.includes("tequila"));
    } else if (activeCategory === "wines") {
      matchesCategory = isBarProduct(product) && (catName.includes("wine") || catName.includes("champagne") || pName.includes("wine"));
    } else if (activeCategory === "cocktails") {
      matchesCategory = isBarProduct(product) && (catName.includes("cocktail") || pName.includes("cocktail") || pName.includes("mojito"));
    } else if (activeCategory === "soft_drinks") {
      matchesCategory = (isBarProduct(product) || isFoodProduct(product)) && (catName.includes("soft") || catName.includes("juice") || catName.includes("water") || catName.includes("soda"));
    } else if (activeCategory === "hot_drinks") {
      matchesCategory = catName.includes("hot") || catName.includes("coffee") || catName.includes("tea") || pName.includes("espresso") || pName.includes("latte") || pName.includes("cappuccino");
    } else if (activeCategory === "cafe") {
      matchesCategory = isCafeProduct(product);
    } else {
      matchesCategory =
        catName === activeCategory.toLowerCase() ||
        catType === activeCategory.toLowerCase();
    }

    const matchesSearch = pName.includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-500">
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        {effectiveVenue === "cafe"
          ? "No cafe & bakery items available in this category."
          : effectiveVenue === "bar"
          ? "No bar drinks available in this category."
          : effectiveVenue === "restaurant"
          ? "No restaurant dishes available in this category."
          : "No products available in this category."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {filteredProducts.map((product) => {
        const orderItem = orderItems.find(
          (item) => item.id === product.id
        );

        const quantityInOrder = orderItem
          ? orderItem.quantity
          : 0;

        const isCafe = isCafeProduct(product);
        const isDrink = isBarProduct(product);
        const fallbackIcon = isCafe ? "☕" : isDrink ? "🍷" : "🍽️";

        const productForCard = {
          ...product,
          category:
            product.category_name || product.category_type,
          price: Number(product.price),
          image: product.image_url || fallbackIcon,
        };

        return (
          <ProductCard
            key={product.id}
            product={productForCard}
            onAdd={onAddProduct}
            quantityInOrder={quantityInOrder}
          />
        );
      })}
    </div>
  );
}

export default ProductGrid;