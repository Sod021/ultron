import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const storedTheme = localStorage.getItem("sentinel-theme");
const prefersDark = storedTheme ? storedTheme === "dark" : true;
document.documentElement.classList.toggle("dark", prefersDark);
if (!storedTheme) {
  localStorage.setItem("sentinel-theme", prefersDark ? "dark" : "light");
}

createRoot(document.getElementById("root")!).render(<App />);
