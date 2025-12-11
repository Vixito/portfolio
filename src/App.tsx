import "./styles/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home, About, NotFound, Socials } from "./pages";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}></Route>
        <Route path="/about" element={<About />}></Route>
        <Route path="*" element={<NotFound />}></Route>
        <Route
          path="/contact"
          element={<Navigate to="/socials" replace />}
        ></Route>
        <Route path="/socials" element={<Socials />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
