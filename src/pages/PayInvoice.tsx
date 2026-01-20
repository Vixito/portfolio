import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInvoice } from "../lib/supabase-functions";
import { createDlocalPayment } from "../lib/supabase-functions";
import Button from "../components/ui/Button";
import Loading from "../components/ui/Loading";
import { useTranslation } from "../lib/i18n";

export default function PayInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payerInfo, setPayerInfo] = useState({
    email: "",
    name: "",
    document: "",
    country: "CO", // Por defecto Colombia
  });

  useEffect(() => {
    if (!id) {
      setError("Invoice ID is required");
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        const data = await getInvoice(id);
        setInvoice(data);
        // Pre-llenar email si está disponible
        if (data.user_email) {
          setPayerInfo((prev) => ({ ...prev, email: data.user_email }));
        }
        if (data.user_name) {
          setPayerInfo((prev) => ({ ...prev, name: data.user_name }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const handleCreatePayment = async () => {
    if (!invoice || !id) return;

    // Validar campos requeridos
    if (!payerInfo.email || !payerInfo.name || !payerInfo.country) {
      setError("Please fill in all required fields");
      return;
    }

    setCreatingPayment(true);
    setError(null);

    try {
      const paymentData = await createDlocalPayment({
        invoice_id: id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        country: payerInfo.country,
        payer_email: payerInfo.email,
        payer_name: payerInfo.name,
        payer_document: payerInfo.document || undefined,
        product_id: invoice.product_id,
      });

      // Si hay redirect_url, redirigir al checkout de dLocal
      if (paymentData.payment?.redirect_url) {
        window.location.href = paymentData.payment.redirect_url;
      } else if (paymentData.redirect_url) {
        window.location.href = paymentData.redirect_url;
      } else {
        setError("No redirect URL received from dLocal");
        setCreatingPayment(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating payment");
      setCreatingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "COP",
      minimumFractionDigits: currency === "USD" ? 2 : 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-purple dark:text-cyan-300 mb-6 text-center">
          Pay Invoice #{invoice.invoice_number}
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-400">Amount to pay:</p>
            <p className="text-2xl font-bold text-purple dark:text-cyan-300">
              {formatPrice(invoice.amount, invoice.currency)}
            </p>
          </div>
          {invoice.product && (
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400">Product:</p>
              <p className="font-semibold">{invoice.product.title}</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Payment Information</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                value={payerInfo.country}
                onChange={(e) =>
                  setPayerInfo((prev) => ({ ...prev, country: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="CO">Colombia</option>
                <option value="US">United States</option>
                <option value="BR">Brazil</option>
                <option value="MX">Mexico</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="PE">Peru</option>
                {/* Agregar más países según necesites */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={payerInfo.name}
                onChange={(e) =>
                  setPayerInfo((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={payerInfo.email}
                onChange={(e) =>
                  setPayerInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Document ID (Optional)
              </label>
              <input
                type="text"
                value={payerInfo.document}
                onChange={(e) =>
                  setPayerInfo((prev) => ({ ...prev, document: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="1234567890"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required for some payment methods
              </p>
            </div>

            <Button
              onClick={handleCreatePayment}
              disabled={creatingPayment || !payerInfo.email || !payerInfo.name || !payerInfo.country}
              className="w-full"
            >
              {creatingPayment ? "Processing..." : "Continue to Payment"}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Secure payment powered by dLocal</p>
          <p className="mt-1">+500 payment methods available</p>
        </div>
      </div>
    </div>
  );
}
