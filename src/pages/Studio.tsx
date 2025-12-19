import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

function Studio() {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline();

    if (logoRef.current) {
      tl.fromTo(
        logoRef.current,
        { scale: 0, rotation: -180, opacity: 0 },
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 1,
          ease: "back.out(1.7)",
        }
      );
    }

    if (contentRef.current) {
      tl.fromTo(
        contentRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" },
        "-=0.3"
      );
    }
  }, []);

  // Datos del slider (puedes personalizarlos)
  const slides = [
    {
      id: 1,
      image: "https://cdn.vixis.dev/Vixis+Studio+-+Logo.webp",
      brand: "Vixis Studio",
      name: "Misión",
      subtitle:
        "Nuestra misión es crear soluciones innovadoras y eficientes para nuestros clientes.",
      specs: [
        {
          label: "Tecnologías:",
          value: "Next.js + Python + React + TypeScript",
        },
        { label: "Estado:", value: "En desarrollo" },
        { label: "Cliente:", value: "C2B Communities" },
      ],
      badges: [{ text: "Status: Activo" }, { text: "Prioridad: Alta" }],
    },
    {
      id: 2,
      image: "https://cdn.vixis.dev/Vixis+Studio+-+Logo.webp",
      brand: "Vixis Studio",
      name: "Visión",
      subtitle:
        "Nuestra visión es ser un referente y una agencia de desarrollo que crea arte que conecta con las comunidades a través de la automatización.",
      specs: [
        {
          label: "Más tecnologías:",
          value: "Deno + Tailwind CSS + AWS + Supabase",
        },
        { label: "Estado:", value: "Próximamente..." },
        { label: "Cliente:", value: "B2B" },
      ],
      badges: [],
    },
    // Agregar más slides...
  ];

  useEffect(() => {
    // Inicializar slider
    if (sliderRef.current) {
      const slides = sliderRef.current.querySelectorAll(".slide");
      slides.forEach((slide, index) => {
        slide.addEventListener("click", () => {
          setActiveSlide(activeSlide === index ? null : index);
        });
      });
    }
  }, [activeSlide]);

  const logoUrl = "https://cdn.vixis.dev/Vixis+Studio+-+Small+Logo.webp";

  return (
    <div
      ref={containerRef}
      className="min-h-screen relative"
      style={{
        backgroundColor: "#0d0d0d",
        backgroundImage: `
          radial-gradient(circle, rgba(25, 191, 183, 0.6) 1px, transparent 1px),
          radial-gradient(circle, rgba(0, 207, 200, 0.4) 1px, transparent 1px),
          radial-gradient(circle, rgba(40, 227, 218, 0.5) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px, 40px 40px, 60px 60px",
        backgroundPosition: "0 0, 10px 10px, 30px 30px",
        paddingBottom: "80px",
      }}
    >
      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div ref={contentRef} className="space-y-12 pt-12">
          {/* Header con Logo, Título y Descripción */}
          <div className="text-center space-y-6">
            {/* Logo */}
            <div ref={logoRef} className="flex justify-center">
              <img
                src={logoUrl}
                alt="Vixis Studio Logo"
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 shadow-lg"
                style={{ borderColor: "#19BFB7" }}
                onError={(e) => {
                  e.currentTarget.src =
                    "https://cdn.vixis.dev/Vixis+Studio+-+Logo.webp";
                }}
              />
            </div>
            {/* Título */}
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight"
              style={{
                color: "#19BFB7",
                textShadow:
                  "0 0 20px rgba(25, 191, 183, 0.5), 0 0 40px rgba(25, 191, 183, 0.3)",
                letterSpacing: "-0.02em",
              }}
            >
              Vixis Studio
            </h1>
            {/* Descripción */}
            <p className="text-lg italic md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Creamos sistemas que piensan y arte que conecta.
            </p>
          </div>

          {/* Slider Acordeón */}
          <div className="slider-container rounded-lg" ref={sliderRef}>
            <div className="now-showing">Now in Colombia</div>

            <div className="accordion-slider">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`slide ${activeSlide === index ? "active" : ""}`}
                  style={{ backgroundImage: `url(${slide.image})` }}
                >
                  <div className="slide-content">
                    <div className="slide-number">
                      {String(slide.id).padStart(2, "0")}
                    </div>
                    <div className="car-brand">{slide.brand}</div>
                    <div className="car-name">{slide.name}</div>
                    <div className="car-subtitle">{slide.subtitle}</div>
                    <div className="car-specs">
                      {slide.specs.map((spec, i) => (
                        <div key={i} className="spec-row">
                          <span className="spec-label">{spec.label}</span>
                          <span className="spec-value">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="performance-badges">
                      {slide.badges.map((badge, i) => (
                        <div key={i} className="badge">
                          <div className="badge-icon"></div>
                          <span>{badge.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="add-button"></div>
                </div>
              ))}
            </div>

            <button
              className="navigation-arrows nav-prev"
              onClick={() => {
                const prevIndex =
                  activeSlide === null
                    ? slides.length - 1
                    : (activeSlide - 1 + slides.length) % slides.length;
                setActiveSlide(prevIndex);
              }}
            >
              ‹
            </button>
            <button
              className="navigation-arrows nav-next"
              onClick={() => {
                const nextIndex =
                  activeSlide === null ? 0 : (activeSlide + 1) % slides.length;
                setActiveSlide(nextIndex);
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .slider-container {
          width: 100%;
          max-width: 1200px;
          height: 70vh;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          margin: 0 auto;
        }
        
        .now-showing {
          position: absolute;
          top: 20px;
          left: 20px;
          color: #9fff6b;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
        }
        
        .now-showing::before {
          content: "";
          width: 6px;
          height: 6px;
          background: #9fff6b;
          border-radius: 50%;
        }
        
        .accordion-slider {
          display: flex;
          height: 100%;
          position: relative;
        }
        
        .slide {
          flex: 1;
          position: relative;
          cursor: pointer;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          filter: grayscale(1);
        }
        
        .slide:hover {
          filter: grayscale(0);
        }
        
        .slide.active {
          flex: 2.5;
          filter: grayscale(0);
        }
        
        .slide::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 80%);
        }
        
        .slide-content {
          position: absolute;
          bottom: 30px;
          left: 30px;
          right: 30px;
          color: white;
          z-index: 2;
        }
        
        .slide.active .slide-content {
          bottom: 80px;
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
        }
        
        .slide-number {
          font-size: 64px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1;
          position: absolute;
          bottom: 30px;
          left: 30px;
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .slide.active .slide-number {
          bottom: auto;
          top: -50px;
          font-size: 48px;
          left: 0;
        }
        
        .car-brand {
          font-size: 16px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 5px;
          transform: rotate(-90deg);
          transform-origin: left bottom;
          position: absolute;
          bottom: 90px;
          left: 30px;
          white-space: nowrap;
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .slide.active .car-brand {
          transform: rotate(0deg);
          position: static;
          transform-origin: unset;
        }
        
        .car-name {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transition-delay: 0s;
        }
        
        .slide.active .car-name {
          opacity: 1;
          transform: translateY(0) translateX(60px);
          transition-delay: 0.3s;
        }
        
        .car-subtitle {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 20px;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transition-delay: 0s;
        }
        
        .slide.active .car-subtitle {
          opacity: 1;
          transform: translateY(0) translateX(60px);
          transition-delay: 0.4s;
        }
        
        .car-specs {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transition-delay: 0s;
        }
        
        .slide.active .car-specs {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 0.5s;
        }
        
        .spec-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 14px;
          opacity: 0;
          transform: translateX(-20px);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .slide.active .spec-row {
          opacity: 1;
          transform: translateX(0);
        }
        
        .slide.active .spec-row:nth-child(1) { transition-delay: 0.6s; }
        .slide.active .spec-row:nth-child(2) { transition-delay: 0.65s; }
        .slide.active .spec-row:nth-child(3) { transition-delay: 0.7s; }
        .slide.active .spec-row:nth-child(4) { transition-delay: 0.75s; }
        
        .spec-label {
          color: rgba(255, 255, 255, 0.7);
        }
        
        .spec-value {
          color: white;
          font-weight: 600;
        }
        
        .performance-badges {
          display: flex;
          gap: 12px;
          margin-top: 15px;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transition-delay: 0s;
        }
        
        .slide.active .performance-badges {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 0.8s;
        }
        
        .badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .slide.active .badge {
          opacity: 1;
          transform: scale(1);
        }
        
        .slide.active .badge:nth-child(1) { transition-delay: 0.85s; }
        .slide.active .badge:nth-child(2) { transition-delay: 0.9s; }
        .slide.active .badge:nth-child(3) { transition-delay: 0.95s; }
        
        .badge-icon {
          width: 8px;
          height: 8px;
          background: #9fff6b;
          border-radius: 50%;
        }
        
        .add-button {
          position: absolute;
          bottom: 30px;
          right: 30px;
          width: 32px;
          height: 32px;
          background: transparent;
          border: 2px solid #9fff6b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.4s ease;
          z-index: 3;
        }
        
        .add-button::before,
        .add-button::after {
          content: "";
          position: absolute;
          background: #9fff6b;
          transition: all 0.4s ease;
        }
        
        .add-button::before {
          width: 12px;
          height: 2px;
        }
        
        .add-button::after {
          width: 2px;
          height: 12px;
        }
        
        .slide.active .add-button::after {
          opacity: 0;
          transform: scale(0);
        }
        
        .navigation-arrows {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          z-index: 4;
          backdrop-filter: blur(10px);
        }
        
        .nav-prev {
          left: 20px;
        }
        
        .nav-next {
          right: 20px;
        }
        
        .navigation-arrows:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        @media (max-width: 768px) {
          .accordion-slider {
            flex-direction: column;
          }
          
          .slide {
            flex: 1;
            min-height: 80px;
          }
          
          .slide.active {
            flex: 2;
          }
          
          .slide-number {
            font-size: 32px;
          }
          
          .car-brand {
            transform: none;
            position: static;
          }
        }
      `}</style>
    </div>
  );
}

export default Studio;
