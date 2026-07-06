import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppProviders } from "./providers.tsx";
import "./lib/i18n.ts";
import "../styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <App />
  </AppProviders>,
);
