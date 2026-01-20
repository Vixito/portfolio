import React from "react";

interface InvoiceProps {
  invoice: {
    id: string;
    invoice_number: number;
    product_id: string;
    user_name: string;
    request_type: string;
    amount: number;
    currency: "USD" | "COP";
    delivery_time: string;
    custom_fields?: Record<string, any>;
    product?: {
      id: string;
      title: string;
    };
  };
}

export default function Invoice({ invoice }: InvoiceProps) {
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "COP",
      minimumFractionDigits: currency === "USD" ? 2 : 0,
    }).format(amount);
  };

  return (
    <div className="invoice-label" style={invoiceStyles.label}>
      <header style={invoiceStyles.header}>
        <h1 style={invoiceStyles.title}>Invoice #{invoice.invoice_number}</h1>
        <div style={invoiceStyles.divider}></div>
        <p style={invoiceStyles.studio}>Vixis Studio</p>
        <p style={invoiceStyles.userInfo}>
          <span style={invoiceStyles.bold}>{invoice.user_name}</span>
          <span>{invoice.request_type}</span>
        </p>
      </header>
      <div style={invoiceStyles.dividerLarge}></div>
      <div style={invoiceStyles.caloriesInfo}>
        <div style={invoiceStyles.leftContainer}>
          <h2 style={invoiceStyles.smallText}>Amount to pay</h2>
          <p style={invoiceStyles.amountLabel}>Total</p>
        </div>
        <span style={invoiceStyles.amountValue}>
          {formatPrice(invoice.amount, invoice.currency)}
        </span>
      </div>
      <div style={invoiceStyles.dividerMedium}></div>
      <div style={invoiceStyles.dailyValue}>
        <p style={invoiceStyles.deliveryTime}>
          <span style={invoiceStyles.bold}>Approximate delivery time</span>
          <span>{invoice.delivery_time}</span>
        </p>
        {invoice.custom_fields?.features &&
          Array.isArray(invoice.custom_fields.features) &&
          invoice.custom_fields.features.length > 0 && (
            <>
              {invoice.custom_fields.features.map((feature: any, index: number) => (
                <div key={index}>
                  <div style={invoiceStyles.divider}></div>
                  <p>
                    <span style={invoiceStyles.bold}>{feature.name || `Feature ${index + 1}`}</span>
                    <span>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: feature.currency === "USD" ? "USD" : "COP",
                        minimumFractionDigits: feature.currency === "USD" ? 2 : 0,
                      }).format(feature.price || 0)}
                    </span>
                  </p>
                </div>
              ))}
            </>
          )}
        <div style={invoiceStyles.dividerLarge}></div>
        <div style={invoiceStyles.paymentButtonContainer}>
          <a
            href="https://app.airtm.com/ivt/vixis"
            target="_blank"
            rel="noopener noreferrer"
            style={invoiceStyles.paymentButton}
            onClick={(e) => {
              e.preventDefault();
              window.open("https://app.airtm.com/ivt/vixis", "_blank");
              window.open("https://airtm.me/Vixis", "_blank");
            }}
          >
            Pay Now
          </a>
        </div>
        <div style={invoiceStyles.dividerMedium}></div>
        <p style={invoiceStyles.note}>
          * In the payment note you must put: Product #{(invoice.product_id || "").substring(0, 8)} - Invoice #{invoice.invoice_number} - Vixis
        </p>
      </div>
    </div>
  );
}

const invoiceStyles: Record<string, React.CSSProperties> = {
  label: {
    border: "2px solid black",
    width: "270px",
    margin: "20px auto",
    padding: "0 7px",
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "16px",
  },
  header: {
    marginBottom: "0",
  },
  title: {
    textAlign: "center",
    margin: "-4px 0",
    letterSpacing: "0.15px",
    fontWeight: 800,
    fontSize: "1.2em",
  },
  divider: {
    borderBottom: "1px solid #888989",
    margin: "2px 0",
  },
  dividerLarge: {
    height: "10px",
    backgroundColor: "black",
    border: "0",
    margin: "2px 0",
  },
  dividerMedium: {
    height: "5px",
    backgroundColor: "black",
    border: "0",
    margin: "2px 0",
  },
  studio: {
    margin: "4px 0",
    fontSize: "0.9em",
  },
  userInfo: {
    margin: "4px 0",
    display: "flex",
    justifyContent: "space-between",
  },
  bold: {
    fontWeight: 800,
  },
  caloriesInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  leftContainer: {
    display: "flex",
    flexDirection: "column",
  },
  smallText: {
    fontSize: "0.85rem",
    margin: "0",
    fontWeight: 400,
  },
  amountLabel: {
    margin: "-5px -2px",
    fontSize: "2em",
    fontWeight: 700,
  },
  amountValue: {
    margin: "-7px -2px",
    fontSize: "2.4em",
    fontWeight: 700,
  },
  dailyValue: {
    fontSize: "0.85rem",
  },
  deliveryTime: {
    margin: "4px 0",
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #888989",
    paddingBottom: "2px",
  },
  paymentButtonContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    margin: "10px 0",
  },
  paymentButton: {
    display: "block",
    padding: "10px 20px",
    backgroundColor: "#2093c4",
    color: "white",
    textAlign: "center",
    textDecoration: "none",
    borderRadius: "4px",
    fontWeight: 700,
    transition: "background-color 0.3s",
  },
  note: {
    fontSize: "0.6rem",
    margin: "5px 0",
    padding: "0 8px",
    textIndent: "-8px",
  },
};
