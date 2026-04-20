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

function showTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('show', 'active');
    }
    const sidebarLink = document.querySelector('#mainTabs [href="#' + tabId + '"]');
    document.querySelectorAll('#mainTabs .sidebar-link').forEach(l => l.classList.remove('active'));
    if (sidebarLink) sidebarLink.classList.add('active');
    const sel = document.getElementById('mobile-tab-select');
    if (sel) sel.value = tabId;
}

function switchMobileTab(tabId) {
    showTab(tabId);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#mainTabs .sidebar-link').forEach(link => {
        link.removeAttribute('data-bs-toggle');
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('href').replace('#', '');
            showTab(tabId);
        });
    });
});

