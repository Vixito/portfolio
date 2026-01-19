import { useState, useEffect } from "react";
import Pagination from "../components/ui/Pagination";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { getProductsWithPricing } from "../lib/supabase-functions";
import { useTranslation, getTranslatedText } from "../lib/i18n";
import { escapeHtml } from "../lib/security";

interface ProductPricing {
  id: string;
  product_id: string;
  current_price_cop: number;
  current_price_usd: number;
  is_on_sale: boolean;
  sale_percentage: number | null;
  sale_price_cop: number | null;
  sale_price_usd: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
}

interface StoreItem {
  id: string;
  title: string;
  title_translations?: { es?: string; en?: string } | null;
  description: string | null;
  description_translations?: { es?: string; en?: string } | null;
  full_description: string | null;
  full_description_translations?: { es?: string; en?: string } | null;
  base_price_usd: number;
  base_price_cop: number | null;
  thumbnail_url: string | null;
  images: string[] | null;
  sector: string | null; // Categoría/Sector del producto
  // Nueva estructura de botones
  button_type?: "buy" | "request";
  buy_button_type?: "external_link" | "custom_checkout";
  buy_button_url?: string | Array<{ label: string; url: string }> | null; // Puede ser string (legacy), array de links, o null
  request_button_type?: "external_link" | "custom_form";
  request_button_url?: string | null;
  // Campos antiguos (mantener por compatibilidad durante migración)
  action_type?: "link" | "submit" | "schedule";
  action_url?: string | null;
  pricing_link?: string | null;
  button_text?: string | null;
  product_pricing?: ProductPricing[]; // Pricing del producto
}

