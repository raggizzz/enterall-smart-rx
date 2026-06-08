import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installClientObservability } from "@/lib/observability";

if (typeof window !== "undefined") {
  installClientObservability();

  const chunkReloadKey = "enmeta-vite-preload-reload";

  if (import.meta.env.DEV && "serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith("enmeta-") || cacheName.startsWith("workbox-"))
              .map((cacheName) => caches.delete(cacheName)),
          );
        }
      } catch (error) {
        console.warn("Nao foi possivel limpar o service worker local.", error);
      }
    });
  }

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();

    if (!sessionStorage.getItem(chunkReloadKey)) {
      sessionStorage.setItem(chunkReloadKey, "1");
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    sessionStorage.removeItem(chunkReloadKey);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
