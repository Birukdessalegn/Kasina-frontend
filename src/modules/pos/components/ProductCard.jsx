function ProductCard({ product, onAdd, quantityInOrder = 0 }) {
  const isSelected = quantityInOrder > 0;

  const rawImage = product.image_url || product.imageUrl || product.image;
  const isImageSrc =
    typeof rawImage === "string" &&
    (rawImage.startsWith("/") ||
      rawImage.startsWith("http://") ||
      rawImage.startsWith("https://") ||
      rawImage.startsWith("data:") ||
      rawImage.startsWith("blob:"));

  const getFullSrc = (url) => {
    if (!url) return "";
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    )
      return url;
    const baseUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <button
      onClick={() => onAdd && onAdd(product)}
      className={`group relative rounded-xl border p-2 sm:p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
        isSelected
          ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20"
          : "border-gray-200 bg-white hover:border-blue-400"
      }`}
    >
      {quantityInOrder > 0 && (
        <span className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white shadow-sm">
          {quantityInOrder}
        </span>
      )}

      <div className="flex h-16 sm:h-20 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-2xl">
        {isImageSrc ? (
          <img
            src={getFullSrc(rawImage)}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          product.image || "🍽️"
        )}
      </div>

      <div className="mt-1.5">
        <h3 className="text-xs font-bold text-gray-900 leading-tight line-clamp-1">
          {product.name}
        </h3>

        <p className="mt-0.5 text-[10px] text-gray-400 truncate">
          {product.category}
        </p>

        <p className="mt-1 text-xs font-black text-blue-600">
          {product.price.toLocaleString()} ETB
        </p>
      </div>
    </button>
  );
}

export default ProductCard;