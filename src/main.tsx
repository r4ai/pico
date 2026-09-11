import { App } from "@/app/app";
import "@/global.css";
import { fontFaceCss } from "@/core/settings/fonts";
import { recoverPendingCode } from "@/core/settings/search-params";
import { NuqsAdapter } from "nuqs/adapters/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

recoverPendingCode();

const fontFaces = document.createElement("style");
fontFaces.textContent = fontFaceCss();
document.head.append(fontFaces);

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <NuqsAdapter>
      <App />
    </NuqsAdapter>
  </StrictMode>,
);
