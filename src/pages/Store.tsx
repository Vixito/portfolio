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
            base_price_usd: Number(product.base_price_usd || 0),
            base_price_cop: product.base_price_cop
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

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Filtrar productos por categoría/sector
  const filteredItems = items.filter((item) => {
    if (selectedCategory === "all") {
      return true;
    }
    return item.sector === selectedCategory;
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
    if (!pricing) {
      // Fallback: mostrar precio en USD si no hay pricing
      const price = item.base_price_usd || 0;
      return (
        <span className="text-2xl font-bold text-purple">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(price)}
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

        {/* Filtro por categoría/sector */}
        {items.length > 0 && (
          <div className="mb-8 flex justify-start">
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("store.filterByCategory") || "Filtrar por categoría:"}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-64 bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2093c4] focus:border-[#2093c4] hover:border-[#2093c4]"
                style={{
                  transition: "all 0.2s ease-in-out",
                }}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
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
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow border border-gray-200"
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
                <div className="p-4">
                  <h3
                    className="text-xl font-semibold text-gray-900 mb-2 cursor-pointer hover:text-purple transition-colors"
                    onClick={() => handleItemClick(item)}
                  >
                    {getTranslatedText(item.title_translations || item.title)}
                  </h3>
                  <div className="text-gray-600 text-sm mb-4 line-clamp-2 prose prose-sm max-w-none">
                    {getTranslatedText(
                      item.description_translations || item.description
                    ) || t("common.noContent")}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">{formatPrice(item)}</div>
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
                        variant="outline"
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
                        variant="outline"
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
                        className="px-4 py-2 cursor-pointer text-sm"
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
              <div>
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
                  <div className="grid grid-cols-3 gap-2">
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
              </div>

              {/* Información */}
              <div>
                <div className="mb-4">
                  <div className="mb-2">{formatPrice(selectedItem)}</div>
                  <div className="text-gray-600 prose prose-sm max-w-none">
                    {getTranslatedText(
                      selectedItem.full_description_translations ||
                        selectedItem.full_description
                    ) ||
                      getTranslatedText(
                        selectedItem.description_translations ||
                          selectedItem.description
                      ) ||
                      t("common.noContent")}
                  </div>
                </div>

                <div className="space-y-3">
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
                            variant={index === 0 ? "primary" : "outline"}
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
                    // Otros tipos de botones
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
