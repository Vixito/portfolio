import React from "react";
import { useTranslation } from "../lib/i18n";

export default function HowToPayMe() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 pb-20 font-['Poppins',sans-serif]">
      <h1 className="text-4xl font-bold text-purple mb-5 text-center dark:text-cyan-300">
        {t("howToPay.title") || "How to Pay Me"}
      </h1>
      
      <div className="mb-8 text-lg leading-relaxed text-gray-800 dark:text-gray-200">
        <p className="mb-5">
          {t("howToPay.description") || "Follow these simple steps to complete your payment:"}
        </p>
      </div>

      {/* Lista numérica de pasos */}
      <div className="mb-10 text-lg text-gray-800 dark:text-gray-200">
        <style>{`
          .numbered-list {
            counter-reset: step-counter;
            list-style: none;
            padding-left: 0;
            margin: 0;
          }
          .numbered-list li {
            counter-increment: step-counter;
            margin-bottom: 15px;
            padding-left: 35px;
            position: relative;
          }
          .numbered-list li::before {
            content: counter(step-counter) ".";
            position: absolute;
            left: 0;
            color: #331d83;
            font-weight: 700;
            font-size: 1.1rem;
          }
          .dark .numbered-list li::before {
            color: #2093c4;
          }
          .numbered-list li:last-child {
            margin-bottom: 0;
          }
        `}</style>
        <ol className="numbered-list">
          <li>
            {t("howToPay.step1") || "Make sure to include the product ID and invoice number in the payment note."}
          </li>
          <li>
            {t("howToPay.step2") || "Your payment will be processed within 24-48 hours after confirmation."}
          </li>
          <li>
            {t("howToPay.step3") || "If you have any questions, please contact me through my social media."}
          </li>
        </ol>
      </div>

      <div className="text-center mb-8">
        <div className="relative pb-[56.25%] h-0 overflow-hidden max-w-full bg-black dark:bg-gray-800 rounded-lg">
          <iframe
            src="https://www.loom.com/embed/YOUR_VIDEO_ID"
            frameBorder="0"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full"
            title="How to Pay - Video Tutorial"
          />
        </div>
      </div>

      <div className="flex justify-between items-center gap-8 flex-wrap">
        {/* Botón de pago alineado a la izquierda */}
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
          {t("howToPay.payButton") || "Pay now"}
        </a>

        {/* Powered by Airtm alineado a la derecha */}
        <div className="flex flex-col items-end gap-2 flex-1 min-w-[250px] mt-16">
          <p className="text-sm text-gray-600 dark:text-gray-300 m-0 text-right">
            {t("howToPay.poweredBy") || "Secure payments powered by"}
          </p>
          <a
            href="https://app.airtm.com/ivt/vixis"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 no-underline transition-opacity duration-200 hover:opacity-80"
          >
            <span className="text-lg cursor-pointer">🏦</span>
            <span className="text-purple dark:text-white font-bold text-base cursor-pointer">
              Airtm
            </span>
            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-xl text-xs text-gray-700 dark:text-gray-200 font-medium cursor-pointer">
              {t("howToPay.paymentMethods") || "+500 payment methods"}
            </span>
          </a>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 m-0 text-right">
            {t("howToPay.paymentDetails") || "Bank transfers, crypto, mobile payments & more. Cancel anytime."}
          </p>
        </div>
      </div>
    </div>
  );
}
