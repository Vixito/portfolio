import { useState, useEffect } from "react";
import Pagination from "../components/ui/Pagination";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

interface StoreItem {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string; // URL desde S3/CloudFront
  fullDescription?: string;
  images?: string[]; // Imágenes adicionales
}

function Store() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 12;

  useEffect(() => {
    // Datos de ejemplo - reemplaza con tus datos reales
    const mockItems: StoreItem[] = [
      {
        id: "1",
        title: "Consultoría Backend",
        description:
          "Servicio de consultoría especializada en desarrollo backend",
        price: 50000,
        thumbnail: "https://tu-cdn.cloudfront.net/store/consultoria.jpg",
        fullDescription:
          "Servicio completo de consultoría backend que incluye análisis, diseño de arquitectura, implementación y optimización de APIs. Ideal para proyectos que necesitan escalabilidad y rendimiento.",
        images: [
          "https://tu-cdn.cloudfront.net/store/consultoria-1.jpg",
          "https://tu-cdn.cloudfront.net/store/consultoria-2.jpg",
        ],
      },
      {
        id: "2",
        title: "Desarrollo de API REST",
        description: "Desarrollo completo de API REST con documentación",
        price: 30000,
        thumbnail: "https://tu-cdn.cloudfront.net/store/api.jpg",
        fullDescription:
          "Desarrollo de API REST completa con autenticación, documentación Swagger, tests y deployment. Incluye integración con bases de datos y servicios externos.",
      },
      // Agrega más items aquí
    ];

    setTimeout(() => {
      setItems(mockItems);
      setLoading(false);
    }, 500);
  }, []);

  const handleItemClick = (item: StoreItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleAddToCart = () => {
    // Aquí implementarías la lógica del carrito
    // Por ahora solo un alert
    alert(`Agregado al carrito: ${selectedItem?.title}`);
    // En producción, esto redirigiría a Airtm para el pago
  };

  // Calcular páginas
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

  // Formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          Tienda
        </h1>

        {/* Grid de productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {currentItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow border border-gray-200"
            >
              {/* Thumbnail */}
              <div className="w-full h-48 bg-gray-200 overflow-hidden">
                <img
                  src={item.thumbnail}
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {item.description}
                </p>
                <p className="text-2xl font-bold text-purple">
                  {formatPrice(item.price)}
                </p>
              </div>
            </div>
          ))}
        </div>

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
                    src={selectedItem.thumbnail}
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
                    {formatPrice(selectedItem.price)}
                  </p>
                  <p className="text-gray-600">
                    {selectedItem.fullDescription || selectedItem.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="primary"
                    onClick={handleAddToCart}
                    className="w-full"
                  >
                    Agregar al Carrito
                  </Button>
                  <Button variant="outline" className="w-full">
                    Ver Detalles
                  </Button>
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
