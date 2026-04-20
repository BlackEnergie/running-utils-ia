// =====================
// INITIALISATION
// =====================

genererTableauReference();
selectSeance("demi-cooper");
toggleFCInputs();
document.getElementById("charge-date").value = new Date().toISOString().split("T")[0];

// Activer les popovers Bootstrap (y compris ceux générés dynamiquement)
document.addEventListener("click", (e) => {
    const el = e.target.closest('[data-bs-toggle="popover"]');
    if (el) bootstrap.Popover.getOrCreateInstance(el, { sanitize: false }).toggle();
});
document.addEventListener("focusin", (e) => {
    const el = e.target.closest('[data-bs-toggle="popover"]');
    if (el) bootstrap.Popover.getOrCreateInstance(el, { sanitize: false }).show();
});
document.addEventListener("focusout", (e) => {
    const el = e.target.closest('[data-bs-toggle="popover"]');
    if (el) bootstrap.Popover.getOrCreateInstance(el, { sanitize: false }).hide();
});

// =====================
// PWA — SERVICE WORKER
// =====================

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// Bannière d'installation PWA
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById("pwa-install-banner");
    if (banner) banner.style.display = "flex";
});

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("pwa-install-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt = null;
            }
            document.getElementById("pwa-install-banner").style.display = "none";
        });
    }
    const close = document.getElementById("pwa-install-close");
    if (close) {
        close.addEventListener("click", () => {
            document.getElementById("pwa-install-banner").style.display = "none";
        });
    }
});

