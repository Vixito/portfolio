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

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path="/about" element={<About />}></Route>
          <Route path="/admin" element={<Admin />}></Route>
          <Route path="/blog" element={<Blog />}></Route>
          <Route path="/clients" element={<Clients />}></Route>
          <Route path="/socials" element={<Socials />}></Route>
          <Route path="/studies" element={<Studies />}></Route>
          <Route path="/studio" element={<Studio />}></Route>
          <Route path="/projects" element={<Projects />}></Route>
          <Route path="/workxp" element={<WorkExperience />}></Route>
          <Route
            path="/skills-n-technologies"
            element={<SkillsNTechnologies />}
          ></Route>
          <Route path="/status" element={<Status />}></Route>
          <Route path="/store" element={<Store />}></Route>
          <Route path="/radio" element={<Radio />}></Route>
          <Route path="*" element={<NotFound />}></Route>
          <Route
            path="/contact"
            element={<Navigate to="/socials" replace />}
          ></Route>
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
