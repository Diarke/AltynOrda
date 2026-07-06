import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./App.tsx";
import { AdminApp } from "./admin/AdminApp.tsx";
import { AppProviders } from "./providers.tsx";
import "./lib/i18n.ts";
import "../styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </AppProviders>,
);
