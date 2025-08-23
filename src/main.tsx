import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Monte l'app
createRoot(document.getElementById("root")!).render(<App />);

// --- Enregistrement du Service Worker + auto-update (sans hard refresh manuel) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");

      // 1) S'il y a déjà un SW en "waiting", on lui dit de s'activer tout de suite
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      // 2) Dès qu'une nouvelle version est trouvée, on force l'activation immédiate
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            // Nouvelle version prête → active-toi
            sw.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      // 3) Quand le contrôleur change (nouveau SW actif), on recharge UNE seule fois
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    } catch (err) {
      console.error("[SW] registration error:", err);
    }
  });
}
