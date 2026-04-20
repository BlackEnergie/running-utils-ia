// =====================
// UTILITAIRES COMMUNS
// =====================

function formatAllure(s) {
    const m = Math.floor(s / 60),
        sec = Math.round(s % 60);
    return `${m}'${sec.toString().padStart(2, "0")}"`;
}

function formatTemps(s) {
    s = Math.round(s);
    const h = Math.floor(s / 3600),
        m = Math.floor((s % 3600) / 60),
        sec = s % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}min ${sec.toString().padStart(2, "0")}s`;
    return `${m}min ${sec.toString().padStart(2, "0")}s`;
}

function showResult(id) {
    document.getElementById(id).classList.add("show");
}

function formatDate(d) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// =====================
// HELPERS UI
// =====================

function setDistanceField(id, val) {
    document.getElementById(id).value = val;
}

function switchMobileTab(tabId) {
    const tabEl = document.querySelector('#mainTabs a[href="#' + tabId + '"]');
    if (tabEl) bootstrap.Tab.getOrCreateInstance(tabEl).show();
}

// Synchroniser le select mobile quand un onglet desktop est cliqué
document.addEventListener("shown.bs.tab", (e) => {
    const sel = document.getElementById("mobile-tab-select");
    if (sel) sel.value = e.target.getAttribute("href").replace("#", "");
});

