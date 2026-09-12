import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import CanvasBackground from "../components/features/CanvasBackground";
import Button from "../components/ui/Button";
import { getTranslatedText, useTranslation } from "../lib/i18n";
import {
  confirmDLocalGoPayment,
  createDLocalGoToken,
  createNowPaymentsCheckout,
  getAppearanceSettings,
  getCheckoutInvoiceStatus,
  getCheckoutProduct,
  getDLocalGoConfig,
} from "../lib/supabase-functions";
import { useThemeStore } from "../stores/useThemeStore";
import NotFound from "./NotFound";

interface CheckoutDelivery {
  access_links?: string[];
  delivery_message?: string;
  success_message?: string;
}

interface CheckoutProduct {
  id: string;
  public_id?: string | null;
  title: string;
  title_translations?: { es?: string; en?: string } | null;
  description?: string | null;
  description_translations?: { es?: string; en?: string } | null;
  full_description?: string | null;
  full_description_translations?: { es?: string; en?: string } | null;
  thumbnail_url?: string | null;
  base_price_usd?: number | null;
  checkout_settings?: {
    gateways?: string[];
  } | null;
  product_pricing?: Array<{
    current_price_usd?: number | null;
    is_on_sale?: boolean | null;
    sale_price_usd?: number | null;
    sale_ends_at?: string | null;
  }> | null;
}

interface DLocalGoConfig {
  sandbox?: boolean;
  smartfields_api_key?: string | null;
  sdk_url?: string | null;
}

// Tipos de documento válidos por país (dLocal Go). Para países sin lista
// (EE.UU., España, etc.) solo se ofrece PASS.
const DOCUMENT_TYPES_BY_COUNTRY: Record<string, string[]> = {
  AR: ["DNI", "CUIT", "CUIL"],
  BO: ["CI", "NIT"],
  BR: ["CPF", "CNPJ"],
  CL: ["RUN", "RUT"],
  CO: ["CC", "NIT", "CE", "PASS"],
  CR: ["CI", "CR", "CJ"],
  EC: ["CI", "RUC"],
  GT: ["CUI", "NIT"],
  MX: ["CURP", "RFC", "IFE", "PASS"],
  PA: ["CIP", "PASS", "RUC"],
  PE: ["CE", "DNI", "PASS", "RUC"],
  PY: ["CI", "RUC"],
  UY: ["CI", "RUT"],
};
const DEFAULT_DOC_TYPES = ["PASS"];

declare global {
  interface Window {
    // SDK de dLocal Go (SmartFields): se carga dinámicamente
    dLocalGo?: any;
  }
}

type ActiveTab = "card" | "nowpayments";
type PageState = "checkout" | "processing" | "success" | "error";

