import { useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import PageTransition from "./PageTransition";
import AdsterraSocialbar from "../features/AdsterraSocialbar";

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isStudioPage = location.pathname === "/studio";

  // Páginas donde mostrar el Socialbar (lugares con espacios laterales)
  const showSocialbar =
    !isStudioPage &&
    (location.pathname === "/" ||
      location.pathname === "/blog" ||
      location.pathname === "/clients" ||
      location.pathname === "/projects" ||
      location.pathname === "/radio" ||
      location.pathname === "/skills-n-technologies" ||
      location.pathname === "/socials" ||
      location.pathname === "/store" ||
      location.pathname === "/studies" ||
      location.pathname === "/workxp");

  return (
    <div className="relative min-h-screen">
      {/* Solo mostrar grid-background si NO es Studio */}
      {!isStudioPage && (
        <div className="absolute inset-0 grid-background z-0"></div>
      )}
      {/* Adsterra Socialbar en los lados */}
      {showSocialbar && (
        <>
          <AdsterraSocialbar position="left" />
          <AdsterraSocialbar position="right" />
        </>
      )}
      <div className="relative z-10">
        <PageTransition>{children}</PageTransition>
      </div>
      <Navigation />
    </div>
  );
}

export default Layout;
