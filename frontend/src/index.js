import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const hadController = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SpellBee still works normally if service-worker registration is unavailable.
    });

    if (hadController) {
      let announced = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (announced) return;
        announced = true;
        window.dispatchEvent(new CustomEvent("spellbee:update-ready"));
      });
    }
  });
}
