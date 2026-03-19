import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (typeof window !== "undefined") {
  const chunkReloadKey = "enmeta-vite-preload-reload";

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