function Store() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchName, setSearchName] = useState<string>("");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const itemsPerPage = 12;

  // Categorías disponibles (deben coincidir con las opciones en Admin)
  // Ordenadas alfabéticamente, excepto "all" que va primero
  const categories = [
    { value: "all", label: t("store.allCategories") || "Todas las categorías" },
    { value: "asesoría", label: t("store.category.consulting") || "Asesoría" },
    { value: "curso", label: t("store.category.course") || "Curso" },
    { value: "diseño", label: t("store.category.design") || "Diseño" },
    { value: "idiomas", label: t("store.category.languages") || "Idiomas" },
    {
      value: "inversión",
      label: t("store.category.investment") || "Inversión",
    },
    { value: "música", label: t("store.category.music") || "Música" },
    {
      value: "programación",
      label: t("store.category.programming") || "Programación",
    },
    { value: "ropa", label: t("store.category.clothing") || "Ropa" },
  ];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const products = await getProductsWithPricing();

        // Mapear productos de Supabase a StoreItem, preservando campos de traducción
        const mappedItems: StoreItem[] = (products || []).map(
          (product: any) => ({
            id: product.id,
            title: product.title,
            title_translations: product.title_translations,
            description: product.description,
            description_translations: product.description_translations,
            full_description: product.full_description,
            full_description_translations:
              product.full_description_translations,
            base_price_usd: product.base_price_usd !== null && product.base_price_usd !== undefined 
              ? Number(product.base_price_usd) 
              : null,
            base_price_cop: product.base_price_cop !== null && product.base_price_cop !== undefined
              ? Number(product.base_price_cop)
              : null,
            thumbnail_url: product.thumbnail_url,
            images: product.images
              ? Array.isArray(product.images)
                ? product.images
                : []
              : null,
            sector: product.sector || null,
            // Nueva estructura de botones
            button_type: product.button_type || "buy",
            buy_button_type: product.buy_button_type || "external_link",
            buy_button_url: product.buy_button_url || null,
            request_button_type: product.request_button_type || "external_link",
            request_button_url: product.request_button_url || null,
            // Campos antiguos (mantener por compatibilidad durante migración)
            action_type: product.action_type || null,
            action_url: product.action_url || null,
            pricing_link: product.pricing_link || null,
            button_text: product.button_text || null,
            // Asegurar que product_pricing sea un array y tenga los datos correctos
            product_pricing: Array.isArray(product.product_pricing)
              ? product.product_pricing
              : product.product_pricing
              ? [product.product_pricing]
              : [],
          })
        );

        setItems(mappedItems);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleItemClick = (item: StoreItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleAction = (item: StoreItem, linkUrl?: string) => {
    const buttonType = item.button_type || "buy";

    if (buttonType === "buy") {
      // Botón "Comprar"
      const buyType = item.buy_button_type || "external_link";

      if (buyType === "external_link") {
        // Link externo (puede ser múltiple o simultáneo)
        if (linkUrl) {
          // Si se pasa un linkUrl específico, abrirlo
          window.open(linkUrl, "_blank", "noopener,noreferrer");
        } else if (
          Array.isArray(item.buy_button_url) &&
          item.buy_button_url.length > 0
        ) {
          // Si hay múltiples links, abrir el primero y sus simultaneous_urls si existen
          const firstLink = item.buy_button_url[0];
          if (firstLink.url) {
            window.open(firstLink.url, "_blank", "noopener,noreferrer");
            // Si tiene simultaneous_urls, abrirlos también
            if (
              firstLink.simultaneous_urls &&
              Array.isArray(firstLink.simultaneous_urls)
            ) {
              firstLink.simultaneous_urls.forEach((url: string) => {
                if (url && url.trim()) {
                  window.open(url, "_blank", "noopener,noreferrer");
                }
              });
            }
          }
        } else if (typeof item.buy_button_url === "string") {
          // Legacy: string único
          window.open(item.buy_button_url, "_blank", "noopener,noreferrer");
        }
      } else if (buyType === "custom_checkout") {
        // Checkout propio (/checkout/:id)
        const buyUrl =
          typeof item.buy_button_url === "string"
            ? item.buy_button_url
            : item.id;
        const checkoutUrl = `/checkout/${buyUrl || item.id}`;
        window.location.href = checkoutUrl;
      }
    } else if (buttonType === "request") {
      // Botón "Solicitar"
      const requestType = item.request_button_type || "external_link";
      const requestUrl = item.request_button_url;

      if (requestType === "external_link") {
        // Link externo
        if (requestUrl) {
          window.open(requestUrl, "_blank", "noopener,noreferrer");
        }
      } else if (requestType === "custom_form") {
        // Formulario propio
        if (requestUrl) {
          window.location.href = requestUrl;
        } else {
          // Fallback: mostrar mensaje
          alert(t("store.sendingRequest"));
        }
      }
    } else {
      // Fallback para compatibilidad con campos antiguos
      if (item.action_type === "link") {
        const url = item.pricing_link || item.action_url;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } else if (
        item.action_type === "submit" ||
        item.action_type === "schedule"
      ) {
        if (item.action_url) {
          window.open(item.action_url, "_blank", "noopener,noreferrer");
        } else {
          alert(
            item.action_type === "schedule"
              ? t("store.scheduleSoon")
              : t("store.sendingRequest")
          );
        }
      }
    }
  };

  // Resetear página cuando cambia cualquier filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchName, priceFilter]);

  // Filtrar productos por categoría/sector, nombre y precio
  const filteredItems = items.filter((item) => {
    // Filtro por categoría
    if (selectedCategory !== "all" && item.sector !== selectedCategory) {
      return false;
    }
    
    // Filtro por nombre
    if (searchName) {
      const title = getTranslatedText(item.title_translations || item.title) || "";
      if (!title.toLowerCase().includes(searchName.toLowerCase())) {
        return false;
      }
    }
    
    // Filtro por precio
    if (priceFilter !== "all") {
      const pricing = item.product_pricing?.[0];
      const basePrice = item.base_price_usd || 0;
      const currentPrice = pricing?.current_price_usd || basePrice;
      
      switch (priceFilter) {
        case "free":
          if (currentPrice !== 0) return false;
          break;
        case "0-25":
          if (currentPrice === 0 || currentPrice > 25) return false;
          break;
        case "25-50":
          if (currentPrice <= 25 || currentPrice > 50) return false;
          break;
        case "50-100":
          if (currentPrice <= 50 || currentPrice > 100) return false;
          break;
        case "100+":
          if (currentPrice <= 100) return false;
          break;
      }
    }
    
    return true;
  });

  // Calcular páginas con productos filtrados
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Formatear precio (simplificado, sin detección de país por IP)
  const formatPrice = (item: StoreItem) => {
    const pricing = item.product_pricing?.[0];
    // Si base_price_usd es null o undefined, considerar como sin precio
    const basePrice = item.base_price_usd !== null && item.base_price_usd !== undefined ? item.base_price_usd : null;
    const currentPrice = pricing?.current_price_usd ?? basePrice;
    
    // Si no hay precio (null) y es tipo "request", retornar null para no mostrar precio
    if (item.button_type === "request") {
      if (currentPrice === null || currentPrice === undefined) {
        return null; // No mostrar precio si es "request" y no tiene precio
      }
    }
    
    // Si el precio es null o undefined, retornar null (no mostrar precio)
    if (currentPrice === null || currentPrice === undefined) {
      return null;
    }
    
    // Si el precio es 0, mostrar "Gratis"/"Free"
    if (currentPrice === 0) {
      return (
        <span className="text-2xl font-bold text-purple">
          {t("store.free")}
        </span>
      );
    }
    
    if (!pricing) {
      // Fallback: mostrar precio en USD si no hay pricing
      if (basePrice === null || basePrice === undefined) {
        return null;
      }
      return (
        <span className="text-2xl font-bold text-purple">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(basePrice as number)}
        </span>
      );
    }

    const isOnSale =
      pricing.is_on_sale &&
      (!pricing.sale_ends_at || new Date(pricing.sale_ends_at) > new Date());

    if (isOnSale) {
      const salePrice = pricing.sale_price_usd || pricing.current_price_usd;
      const originalPrice = pricing.current_price_usd;

      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="line-through text-gray-500 text-lg">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(originalPrice)}
            </span>
            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
              -{pricing.sale_percentage}%
            </span>
          </div>
          <span className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(salePrice)}
          </span>
        </div>
      );
    }

    const price = pricing.current_price_usd;

    return (
      <span className="text-2xl font-bold text-purple">
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(price)}
      </span>
    );
  };

  // Obtener texto del botón
  const getButtonText = (item: StoreItem) => {
    // Si hay texto personalizado (campos antiguos), usarlo
    if (item.button_text) {
      return item.button_text;
    }

    // Usar nueva estructura de botones
    const buttonType = item.button_type || "buy";
    if (buttonType === "buy") {
      return t("store.buy");
    } else if (buttonType === "request") {
      return t("store.request");
    }

    // Fallback para compatibilidad con campos antiguos
    switch (item.action_type) {
      case "schedule":
        return t("store.schedule");
      case "submit":
        return t("store.request");
      case "link":
      default:
        return t("store.buy");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          {t("store.title")}
        </h1>

        {/* Header de filtros estilo tabla */}
        {items.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <div className="min-w-full">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Búsqueda por nombre */}
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {t("store.title")}
                    </span>
                    <input
                      type="text"
                      placeholder={t("store.searchPlaceholder") || "Buscar por nombre..."}
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:border-purple dark:focus:border-cyan-200 flex-1 min-w-[150px]"
                    />
                  </div>

                  {/* Filtro por categoría */}
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {t("store.categoryLabel") || "Categoría"}
                    </span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:border-purple dark:focus:border-cyan-200"
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por precio */}
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {t("store.price") || "Precio"}
                    </span>
                    <select
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(e.target.value)}
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:border-purple dark:focus:border-cyan-200"
                    >
                      <option value="all">{t("store.allPrices") || "Todos"}</option>
                      <option value="free">{t("store.free")}</option>
                      <option value="0-25">$0 - $25</option>
                      <option value="25-50">$25 - $50</option>
                      <option value="50-100">$50 - $100</option>
                      <option value="100+">$100+</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid de productos */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-600 mb-4">
              {selectedCategory === "all"
                ? t("store.noProducts")
                : t("store.noProductsInCategory") ||
                  "No hay productos en esta categoría"}
            </p>
            <p className="text-gray-500">
              {selectedCategory === "all"
                ? t("store.noProductsDescription")
                : t("store.tryAnotherCategory") ||
                  "Intenta seleccionar otra categoría"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow border border-gray-200 flex flex-col"
              >
                {/* Thumbnail */}
                <div
                  className="w-full h-48 bg-gray-200 overflow-hidden cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <img
                    src={
                      item.thumbnail_url ||
                      "https://tu-cdn.cloudfront.net/default-store-thumbnail.png"
                    }
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://tu-cdn.cloudfront.net/default-store-thumbnail.png";
                    }}
                  />
                </div>

                {/* Contenido */}
                <div className="p-4 flex flex-col h-full">
                  <div className="flex-1">
                    <h3
                      className="text-xl font-semibold text-gray-900 mb-2 cursor-pointer hover:text-purple transition-colors"
                      onClick={() => handleItemClick(item)}
                    >
                      {getTranslatedText(item.title_translations || item.title)}
                    </h3>
                    <div className="text-gray-600 text-sm mb-4 prose prose-sm max-w-none">
                      {getTranslatedText(
                        item.description_translations || item.description
                      ) || t("common.noContent")}
                    </div>
                  </div>
                  <div className={`flex items-center mt-auto ${formatPrice(item) ? "justify-between" : "justify-end"}`}>
                    {formatPrice(item) && (
                      <div className="flex-1">{formatPrice(item)}</div>
                    )}
                    {item.button_type === "buy" &&
                    item.buy_button_type === "external_link" &&
                    Array.isArray(item.buy_button_url) &&
                    (item.buy_button_url.length > 1 ||
                      item.buy_button_url.some(
                        (link: any) =>
                          link.simultaneous_urls &&
                          Array.isArray(link.simultaneous_urls) &&
                          link.simultaneous_urls.length > 0
                      )) ? (
                      // Si hay múltiples links O links simultáneos, mostrar botón que abre modal
                      <Button
                        variant="outlineDark"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        className="px-4 py-2 cursor-pointer text-sm"
                      >
                        {t("store.buy")}
                      </Button>
                    ) : (
                      <Button
                        variant="outlineDark"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            item.button_type === "buy" &&
                            item.buy_button_type === "external_link" &&
                            Array.isArray(item.buy_button_url) &&
                            item.buy_button_url.length === 1 &&
                            !item.buy_button_url[0].simultaneous_urls
                          ) {
                            // Si hay un solo link en array sin simultaneous_urls, abrirlo directamente
                            handleAction(item, item.buy_button_url[0].url);
                          } else {
                            handleItemClick(item);
                          }
                        }}
                        className={`px-4 py-2 cursor-pointer text-sm ${!formatPrice(item) ? "w-full" : ""}`}
                      >
                        {getButtonText(item)}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-8">
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              {t("store.showingResults") || "Mostrando"} {startIndex + 1} -{" "}
              {Math.min(startIndex + itemsPerPage, filteredItems.length)}{" "}
              {t("store.of") || "de"} {filteredItems.length}{" "}
              {t("store.products") || "productos"}
            </p>
          </div>
        )}

        {/* Modal tipo Amazon */}
        {selectedItem && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={getTranslatedText(
              selectedItem.title_translations || selectedItem.title
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Imágenes */}
              <div className="flex flex-col h-full">
                <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden mb-4">
                  <img
                    src={
                      selectedItem.thumbnail_url ||
                      "https://tu-cdn.cloudfront.net/default-store-thumbnail.png"
                    }
                    alt={getTranslatedText(
                      selectedItem.title_translations || selectedItem.title
                    )}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedItem.images && selectedItem.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {selectedItem.images.map((image, index) => (
                      <div
                        key={index}
                        className="w-full h-20 bg-gray-200 rounded overflow-hidden"
                      >
                        <img
                          src={image}
                          alt={`${getTranslatedText(
                            selectedItem.title as any
                          )} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {/* Spacer invisible para alinear con el botón */}
                <div className="flex-1"></div>
              </div>

              {/* Información */}
              <div className="flex flex-col h-full">
                <div className="mb-4 flex-1">
                  {formatPrice(selectedItem) && (
                    <div className="mb-2">{formatPrice(selectedItem)}</div>
                  )}
                  <div 
                    className="text-gray-600 prose prose-sm max-w-none product-description"
                    dangerouslySetInnerHTML={{
                      __html: getTranslatedText(
                        selectedItem.full_description_translations ||
                          selectedItem.full_description
                      ) ||
                        getTranslatedText(
                          selectedItem.description_translations ||
                            selectedItem.description
                        ) ||
                        t("common.noContent")
                    }}
                  />
                  <style>{`
                    .product-description ul,
                    .product-description ol,
                    .product-description .ql-list,
                    .product-description [class*="ql-list"] {
                      margin: 1rem 0 !important;
                      padding-left: 2rem !important;
                      list-style-position: outside !important;
                      display: block !important;
                    }
                    .product-description ul,
                    .product-description .ql-list-bullet {
                      list-style-type: disc !important;
                    }
                    .product-description ol,
                    .product-description .ql-list-ordered {
                      list-style-type: decimal !important;
                    }
                    .product-description li,
                    .product-description .ql-list-item {
                      margin: 0.5rem 0 !important;
                      line-height: 1.6 !important;
                      display: list-item !important;
                    }
                    .product-description ul ul,
                    .product-description ol ol,
                    .product-description ul ol,
                    .product-description ol ul {
                      margin-top: 0.5rem !important;
                      margin-bottom: 0.5rem !important;
                    }
                    .product-description ul ul {
                      list-style-type: circle !important;
                    }
                    .product-description ul ul ul {
                      list-style-type: square !important;
                    }
                    .product-description ol ol {
                      list-style-type: lower-alpha !important;
                    }
                    .product-description ol ol ol {
                      list-style-type: lower-roman !important;
                    }
                    .product-description p {
                      margin: 1rem 0;
                    }
                    .product-description h1,
                    .product-description h2,
                    .product-description h3,
                    .product-description h4,
                    .product-description h5,
                    .product-description h6 {
                      margin-top: 1.5rem;
                      margin-bottom: 1rem;
                      font-weight: 600;
                    }
                    .product-description strong {
                      font-weight: 600;
                    }
                    .product-description em {
                      font-style: italic;
                    }
                    .product-description a {
                      color: #2093c4;
                      text-decoration: underline;
                    }
                    .product-description a:hover {
                      color: #331d83;
                    }
                    .product-description img {
                      max-width: 100%;
                      height: auto;
                      margin: 1rem 0;
                    }
                  `}</style>
                </div>

                <div className="space-y-3 mt-auto">
                  {selectedItem.button_type === "buy" &&
                  selectedItem.buy_button_type === "external_link" &&
                  Array.isArray(selectedItem.buy_button_url) &&
                  selectedItem.buy_button_url.length > 0 ? (
                    // Múltiples botones para links externos
                    selectedItem.buy_button_url.map(
                      (link: any, index: number) => {
                        const hasSimultaneous =
                          link.simultaneous_urls &&
                          Array.isArray(link.simultaneous_urls) &&
                          link.simultaneous_urls.length > 0;
                        return (
                          <Button
                            key={index}
                            variant={index === 0 ? "primary" : "outlineDark"}
                            onClick={() => {
                              // Abrir URL principal
                              if (link.url) {
                                window.open(
                                  link.url,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }
                              // Abrir simultaneous_urls si existen
                              if (hasSimultaneous) {
                                link.simultaneous_urls.forEach(
                                  (url: string) => {
                                    if (url && url.trim()) {
                                      window.open(
                                        url,
                                        "_blank",
                                        "noopener,noreferrer"
                                      );
                                    }
                                  }
                                );
                              }
                              setIsModalOpen(false);
                            }}
                            className="w-full"
                          >
                            {link.label || getButtonText(selectedItem)}
                          </Button>
                        );
                      }
                    )
                  ) : selectedItem.button_type === "buy" &&
                    selectedItem.buy_button_type === "external_link" &&
                    typeof selectedItem.buy_button_url === "string" ? (
                    // Un solo link (legacy)
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleAction(selectedItem);
                        setIsModalOpen(false);
                      }}
                      className="w-full"
                    >
                      {getButtonText(selectedItem)}
                    </Button>
                  ) : (
                    // Otros tipos de botones (incluyendo "request" sin precio)
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleAction(selectedItem);
                        setIsModalOpen(false);
                      }}
                      className={`w-full ${!formatPrice(selectedItem) ? "mt-auto" : ""}`}
                    >
                      {getButtonText(selectedItem)}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

export default Store;
