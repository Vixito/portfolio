import { useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import PageTransition from "./PageTransition";

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isStudioPage = location.pathname === "/studio";

  return (
    <div className="relative min-h-screen">
      {/* Solo mostrar grid-background si NO es Studio */}
      {!isStudioPage && (
        <div className="absolute inset-0 grid-background z-0"></div>
      )}
      <div className="relative z-10">
        <PageTransition>{children}</PageTransition>
      </div>
      <Navigation />
    </div>
  );
}

export default Layout;
