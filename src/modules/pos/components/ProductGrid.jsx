import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import api from "../../../services/api";

const isFoodProduct = (product) => {
  const catName = (product.category_name || product.category || "").toLowerCase();
  const catType = (product.category_type || product.type || "").toLowerCase();
  const menuType = (product.menu_type || product.menuType || "").toLowerCase();
  const unit = (product.unit || "").toLowerCase();

  return (
    catType === "food" ||
    menuType === "food" ||
    catName.includes("food") ||
    catName.includes("dish") ||
    catName.includes("grill") ||
    catName.includes("kitchen") ||
    catName.includes("traditional") ||
    catName.includes("breakfast") ||
    catName.includes("lunch") ||
    catName.includes("dinner") ||
    catName.includes("burger") ||
    catName.includes("pizza") ||
    catName.includes("sandwich") ||
    catName.includes("salad") ||
    catName.includes("soup") ||
    ["plate", "portion", "pcs", "order", "bowl", "slice", "serving"].includes(unit)
  );
};

const isDrinkProduct = (product) => {
  if (isFoodProduct(product)) return false;
  const catName = (product.category_name || product.category || "").toLowerCase();
  const catType = (product.category_type || product.type || "").toLowerCase();
  const menuType = (product.menu_type || product.menuType || "").toLowerCase();
  const pName = (product.product_name || product.name || "").toLowerCase();

  return (
    catType === "beverage" ||
    catType === "liquor" ||
    catType === "bar" ||
    menuType === "drink" ||
    catName.includes("beverage") ||
    catName.includes("drink") ||
    catName.includes("beer") ||
    catName.includes("liquor") ||
    catName.includes("spirit") ||
    catName.includes("wine") ||
    catName.includes("whiskey") ||
    catName.includes("water") ||
    catName.includes("juice") ||
    catName.includes("soda") ||
    catName.includes("coffee") ||
    catName.includes("tea") ||
    pName.includes("beer") ||
    pName.includes("wine") ||
    pName.includes("whiskey") ||
    pName.includes("vodka") ||
    pName.includes("gin") ||
    pName.includes("water") ||
    pName.includes("coca") ||
    pName.includes("sprite")
  );
};

function ProductGrid({
  onAddProduct,
  activeCategory = "all",
  orderItems = [],
  searchTerm = "",
  isBartender = false,
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api("/products");

        setProducts(response.products || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setError(
          error.message || "Failed to load products"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    // 1. If user is Bartender (or in Bar view), strictly show ONLY drinks!
    if (isBartender && !isDrinkProduct(product)) {
      return false;
    }

    const catName = (product.category_name || product.category || "").toLowerCase();
    const catType = (product.category_type || product.type || "").toLowerCase();
    const pName = (product.name || product.product_name || "").toLowerCase();

    // 2. Category Matching
    let matchesCategory = false;
    if (activeCategory === "all") {
      matchesCategory = true;
    } else if (activeCategory === "food") {
      matchesCategory = isFoodProduct(product);
    } else if (activeCategory === "drinks" || activeCategory === "bar") {
      matchesCategory = isDrinkProduct(product);
    } else if (activeCategory === "beers") {
      matchesCategory = isDrinkProduct(product) && (catName.includes("beer") || catName.includes("cider") || pName.includes("beer") || pName.includes("draught"));
    } else if (activeCategory === "liquors" || activeCategory === "spirits") {
      matchesCategory = isDrinkProduct(product) && (catType === "liquor" || catName.includes("spirit") || catName.includes("liquor") || catName.includes("whiskey") || catName.includes("vodka") || catName.includes("gin") || catName.includes("rum") || catName.includes("tequila"));
    } else if (activeCategory === "wines") {
      matchesCategory = isDrinkProduct(product) && (catName.includes("wine") || catName.includes("champagne") || pName.includes("wine"));
    } else if (activeCategory === "soft_drinks") {
      matchesCategory = isDrinkProduct(product) && (catName.includes("soft") || catName.includes("juice") || catName.includes("water") || catName.includes("soda"));
    } else if (activeCategory === "hot_drinks") {
      matchesCategory = isDrinkProduct(product) && (catName.includes("hot") || catName.includes("coffee") || catName.includes("tea") || pName.includes("espresso") || pName.includes("latte") || pName.includes("cappuccino"));
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
        {isBartender ? "No bar drinks available in this category." : "No products available."}
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

        const isDrink = isDrinkProduct(product);

        const productForCard = {
          ...product,
          category:
            product.category_name || product.category_type,
          price: Number(product.price),
          image: product.image_url || (isDrink ? "🍷" : "🍽️"),
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