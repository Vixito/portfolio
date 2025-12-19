import { useState, useEffect } from "react";
import Pagination from "../components/ui/Pagination";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { getProducts } from "../lib/supabase-functions";
import { useTranslation } from "../lib/i18n";

interface StoreItem {
  id: string;
  title: string;
  description: string | null;
  full_description: string | null;
  base_price_usd: number;
  thumbnail_url: string | null;
  images: string[] | null;
  // Campos configurables desde Admin
  action_type?: "link" | "submit" | "schedule"; // Tipo de acción del botón
  action_url?: string | null; // URL para redirección (si action_type es "link")
  pricing_link?: string | null; // Link de pricing generado desde Admin
  button_text?: string | null; // Texto personalizado del botón
}

function Store() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 12;

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const products = await getProducts();

        // Mapear productos de Supabase a StoreItem
        const mappedItems: StoreItem[] = products.map((product: any) => ({
          id: product.id,
          title: product.title,
          description: product.description,
          full_description: product.full_description,
          base_price_usd: Number(product.base_price_usd),
          thumbnail_url: product.thumbnail_url,
          images: product.images
            ? Array.isArray(product.images)
              ? product.images
              : []
            : null,
          action_type: product.action_type || "link",
          action_url: product.action_url || null,
          pricing_link: product.pricing_link || null,
          button_text: product.button_text || null,
        }));

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

  const handleAction = (item: StoreItem) => {
    if (item.action_type === "link") {
      // Redirigir a la URL configurada (pricing_link o action_url)
      const url = item.pricing_link || item.action_url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } else if (
      item.action_type === "submit" ||
      item.action_type === "schedule"
    ) {
      // Para submit/schedule, podría abrir un modal o redirigir a un formulario
      // Por ahora, mostrar un mensaje o redirigir a action_url si existe
      if (item.action_url) {
        window.open(item.action_url, "_blank", "noopener,noreferrer");
      } else {
        // Aquí podrías abrir un modal de formulario para "Agéndalo"
        alert(
          item.action_type === "schedule"
            ? t("store.scheduleSoon")
            : t("store.sendingRequest")
        );
      }
    }
  };

  // Calcular páginas
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

  // Formatear precio (mostrar precio base en USD)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Obtener texto del botón
  const getButtonText = (item: StoreItem) => {
    if (item.button_text) {
      return item.button_text;
    }
    // Texto por defecto según el tipo de acción
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

        {/* Grid de productos */}
        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-600 mb-4">
              {t("store.noProducts")}
            </p>
            <p className="text-gray-500">{t("store.noProductsDescription")}</p>
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
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {item.description || t("common.noContent")}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-purple">
                      {formatPrice(item.base_price_usd)}
                    </p>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(item);
                      }}
                      className="px-4 py-2 cursor-pointer"
                    >
                      {getButtonText(item)}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Modal tipo Amazon */}
        {selectedItem && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={selectedItem.title}
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
                    alt={selectedItem.title}
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
                          alt={`${selectedItem.title} ${index + 1}`}
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
                  <p className="text-3xl font-bold text-purple mb-2">
                    {formatPrice(selectedItem.base_price_usd)}
                  </p>
                  <p className="text-gray-600">
                    {selectedItem.full_description ||
                      selectedItem.description ||
                      t("common.noContent")}
                  </p>
                </div>

                <div className="space-y-3">
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
                  {selectedItem.pricing_link && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open(
                          selectedItem.pricing_link!,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                      className="w-full"
                    >
                      {t("store.viewPricing")}
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
