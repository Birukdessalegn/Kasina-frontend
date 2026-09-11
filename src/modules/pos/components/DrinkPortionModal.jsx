import { X } from "lucide-react";
import { formatImageUrl, getCustomShotsMap } from "../../products/ProductsPage";

function DrinkPortionModal({ product, onClose, onSelectPortion }) {
  if (!product) return null;

  const localMap = getCustomShotsMap();
  const localData = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];
  const basePrice = Number(product.unit_price || product.price || 0);
  const totalShots = Number(
    product.shots_capacity ||
    product.shotsCapacity ||
    product.bottle_shots ||
    localData?.shots ||
    30
  );
  const halfShots = Math.max(1, Math.round(totalShots / 2));

  const rawImage =
    product.image_url ||
    product.imageUrl ||
    product.image ||
    product.photo ||
    product.picture ||
    product.image_path ||
    product.product_image;
  const imageUrl = formatImageUrl(rawImage);

  const options = [
    {
      id: "single",
      title: "Single Shot",
      icon: "🥃",
      shots: 1,
      price: basePrice,
      badge: "1 Shot",
      description: "Standard 1x Shot Portion",
    },
    {
      id: "double",
      title: "Double Shot",
      icon: "🥃🥃",
      shots: 2,
      price: basePrice * 2,
      badge: "2 Shots",
      description: "Double 2x Shot Portion",
    },
    {
      id: "half_bottle",
      title: "Half Bottle",
      icon: "🍾",
      shots: halfShots,
      price: basePrice * halfShots,
      badge: `${halfShots} Shots`,
      description: `Half Bottle (${halfShots} Shots)`,
    },
    {
      id: "full_bottle",
      title: "Full Bottle",
      icon: "🍾🍾",
      shots: totalShots,
      price: basePrice * totalShots,
      badge: `${totalShots} Shots (1 Full Bottle)`,
      description: `Complete Full Bottle (${totalShots} Shots)`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start sm:items-center animate-in fade-in duration-200">
      <div className="w-full max-w-md my-4 sm:my-auto max-h-[86vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 sm:px-5 sm:py-3.5 bg-slate-50/50">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-xl object-cover border border-slate-200 shadow-2xs"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 border border-purple-200 text-base sm:text-lg font-bold">
                🥃
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {product.name}
              </h2>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">
                Portion size • {totalShots} Shots/Bottle
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* PORTION OPTIONS GRID (Scrollable if screen is very short) */}
        <div className="p-3 sm:p-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectPortion(opt)}
                className="group relative flex flex-col justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3.5 text-left transition-all hover:border-purple-500 hover:bg-purple-50/50 hover:shadow-sm active:scale-95"
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-lg sm:text-xl leading-none">{opt.icon}</span>
                  <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black text-purple-700 border border-purple-200 whitespace-nowrap">
                    {opt.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm group-hover:text-purple-700 transition truncate">
                    {opt.title}
                  </h3>
                  <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Total</span>
                  <span className="text-xs sm:text-sm font-black text-purple-700">
                    {opt.price.toLocaleString()} ETB
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex justify-end px-3.5 py-2 sm:px-4 sm:py-2.5 border-t border-slate-100 bg-slate-50/30">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition shadow-2xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default DrinkPortionModal;
