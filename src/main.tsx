import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import { App } from "./app/App";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("No existe el elemento #root en index.html");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
