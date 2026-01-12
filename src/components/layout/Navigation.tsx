import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useLanguageStore } from "../../stores/useLanguageStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { setGlobalDropdown } from "../features/LanguageSelector";

function Navigation() {
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContainerRef = useRef<HTMLLIElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const settingsContainerRef = useRef<HTMLLIElement>(null);
  const { language, setLanguage } = useLanguageStore();
  const { theme, toggleTheme } = useThemeStore();

  const trabajoItems = [
    { path: "/projects", label: language === "es" ? "Proyectos" : "Projects" },
    { path: "/clients", label: language === "es" ? "Clientes" : "Clients" },
    {
      path: "/workxp",
      label: language === "es" ? "Experiencia Laboral" : "Work Experience",
    },
    {
      path: "/skills-n-technologies",
      label: language === "es" ? "Stack" : "Stack",
    },
  ];

  const simpleItems = [
    {
      path: "/",
      label: language === "es" ? "Inicio" : "Home",
      icon: "🏠",
    },
    {
      path: "/studio",
      label: "Studio",
      icon: "🎨", // Emoji para móvil (se reemplazará por logo)
      iconImage: "https://cdn.vixis.dev/Vixis+Studio+-+Small+Logo.webp", // Logo para móvil
    },
    {
      path: "/about",
      label: language === "es" ? "Acerca de" : "About",
      icon: "👤",
    },
    {
      path: "/socials",
      label: language === "es" ? "Redes Sociales" : "Social Media",
      icon: "📱",
    },
    {
      path: "/store",
      label: language === "es" ? "Tienda" : "Store",
      icon: "🛒",
    },
  ];

  const afterDividerItems = [
    {
      path: "/radio",
      label: "Radio",
      icon: "📻",
    },
    {
      path: "/blog",
      label: "Blog",
      icon: "📝",
    },
  ];

  const donations = [
    { name: "Streamlabs", url: "https://streamlabs.com/vixisgg/tip" },
    { name: "Ko-fi", url: "https://ko-fi.com/vixisss" },
    { name: "PayPal", url: "https://paypal.me/vizzzis" },
    { name: "Airtm", url: "https://airtm.me/vixis" },
    { name: "Buy Me a Coffee", url: "https://buymeacoffee.com/vixis" },
  ];

  // Animación del dropdown de Trabajo
  useEffect(() => {
    if (dropdownRef.current) {
      if (openDropdown === "trabajo") {
        setGlobalDropdown("navigation", () => setOpenDropdown(null));
        dropdownRef.current.style.display = "block";
        gsap.fromTo(
          dropdownRef.current,
          { opacity: 0, y: 10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out" }
        );
      } else {
        if (dropdownRef.current.style.display !== "none") {
          gsap.to(dropdownRef.current, {
            opacity: 0,
            y: 10,
            scale: 0.95,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
              if (dropdownRef.current) {
                dropdownRef.current.style.display = "none";
              }
            },
          });
        }
      }
    }
  }, [openDropdown]);

  // Animación del dropdown de Ajustes
  useEffect(() => {
    if (settingsDropdownRef.current) {
      if (openDropdown === "settings") {
        setGlobalDropdown("navigation", () => setOpenDropdown(null));
        settingsDropdownRef.current.style.display = "block";
        gsap.fromTo(
          settingsDropdownRef.current,
          { opacity: 0, y: 10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out" }
        );
      } else {
        if (settingsDropdownRef.current.style.display !== "none") {
          gsap.to(settingsDropdownRef.current, {
            opacity: 0,
            y: 10,
            scale: 0.95,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
              if (settingsDropdownRef.current) {
                settingsDropdownRef.current.style.display = "none";
              }
            },
          });
        }
      }
    }
  }, [openDropdown]);

  const handleMouseEnter = (type: "trabajo" | "settings") => {
    setOpenDropdown(type);
  };

  const handleMouseLeave = (type: "trabajo" | "settings") => {
    setTimeout(() => {
      if (openDropdown === type) {
        setOpenDropdown(null);
      }
    }, 150);
  };

  const handleLanguageChange = (lang: "es" | "en") => {
    setLanguage(lang);
    setOpenDropdown(null);
  };

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const isStudioPage = location.pathname === "/studio";

  return (
    <nav
      id="cubicle"
      className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-white/90 backdrop-blur-sm border-t border-black dark:border-black z-50 w-full transition-colors"
      style={{
        padding: 0,
        margin: 0,
        transform: "translateY(0)",
        opacity: 1,
      }}
    >
      <ul className="links">
        {simpleItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              title={item.label}
              data-icon={item.icon}
              {...(item.iconImage
                ? {
                    "data-icon-image": item.iconImage,
                    style: {
                      "--studio-logo-url": `url(${item.iconImage})`,
                    } as React.CSSProperties,
                  }
                : {})}
            />
          </li>
        ))}

        {/* Trabajo con dropdown */}
        <li
          ref={dropdownContainerRef}
          className="relative"
          onMouseEnter={() => handleMouseEnter("trabajo")}
          onMouseLeave={() => handleMouseLeave("trabajo")}
        >
          <div
            className="nav-link-dropdown"
            title={language === "es" ? "Trabajo" : "Work"}
            data-icon="💼"
          />
          {/* Área invisible de conexión */}
          <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" />
          {/* Dropdown */}
          <div
            ref={dropdownRef}
            style={{ display: "none" }}
            className={`dropdown-menu absolute bottom-full left-1/2 -translate-x-1/2 bg-white dark:bg-black border border-black dark:border-white min-w-[220px] z-50 mb-0 transition-colors ${
              isStudioPage ? "studio-dropdown" : ""
            }`}
            onMouseEnter={() => handleMouseEnter("trabajo")}
            onMouseLeave={() => handleMouseLeave("trabajo")}
          >
            {trabajoItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`dropdown-item block px-4 py-2 text-left hover:bg-purple/10 dark:hover:bg-purple/80 transition-colors cursor-pointer text-black dark:text-white whitespace-nowrap ${
                  isActive(item.path)
                    ? "bg-purple/20 dark:bg-purple/30 text-purple font-semibold"
                    : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </li>

        {/* Estudios */}
        <li>
          <Link
            to="/studies"
            title={language === "es" ? "Estudios" : "Studies"}
            data-icon="🎓"
          />
        </li>

        {afterDividerItems.map((item) => (
          <li key={item.path}>
            <Link to={item.path} title={item.label} data-icon={item.icon} />
          </li>
        ))}

        {/* Ajustes con dropdown */}
        <li
          ref={settingsContainerRef}
          className="relative"
          onMouseEnter={() => handleMouseEnter("settings")}
          onMouseLeave={() => handleMouseLeave("settings")}
        >
          <div
            className="nav-link-dropdown"
            title={language === "es" ? "Ajustes" : "Settings"}
            data-icon="⚙️"
          />
          {/* Área invisible de conexión */}
          <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" />
          {/* Dropdown */}
          <div
            ref={settingsDropdownRef}
            style={{ display: "none" }}
            className={`dropdown-menu absolute bottom-full left-1/2 -translate-x-1/2 bg-white dark:bg-black border border-black dark:border-white min-w-[180px] z-50 mb-0 transition-colors ${
              isStudioPage ? "studio-dropdown" : ""
            }`}
            onMouseEnter={() => handleMouseEnter("settings")}
            onMouseLeave={() => handleMouseLeave("settings")}
          >
            {/* Sección de Idioma */}
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-black dark:text-white uppercase flex items-center gap-2">
                <span>🌐</span>
                <span>{language === "es" ? "Idioma" : "Language"}</span>
              </div>
              <button
                onClick={() => handleLanguageChange("es")}
                className={`dropdown-item w-full px-4 py-2 text-left hover:bg-purple/10 dark:hover:bg-purple/80 transition-colors cursor-pointer text-black dark:text-white ${
                  language === "es"
                    ? "bg-purple/20 dark:bg-purple/30 text-purple font-semibold"
                    : ""
                }`}
              >
                Español
              </button>
              <button
                onClick={() => handleLanguageChange("en")}
                className={`dropdown-item w-full px-4 py-2 text-left hover:bg-purple/10 dark:hover:bg-purple/80 transition-colors cursor-pointer text-black dark:text-white ${
                  language === "en"
                    ? "bg-purple/20 dark:bg-purple/30 text-purple font-semibold"
                    : ""
                }`}
              >
                English
              </button>
            </div>

            {/* Sección de Tema */}
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-black dark:text-white uppercase flex items-center gap-2">
                <span>🎨</span>
                <span>{language === "es" ? "Tema" : "Theme"}</span>
              </div>
              <button
                onClick={() => {
                  toggleTheme();
                  setOpenDropdown(null);
                }}
                className="dropdown-item w-full px-4 py-2 text-left hover:bg-purple/10 dark:hover:bg-purple/80 transition-colors cursor-pointer text-black dark:text-white flex items-center justify-between"
              >
                <span>
                  {theme === "light"
                    ? language === "es"
                      ? "Claro"
                      : "Light"
                    : language === "es"
                    ? "Oscuro"
                    : "Dark"}
                </span>
                <span>{theme === "light" ? "☀️" : "🌙"}</span>
              </button>
            </div>

            {/* Sección de Donaciones */}
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-black dark:text-white uppercase flex items-center gap-2">
                <span>💝</span>
                <span>{language === "es" ? "Donaciones" : "Donations"}</span>
              </div>
              {donations.map((donation) => (
                <a
                  key={donation.name}
                  href={donation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dropdown-item block px-4 py-2 text-left hover:bg-blue/10 dark:hover:bg-blue/80 transition-colors text-black dark:text-white cursor-pointer"
                >
                  {donation.name}
                </a>
              ))}
            </div>

            {/* Sección de Repositorio */}
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-black dark:text-white uppercase flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{language === "es" ? "Código" : "Code"}</span>
              </div>
              <a
                href="https://github.com/Vixito/portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="dropdown-item block px-4 py-2 text-left hover:bg-purple/10 dark:hover:bg-purple/80 transition-colors text-black dark:text-white cursor-pointer"
              >
                {language === "es" ? "Repositorio" : "Repository"}
              </a>
            </div>
          </div>
        </li>
      </ul>

      <style>{`
        @import url('https://fonts.bunny.net/css?family=nunito:400,400i,600,600i,800,800i');
        
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        
        :root {
          --color1: #000;
          --color2: #fff;
          --height: 40px;
          --width: 110px;
          --border: 2px;
        }
        
        .dark {
          --color1:rgb(11, 11, 11);
          --color2:rgb(248, 248, 248);
        }
        
        #cubicle {
          height: var(--height);
          width: 100%;
          box-sizing: border-box;
        }
        
        #cubicle > .links {
          display: flex;
          width: 100%;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
          margin: 0;
          padding: 0;
          list-style: none;
          box-sizing: border-box;
        }
        
        #cubicle > .links li {
          flex: 1;
          height: var(--height);
          margin: 0 0 0 calc(-1 * var(--border));
          perspective: 1000px;
          z-index: 1;
          position: relative;
        }
        
        #cubicle > .links li:first-child {
          margin-left: 0;
        }
        
        #cubicle > .links li:hover {
          z-index: 2;
        }
        
        #cubicle > .links a {
          display: block;
          height: var(--height);
          position: relative;
          text-decoration: none;
          transform-style: preserve-3d;
          transform: translateZ(calc(-1 * calc(var(--height) / 2)));
          transition: transform 0.5s cubic-bezier(.08,.82,.17,1);
        }
        
        #cubicle > .links a:hover {
          transform: translateZ(calc(-1 * calc(var(--height) / 2))) rotateX(-90deg);
        }
        
        #cubicle > .links .nav-link-dropdown {
          display: block;
          height: var(--height);
          position: relative;
          text-decoration: none;
          transform-style: preserve-3d;
          transform: translateZ(calc(-1 * calc(var(--height) / 2)));
          transition: transform 0.5s cubic-bezier(.08,.82,.17,1);
        }
        
        #cubicle > .links li:hover .nav-link-dropdown {
          transform: translateZ(calc(-1 * calc(var(--height) / 2))) rotateX(-90deg);
        }
        
        #cubicle > .links a::before,
        #cubicle > .links a::after {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: var(--height);
          position: absolute;
          border: var(--border) solid var(--color1);
          content: attr(title);
          left: 0;
          top: 0;
          font-family: 'Nunito', sans-serif;
          font-weight: 400;
        }
        
        #cubicle > .links .nav-link-dropdown::before,
        #cubicle > .links .nav-link-dropdown::after {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: var(--height);
          position: absolute;
          border: var(--border) solid var(--color1);
          content: attr(title);
          left: 0;
          top: 0;
          font-family: 'Nunito', sans-serif;
          font-weight: 400;
        }
        
        /* Responsive: Mostrar íconos en móviles */
        @media (max-width: 768px) {
          /* En móvil, mostrar logo de Studio cuando existe data-icon-image (debe ir primero para sobrescribir) */
          #cubicle > .links a[data-icon-image]::before,
          #cubicle > .links a[data-icon-image]::after {
            content: "" !important;
            background-image: var(--studio-logo-url) !important;
            background-size: 20px 20px !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
          }
          
          #cubicle > .links a::before,
          #cubicle > .links a::after {
            content: attr(data-icon);
            font-size: 1.2rem;
          }
          
          #cubicle > .links .nav-link-dropdown::before,
          #cubicle > .links .nav-link-dropdown::after {
            content: attr(data-icon);
            font-size: 1.2rem;
          }
        }
        
        #cubicle > .links li:not(:first-child) a::before,
        #cubicle > .links li:not(:first-child) a::after {
          left: calc(-1 * var(--border));
        }
        
        #cubicle > .links li:not(:first-child) .nav-link-dropdown::before,
        #cubicle > .links li:not(:first-child) .nav-link-dropdown::after {
          left: calc(-1 * var(--border));
        }
        
        #cubicle > .links a::before,
        #cubicle > .links .nav-link-dropdown::before {
          background-color: var(--color2);
          color: var(--color1);
          transform: rotateY(0deg) translateZ(calc(var(--height) / 2));
        }
        
        #cubicle > .links a::after,
        #cubicle > .links .nav-link-dropdown::after {
          background-color: var(--color1);
          color: var(--color2);
          transform: rotateX(90deg) translateZ(calc(var(--height) / 2));
        }
        
        /* Eliminar todos los bordes internos de los dropdowns */
        .dropdown-menu {
          border: 2px solid var(--color1) !important;
        }
        
        .dropdown-menu > div,
        .dropdown-menu > a,
        .dropdown-menu > button,
        .dropdown-menu div > div,
        .dropdown-menu div > a,
        .dropdown-menu div > button {
          border: none !important;
          border-top: none !important;
          border-bottom: none !important;
          border-left: none !important;
          border-right: none !important;
        }
        
        /* Desactivar animación 3D y eliminar bordes en elementos del dropdown */
        .dropdown-item {
          transform: none !important;
          transform-style: flat !important;
          border-top: none !important;
          border-bottom: none !important;
        }
        
        .dark .dropdown-item {
          color: #f3f4f6 !important;
        }
        
        .dropdown-item::before,
        .dropdown-item::after {
          display: none !important;
        }
        
        .dropdown-item:hover {
          transform: none !important;
        }
      `}</style>
    </nav>
  );
}

export default Navigation;
