import "./styles/App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  Home,
  About,
  Admin,
  Blog,
  Clients,
  Socials,
  Studies,
  Studio,
  Projects,
  WorkExperience,
  SkillsNTechnologies,
  Status,
  Store,
  Radio,
  NotFound,
} from "./pages";
import Layout from "./components/layout/Layout";
import { useEffect } from "react";

// Componente que anima el título de la pestaña
function AnimatedTitle() {
  useEffect(() => {
    const title = "Vixis | Portfolio";
    let index = 0;
    let direction = 1;

    function isWhiteSpace(letter: string) {
      const code = letter.charCodeAt(0);
      return code === 0x0020;
    }

    function updateTitle() {
      index += direction;

      if (isWhiteSpace(title.charAt(index))) {
        index += direction;
      }

      document.title = title.substring(0, index);

      if (index >= title.length || index <= 0) {
        direction *= -1;
      }
    }

    // Iniciar la animación
    const interval = setInterval(updateTitle, 400);

    // Limpiar el intervalo cuando el componente se desmonte
    return () => {
      clearInterval(interval);
      // Restaurar el título original al desmontar
      document.title = "Vixis | Portfolio";
    };
  }, []);

  return null;
}

// Componente interno que maneja el scroll (debe estar dentro del Router)
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Para Home, scroll horizontal a la izquierda
    if (location.pathname === "/") {
      window.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    } else {
      // Para otras páginas, scroll vertical arriba
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  }, [location.pathname]);

  return null;
}

// Componente wrapper para la ruta raíz que verifica el hostname
function RootRoute() {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  if (hostname === "admin.vixis.dev") {
    return <Admin />;
  }

  return (
    <Layout>
      <Home />
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedTitle />
      <ScrollToTop />
      <Routes>
        <Route
          path="/contact"
          element={<Navigate to="/socials" replace />}
        ></Route>
        <Route path="/" element={<RootRoute />}></Route>
        <Route
          path="/about"
          element={
            <Layout>
              <About />
            </Layout>
          }
        ></Route>
        <Route
          path="/blog"
          element={
            <Layout>
              <Blog />
            </Layout>
          }
        ></Route>
        <Route
          path="/clients"
          element={
            <Layout>
              <Clients />
            </Layout>
          }
        ></Route>
        <Route
          path="/socials"
          element={
            <Layout>
              <Socials />
            </Layout>
          }
        ></Route>
        <Route
          path="/studies"
          element={
            <Layout>
              <Studies />
            </Layout>
          }
        ></Route>
        <Route
          path="/studio"
          element={
            <Layout>
              <Studio />
            </Layout>
          }
        ></Route>
        <Route
          path="/projects"
          element={
            <Layout>
              <Projects />
            </Layout>
          }
        ></Route>
        <Route
          path="/workxp"
          element={
            <Layout>
              <WorkExperience />
            </Layout>
          }
        ></Route>
        <Route
          path="/skills-n-technologies"
          element={
            <Layout>
              <SkillsNTechnologies />
            </Layout>
          }
        ></Route>
        <Route
          path="/status"
          element={
            <Layout>
              <Status />
            </Layout>
          }
        ></Route>
        <Route
          path="/store"
          element={
            <Layout>
              <Store />
            </Layout>
          }
        ></Route>
        <Route
          path="/radio"
          element={
            <Layout>
              <Radio />
            </Layout>
          }
        ></Route>
        <Route
          path="*"
          element={
            <Layout>
              <NotFound />
            </Layout>
          }
        ></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
