import { App } from "@/app";
import "@/global.css";
import { fontFaceCss } from "@/features/settings/fonts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const fontFaces = document.createElement("style");
fontFaces.textContent = fontFaceCss();
document.head.append(fontFaces);

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
