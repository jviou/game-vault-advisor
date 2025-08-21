import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// --- Enregistrement du Service Worker + auto-update ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // 1) S’il y a déjà un SW “waiting”, on lui dit de s’activer tout de suite
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // 2) Quand une MAJ est trouvée, on force aussi l’activation immédiate
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              // Une nouvelle version est prête → active-toi
              sw.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(console.error);

    // 3) Quand le contrôleur change (nouveau SW actif), on recharge UNE fois
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}
