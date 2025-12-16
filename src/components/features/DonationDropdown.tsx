import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { setGlobalDropdown } from "./LanguageSelector";

function DonationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const donations = [
    { name: "Streamlabs", url: "https://streamlabs.com/vixisgg/tip" },
    { name: "Ko-fi", url: "https://ko-fi.com/vixisss" },
    { name: "PayPal", url: "https://paypal.me/vizzzis" },
    { name: "Airtm", url: "https://airtm.me/vixis" },
    { name: "Buy Me a Coffee", url: "https://buymeacoffee.com/vixis" },
  ];

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Animación del dropdown
  useEffect(() => {
    if (dropdownRef.current) {
      if (isOpen) {
        setGlobalDropdown("donation", handleClose);
        dropdownRef.current.style.display = "block";
        gsap.fromTo(
          dropdownRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out" }
        );
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dropdownRef.current) {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          if (dropdownRef.current) {
            dropdownRef.current.style.display = "none";
          }
          setIsOpen(false);
          setGlobalDropdown(null, () => {});
        },
      });
    } else {
      setIsOpen(false);
      setGlobalDropdown(null, () => {});
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  // Prevenir doble click
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggle();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleButtonClick}
        className="w-12 h-12 rounded-full bg-blue text-white hover:bg-blue/90 transition-colors flex items-center justify-center text-xl cursor-pointer"
        aria-label="Donaciones"
      >
        💝
      </button>

      <div
        ref={dropdownRef}
        style={{ display: "none" }}
        className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl overflow-hidden min-w-[160px] z-50"
      >
        {donations.map((donation) => (
          <a
            key={donation.name}
            href={donation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-left hover:bg-blue/10 transition-colors text-gray-700 cursor-pointer"
          >
            {donation.name}
          </a>
        ))}
      </div>
    </div>
  );
}

export default DonationDropdown;
