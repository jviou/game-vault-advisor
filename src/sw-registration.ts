// src/sw-registration.ts
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker.register(swUrl).then((registration) => {
      // Cas 1 : une version est déjà en attente au moment du chargement
      if (registration.waiting) {
        promptUpdate(registration);
      }

      // Cas 2 : une nouvelle version est trouvée pendant la session
      registration.onupdatefound = () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.onstatechange = () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller // => on n'est pas le tout premier chargement
          ) {
            // Nouvelle version prête, on propose de recharger
            promptUpdate(registration);
          }
        };
      };
    }).catch((err) => {
      // Optionnel: log silencieux
      console.debug('SW register error:', err);
    });
  });
}

function promptUpdate(reg: ServiceWorkerRegistration) {
  // Version minimaliste : confirm()
  const ok = window.confirm('🔄 Une nouvelle version est disponible. Recharger maintenant ?');
  if (!ok) return;

  // Demande au SW "en attente" de passer actif
  reg.waiting?.postMessage('SKIP_WAITING');

  // Quand il passe "activated", on recharge la page pour charger les nouveaux assets
  const listen = () => {
    if (reg.waiting && (reg as any).waiting.state !== 'activated') return;
    window.location.reload();
  };

  reg.waiting?.addEventListener('statechange', listen);
}
