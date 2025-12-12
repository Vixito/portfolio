import "./styles/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  Home,
  About,
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

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path="/about" element={<About />}></Route>
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