function Checkout() {
  const { productId } = useParams<{ productId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { theme } = useThemeStore();

  const [product, setProduct] = useState<CheckoutProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [starryBg, setStarryBg] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("card");
  const [pageState, setPageState] = useState<PageState>("checkout");
  const [error, setError] = useState<string | null>(null);

  const [buyerInfo, setBuyerInfo] = useState({ name: "", email: "" });

  // dLocal Go (Transparent Checkout / SmartFields)
  const [dlocalConfig, setDlocalConfig] = useState<DLocalGoConfig | null>(null);
  const [cardPhase, setCardPhase] = useState<"idle" | "token_ready">("idle");
  const [documentInfo, setDocumentInfo] = useState({
    type: "PASS",
    number: "",
    country: "",
  });
  const [validDocTypes, setValidDocTypes] = useState<string[]>(
    DEFAULT_DOC_TYPES
  );

  // Al cambiar el país, ajusta los tipos de documento válidos.
  const handleCountryChange = (country: string) => {
    const types = DOCUMENT_TYPES_BY_COUNTRY[country] || DEFAULT_DOC_TYPES;
    setValidDocTypes(types);
    setDocumentInfo((prev) => ({
      ...prev,
      country,
      type: prev.type && types.includes(prev.type) ? prev.type : types[0],
    }));
  };
  const dlocalCheckoutTokenRef = useRef<string | null>(null);
  const dlocalFieldRef = useRef<any>(null);

  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<CheckoutDelivery | null>(null);
  const [processingMsg, setProcessingMsg] = useState("");

  const pollRef = useRef<number | null>(null);
  const creatingNowPaymentsRef = useRef(false);
  const creatingCardRef = useRef(false);

  const originalInvoiceId = searchParams.get("invoice_id");
  const returnInvoiceId = invoiceId || originalInvoiceId;
  const showSuccess = pageState === "success";

  const gateways = product?.checkout_settings?.gateways || [
    "paypal",
    "nowpayments",
  ];
  // La pestaña "Tarjeta" usa dLocal Go; se muestra también si el producto
  // tenía habilitado PayPal (migración) para no romper productos existentes.
  const cardEnabled =
    gateways.includes("dlocalgo") || gateways.includes("paypal");
  const nowpaymentsEnabled = gateways.includes("nowpayments");

  const effectivePrice = useMemoPrice(product);

  useEffect(() => {
    const load = async () => {
      if (!productId) return;
      try {
        setLoading(true);
        const [productData, appearance, dlocalConfigData] =
          await Promise.all([
            getCheckoutProduct(productId),
            getAppearanceSettings(),
            getDLocalGoConfig().catch(() => null),
          ]);

        if (!productData) {
          setError(t("checkout.productNotFound") || "Producto no encontrado");
          return;
        }

        setProduct(productData as CheckoutProduct);
        setDlocalConfig(dlocalConfigData || null);

        const bg =
          appearance?.hero_background === "starry_night" ||
          appearance?.radio_background === "starry_night";
        setStarryBg(!!bg);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error cargando el producto"
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId]);

  // Determinar estados iniciales por query params (retorno de pasarela
  // hosteada: NowPayments / dLocal Go)
  useEffect(() => {
    if (pageState !== "checkout") return;
    if (!originalInvoiceId) return;

    // Retorno de la pasarela: esperar confirmación y entregar
    setInvoiceId(originalInvoiceId);
    setPageState("processing");
    setProcessingMsg(
      t("checkout.waitingConfirmation") || "Esperando confirmación del pago..."
    );
  }, [originalInvoiceId, pageState]);

  // Polling para NowPayments (solo cuando estamos en processing)
  useEffect(() => {
    if (pageState !== "processing" || !returnInvoiceId) return;

    let attempts = 0;
    const maxAttempts = 120; // ~6 minutos

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setProcessingMsg(
          t("checkout.stillWaiting") ||
            "Tu pago está siendo procesado. Te enviaremos el acceso por email."
        );
        return;
      }
      attempts += 1;
      const invoiceId = returnInvoiceId;
      try {
        const status = await getCheckoutInvoiceStatus(invoiceId);
        if (status?.paid) {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          if (status.invoice_number) setInvoiceNumber(status.invoice_number);
          setDelivery(status.delivery || null);
          setPageState("success");
        } else if (
          status?.status === "cancelled" ||
          status?.status === "failed"
        ) {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setError(
            t("checkout.paymentFailed") || "El pago no se pudo completar."
          );
          setPageState("error");
        }
      } catch {
        // Reintentar en el siguiente tick
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 4000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [pageState, returnInvoiceId]);

  const startNowPayments = async () => {
    if (!product || creatingNowPaymentsRef.current) return;
    creatingNowPaymentsRef.current = true;
    setError(null);

    if (!buyerInfo.email.trim()) {
      setError(t("checkout.emailRequired") || "Tu email es requerido");
      return;
    }

    setPageState("processing");
    setProcessingMsg(t("checkout.creatingPayment") || "Creando pago seguro...");

    try {
      const productPublicId = product.public_id || product.id;
      const successUrl = `${window.location.origin}/checkout/${productPublicId}?invoice_id={INVOICE_ID}&gateway=nowpayments`;
      const res = await createNowPaymentsCheckout({
        product_id: product.id,
        user_name: buyerInfo.name.trim() || "Cliente",
        user_email: buyerInfo.email.trim(),
        product_language: language,
        success_url: successUrl,
        cancel_url: `${window.location.origin}/store/${productPublicId}`,
      });

      // NowPayments devuelve el portal de pago; el servidor ya inyectó
      // el id de la factura local en la success_url para el polling.
      if (res?.invoice_url) {
        window.location.href = res.invoice_url;
      } else {
        setError(
          t("checkout.noRedirect") || "No se pudo obtener el link de pago"
        );
        creatingNowPaymentsRef.current = false;
        setPageState("checkout");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error creando el pago con criptomonedas"
      );
      creatingNowPaymentsRef.current = false;
      setPageState("checkout");
    }
  };

  const validateBuyer = (): string | null => {
    if (!buyerInfo.name.trim())
      return t("checkout.nameRequired") || "Tu nombre es requerido";
    if (!buyerInfo.email.trim())
      return t("checkout.emailRequired") || "Tu email es requerido";
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerInfo.email.trim());
    if (!emailOk) return t("checkout.emailInvalid") || "Email inválido";
    return null;
  };

  const loadDLocalGoSdk = () =>
    new Promise<any>((resolve, reject) => {
      const w = window;
      if (w.dLocalGo) {
        resolve(w.dLocalGo);
        return;
      }
      const url = dlocalConfig?.sdk_url;
      if (!url) {
        reject(new Error("El SDK de pago no está disponible"));
        return;
      }
      const existing = document.querySelector("script[data-dlocalgo-sf]");
      if (existing) {
        existing.addEventListener("load", () => resolve(w.dLocalGo));
        existing.addEventListener("error", () =>
          reject(new Error("No se pudo cargar el SDK de pago"))
        );
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.setAttribute("data-dlocalgo-sf", "1");
      script.setAttribute("async", "");
      script.addEventListener("load", () => resolve(w.dLocalGo));
      script.addEventListener("error", () =>
        reject(new Error("No se pudo cargar el SDK de pago"))
      );
      document.head.appendChild(script);
    });

  const startCard = async () => {
    if (!product || creatingCardRef.current) return;
    creatingCardRef.current = true;
    setError(null);

    const validationError = validateBuyer();
    if (validationError) {
      setError(validationError);
      creatingCardRef.current = false;
      return;
    }

    if (!dlocalConfig?.smartfields_api_key) {
      setError(
        t("checkout.cardUnavailable") ||
          "El pago con tarjeta no está disponible en este momento."
      );
      creatingCardRef.current = false;
      return;
    }

    const docNumber = documentInfo.number.trim();
    if (!docNumber) {
      setError(
        t("checkout.documentRequired") || "El número de documento es requerido"
      );
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(documentInfo.country.trim())) {
      setError(
        t("checkout.countryRequired") || "Selecciona tu país"
      );
      return;
    }

    setProcessingMsg(t("checkout.creatingPayment") || "Creando pago seguro...");

    try {
      const productPublicId = product.public_id || product.id;
      const res = await createDLocalGoToken({
        product_id: product.id,
        user_name: buyerInfo.name.trim(),
        user_email: buyerInfo.email.trim(),
        product_language: language,
        country: documentInfo.country.trim().toUpperCase(),
        client_document_type: documentInfo.type,
        client_document: docNumber,
        success_url: `${window.location.origin}/checkout/${productPublicId}?gateway=card`,
      });

      if (!res?.merchant_checkout_token) {
        // Sin token (ej. dLocal deshabilitó transparente): fallback hosteado
        if (res?.redirect_url) {
          setInvoiceId(res.invoice_id || null);
          window.location.href = res.redirect_url;
          return;
        }
        throw new Error(
          t("checkout.noRedirect") || "No se pudo iniciar el pago con tarjeta"
        );
      }

      setInvoiceId(res.invoice_id || null);
      dlocalCheckoutTokenRef.current = res.merchant_checkout_token;
      setCardPhase("token_ready");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error iniciando el pago con tarjeta"
      );
    } finally {
      creatingCardRef.current = false;
    }
  };

  // Inicializar SmartFields y montar el campo de tarjeta cuando el contenedor
  // esté en el DOM (cardPhase === "token_ready").
  useEffect(() => {
    if (cardPhase !== "token_ready") return;
    let active = true;

    (async () => {
      try {
        const sdk = await loadDLocalGoSdk();
        if (!active || !dlocalCheckoutTokenRef.current) return;
        await sdk.initialize(
          dlocalConfig?.smartfields_api_key,
          dlocalCheckoutTokenRef.current
        );
        const field = sdk.fields().create("card", {
          style: {
            base: {
              fontSize: "16px",
              color: "#1f2937",
              "::placeholder": { color: "#9ca3af" },
            },
          },
        });
        const container = document.getElementById("dlocal-card-field");
        if (!container) return;
        field.mount(container);
        if (active) dlocalFieldRef.current = field;
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Error inicializando el pago con tarjeta"
          );
          setCardPhase("idle");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [cardPhase, dlocalConfig]);

  const confirmCard = async () => {
    if (!product || !dlocalFieldRef.current) return;
    setError(null);

    const docNumber = documentInfo.number.trim();
    if (!docNumber) {
      setError(
        t("checkout.documentRequired") || "El número de documento es requerido"
      );
      return;
    }

    setPageState("processing");
    setProcessingMsg(
      t("checkout.confirmingPayment") || "Confirmando tu pago..."
    );

    try {
      const sdk = window.dLocalGo;
      if (!sdk?.createCardToken) {
        throw new Error(
          t("checkout.cardTokenError") || "No se pudo procesar la tarjeta"
        );
      }
      const { token: cardToken } = await sdk.createCardToken(
        dlocalFieldRef.current,
        { name: buyerInfo.name.trim() }
      );
      if (!cardToken) {
        throw new Error(
          t("checkout.cardTokenError") || "No se pudo procesar la tarjeta"
        );
      }

      const parts = buyerInfo.name.trim().split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";

      const res = await confirmDLocalGoPayment({
        invoice_id: invoiceId || "",
        checkout_token: dlocalCheckoutTokenRef.current || "",
        card_token: cardToken,
        client_first_name: firstName,
        client_last_name: lastName,
        client_document_type: documentInfo.type,
        client_document: docNumber,
        client_country: documentInfo.country.trim().toUpperCase(),
        client_email: buyerInfo.email.trim(),
      });

      // 3DS: redirigir; al volver, el polling de get-checkout-invoice entrega
      if (res?.redirect_url) {
        window.location.href = res.redirect_url;
        return;
      }

      if (res?.paid) {
        if (res.invoice_number) setInvoiceNumber(res.invoice_number);
        setDelivery(res.delivery || null);
        setPageState("success");
        return;
      }

      // Pendiente: el webhook/polling confirmará cuando esté PAID
      setInvoiceId((prev) => prev || (res?.invoice_id as string) || null);
      setProcessingMsg(
        t("checkout.waitingConfirmation") ||
          "Esperando confirmación del pago..."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error confirmando el pago"
      );
      setPageState("checkout");
      setCardPhase("token_ready");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300">
            {t("common.loading") || "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return <NotFound />;
  }

  if (!product) {
    return null;
  }

  const title = getTranslatedText(product.title_translations || product.title);

  return (
    <div className="min-h-screen py-20 px-4 relative overflow-hidden">
      <AnimatePresence>
        {starryBg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-0 pointer-events-none"
          >
            <CanvasBackground mode={theme as "light" | "dark"} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-2xl mx-auto">
        <Link
          to={`/store/${product.public_id || product.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-cyan-300 transition-colors mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t("checkout.backToProduct") || "Volver al producto"}
        </Link>

        {showSuccess ? (
          <SuccessScreen
            product={product}
            delivery={delivery}
            invoiceNumber={invoiceNumber || returnInvoiceId || undefined}
            onFinish={() =>
              navigate(`/store/${product.public_id || product.id}`)
            }
          />
        ) : (
          <>
            {/* Producto */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-6 border border-gray-200 dark:border-gray-700">
              <div className="flex gap-4 p-5">
                {product.thumbnail_url && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-900">
                    <img
                      src={product.thumbnail_url}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-center min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {title}
                  </h1>
                  {product.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {getTranslatedText(
                        product.description_translations || product.description
                      )}
                    </p>
                  )}
                  <div className="mt-2">
                    {effectivePrice !== null ? (
                      <span className="text-2xl font-extrabold text-purple-800 dark:text-cyan-300">
                        {formatPrice(effectivePrice)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Tabs de pasarelas */}
            {pageState === "checkout" && (<>
            <div className="flex gap-2 mb-5">
              {cardEnabled && (
                <TabButton
                  active={activeTab === "card"}
                  onClick={() => {
                    setActiveTab("card");
                    setError(null);
                    setCardPhase("idle");
                  }}
                  label={t("checkout.tabCard") || "Tarjeta"}
                />
              )}
              {nowpaymentsEnabled && (
                <TabButton
                  active={activeTab === "nowpayments"}
                  onClick={() => {
                    setActiveTab("nowpayments");
                    setError(null);
                    setCardPhase("idle");
                  }}
                  label={t("checkout.tabCrypto") || "Criptomonedas"}
                />
              )}
            </div>

            {/* Datos del comprador */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wide">
                {t("checkout.buyerInfo") || "Información del comprador"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1"
                  >
                    {t("checkout.fullName") || "Nombre completo"} *
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    value={buyerInfo.name}
                    onChange={(e) =>
                      setBuyerInfo((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label
                    htmlFor="checkout-email"
                    className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1"
                  >
                    {t("checkout.email") || "Email"} *
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={buyerInfo.email}
                    onChange={(e) =>
                      setBuyerInfo((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                {t("checkout.deliveryNote") ||
                  "Recibirás tu factura y el acceso al producto en este email."}
              </p>
            </div>

            {/* Pasarela activa */}
            {activeTab === "card" && cardEnabled && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {t("checkout.payWithCard") || "Pagar con tarjeta"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t("checkout.cardInfo") ||
                    "Pago seguro procesado por dLocal. Visa, Mastercard, Amex y métodos locales."}
                </p>

                <div
                  id="dlocal-card-field"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-3 mb-4"
                  style={{
                    display: cardPhase === "token_ready" ? "block" : "none",
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label
                      htmlFor="checkout-doc-type"
                      className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      {t("checkout.documentType") || "Tipo de documento"}
                    </label>
                    <select
                      id="checkout-doc-type"
                      value={documentInfo.type}
                      onChange={(e) =>
                        setDocumentInfo((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {validDocTypes.map((doc) => (
                        <option key={doc} value={doc}>
                          {doc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="checkout-doc-number"
                      className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      {t("checkout.documentNumber") || "Número de documento"}
                    </label>
                    <input
                      id="checkout-doc-number"
                      type="text"
                      inputMode="numeric"
                      value={documentInfo.number}
                      onChange={(e) =>
                        setDocumentInfo((prev) => ({
                          ...prev,
                          number: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="1234567890"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="checkout-doc-country"
                    className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1"
                  >
                    {t("checkout.country") || "País"}
                  </label>
                  <select
                    id="checkout-doc-country"
                    value={documentInfo.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="" disabled>
                      {t("checkout.selectCountry") || "--"}
                    </option>
                    {[
                      ["US", "Estados Unidos"],
                      ["BR", "Brasil"],
                      ["MX", "México"],
                      ["AR", "Argentina"],
                      ["CO", "Colombia"],
                      ["CL", "Chile"],
                      ["PE", "Perú"],
                      ["EC", "Ecuador"],
                      ["UY", "Uruguay"],
                      ["PY", "Paraguay"],
                      ["BO", "Bolivia"],
                      ["VE", "Venezuela"],
                      ["ES", "España"],
                      ["FR", "Francia"],
                      ["DE", "Alemania"],
                      ["GB", "Reino Unido"],
                      ["IT", "Italia"],
                      ["PT", "Portugal"],
                      ["PL", "Polonia"],
                      ["CA", "Canadá"],
                    ].map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {cardPhase === "token_ready" ? (
                  <>
                    <Button
                      onClick={confirmCard}
                      disabled={pageState === "processing"}
                      variant="productStore"
                      className="w-full"
                    >
                      {pageState === "processing" ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {processingMsg}
                        </span>
                      ) : (
                        t("checkout.confirmCardButton") || "Confirmar pago"
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                      {t("checkout.secureNote") ||
                        "Los datos de tu tarjeta se procesan de forma segura por dLocal (PCI DSS)."}
                    </p>
                  </>
                ) : (
                  <Button
                    onClick={startCard}
                    disabled={pageState === "processing"}
                    variant="productStore"
                    className="w-full"
                  >
                    {pageState === "processing" ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {processingMsg}
                      </span>
                    ) : (
                      t("checkout.payCardButton") || "Pagar con tarjeta"
                    )}
                  </Button>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  (Powered by dLocal)
                </p>
              </div>
            )}

            {activeTab === "nowpayments" && nowpaymentsEnabled && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t("checkout.payWithCrypto") || "Pagar con criptomonedas"}
                  </h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t("checkout.cryptoInfo") ||
                    "Acepto BTC, ETH, USDT y más de 300 criptomonedas. Recibirás un enlace de pago seguro."}
                </p>
                <Button
                  onClick={startNowPayments}
                  disabled={pageState === "processing"}
                  variant="productStore"
                  className="w-full"
                >
                  {pageState === "processing" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {processingMsg}
                    </span>
                  ) : (
                    t("checkout.payCryptoButton") || "Pagar con criptomonedas"
                  )}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  (Powered by NowPayments)
                </p>
              </div>
            )}
            </>)}
          </>
        )}

        {/* Overlay de procesamiento */}
        {pageState === "processing" && !showSuccess && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-700 dark:text-gray-200 text-center">
                {processingMsg}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function TabButton({
    active,
    onClick,
    label,
  }: {
    active: boolean;
    onClick: () => void;
    label: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${
          active
            ? "bg-purple-600 text-white border-purple-600 dark:bg-purple-800 dark:border-purple-500 shadow"
            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-500"
        }`}
      >
        {label}
      </button>
    );
  }
}

function SuccessScreen({
  product,
  delivery,
  invoiceNumber,
  onFinish,
}: {
  product: CheckoutProduct;
  delivery: CheckoutDelivery | null;
  invoiceNumber?: string;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  const accessLinks = delivery?.access_links || [];
  const successMessage =
    delivery?.success_message ||
    t("checkout.successMessage") ||
    "¡Pago confirmado! Te he enviado la factura y el acceso a tu producto por email.";

  const title = getTranslatedText(product.title_translations || product.title);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div className="p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t("checkout.successTitle") || "¡Pago confirmado!"}
        </h1>

        <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">{title}</p>
        {invoiceNumber && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("checkout.invoiceLabel") || "Factura"} #{invoiceNumber}
          </p>
        )}

        <p className="text-gray-600 dark:text-gray-300 mt-6 max-w-md">
          {successMessage}
        </p>

        {delivery?.delivery_message && (
          <div className="mt-4 w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 text-left">
            {delivery.delivery_message}
          </div>
        )}

        {accessLinks.length > 0 && (
          <div className="mt-4 w-full">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 text-left">
              {t("checkout.yourAccess") || "Accede a tu producto:"}
            </h3>
            <div className="space-y-2">
              {accessLinks.map((link: string) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-purple-500/40 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-cyan-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                >
                  <span className="truncate">{link}</span>
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onFinish} variant="productStore" className="mt-8">
          {t("checkout.done") || "Listo"}
        </Button>
      </div>
    </motion.div>
  );
}

function useMemoPrice(product: CheckoutProduct | null): number | null {
  if (!product) return null;
  const pricing = Array.isArray(product.product_pricing)
    ? product.product_pricing[0]
    : null;

  if (!pricing) {
    return product.base_price_usd ?? null;
  }

  const isOnSale =
    pricing.is_on_sale &&
    (!pricing.sale_ends_at || new Date(pricing.sale_ends_at) > new Date());

  if (isOnSale && pricing.sale_price_usd != null) {
    return pricing.sale_price_usd;
  }

  return pricing.current_price_usd ?? product.base_price_usd ?? null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 2 : 2,
  }).format(value);
}

export default Checkout;
