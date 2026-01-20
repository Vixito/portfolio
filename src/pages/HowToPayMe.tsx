import React from "react";
import { useTranslation } from "../lib/i18n";

export default function HowToPayMe() {
  const { t } = useTranslation();

  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "40px 20px",
      fontFamily: "'Poppins', sans-serif"
    }}>
      <h1 style={{ 
        fontSize: "2.5rem", 
        fontWeight: 700, 
        color: "#331d83",
        marginBottom: "20px",
        textAlign: "center"
      }}>
        {t("howToPay.title") || "How to Pay Me"}
      </h1>
      
      <div style={{ 
        marginBottom: "30px",
        fontSize: "1.1rem",
        lineHeight: "1.6",
        color: "#333"
      }}>
        <p style={{ marginBottom: "20px" }}>
          {t("howToPay.description") || "Follow these simple steps to complete your payment:"}
        </p>
      </div>

      <div style={{ 
        marginBottom: "40px",
        textAlign: "center"
      }}>
        <div style={{
          position: "relative",
          paddingBottom: "56.25%", // 16:9 aspect ratio
          height: 0,
          overflow: "hidden",
          maxWidth: "100%",
          background: "#000",
          borderRadius: "8px"
        }}>
          <iframe
            src="https://www.loom.com/embed/YOUR_VIDEO_ID"
            frameBorder="0"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%"
            }}
            title="How to Pay - Video Tutorial"
          />
        </div>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        alignItems: "center"
      }}>
        <a
          href="https://app.airtm.com/ivt/vixis"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "15px 40px",
            backgroundColor: "#0d0d0d",
            color: "#03fff6",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "1.1rem",
            transition: "transform 0.2s, box-shadow 0.2s",
            textAlign: "center",
            minWidth: "250px"
          }}
          onClick={(e) => {
            e.preventDefault();
            window.open("https://app.airtm.com/ivt/vixis", "_blank");
            window.open("https://airtm.me/Vixis", "_blank");
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(3, 255, 246, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {t("howToPay.payButton") || "Pay Now"}
        </a>
      </div>

      <div style={{
        marginTop: "40px",
        padding: "20px",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        fontSize: "0.95rem",
        lineHeight: "1.6"
      }}>
        <h2 style={{ 
          fontSize: "1.3rem", 
          fontWeight: 600, 
          color: "#331d83",
          marginBottom: "15px"
        }}>
          {t("howToPay.importantNote") || "Important Notes:"}
        </h2>
        <ul style={{ 
          margin: 0, 
          paddingLeft: "20px",
          color: "#555"
        }}>
          <li style={{ marginBottom: "10px" }}>
            {t("howToPay.note1") || "Make sure to include the invoice number and product ID in the payment note."}
          </li>
          <li style={{ marginBottom: "10px" }}>
            {t("howToPay.note2") || "Your payment will be processed within 24-48 hours after confirmation."}
          </li>
          <li>
            {t("howToPay.note3") || "If you have any questions, please contact us through our social media."}
          </li>
        </ul>
      </div>
    </div>
  );
}
