// =====================
// CONSTANTES PHYSIOLOGIQUES
// =====================

// Relation VMA ↔ VO2max (Daniels, 1998) : VO2max ≈ VMA × 3.5
const VO2MAX_PAR_KMH = 3.5;

// Hydratation : compensation des pertes hydriques pendant l'effort
const HYDRA_COMPENSATION   = 0.75; // boire 75% des pertes en course
const HYDRA_RECUP_FACTOR   = 1.5;  // boire 150% des pertes en récupération

// Nutrition : glucides par gel énergétique standard
const GEL_GLUCIDES_G       = 22;   // g de glucides par gel

// Nutrition avant-course : charge glucidique (g/kg de poids corporel)
const CHARGE_GLUCIDIQUE_GKG = 8;   // g de glucides par kg de poids (J-1 + matin)

// =====================
// NAMESPACE — ÉTAT DE L'APPLICATION
// =====================
// Toutes les variables d'état mutable sont regroupées ici
// pour éviter la pollution du scope global.
const RU = {
    seances:           [],    // charge.js — séances d'entraînement
    planRavitaillements: [], // plan-course.js — points de ravitaillement
    selectedSeance:    "demi-cooper", // vma.js — séance VMA sélectionnée
    selectedModel:     "riegel",      // prediction.js — modèle de prédiction
    vma:               0,    // vma.js — dernière VMA calculée
    nutriBesoins:      { glucides: 0, kcal: 0, dureeMin: 0 }, // nutrition.js
    nutriQtys:         [],   // nutrition.js — quantités par aliment
};

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
// PHYSIOLOGIE COMMUNE
// =====================

function calculerSweatRate(transpi, temp, humi) {
    const baseSweat  = { faible: 0.4, normale: 0.8, elevee: 1.2, "tres-elevee": 1.7 }[transpi];
    const tempFactor = { frais: 0.8, tempere: 1.0, chaud: 1.2, "tres-chaud": 1.5 }[temp];
    const humiFactor = { faible: 0.9, moderee: 1.0, elevee: 1.15 }[humi];
    return baseSweat * tempFactor * humiFactor;
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
    // Sidebar navigation
    document.querySelectorAll('#mainTabs .sidebar-link').forEach(link => {
        link.removeAttribute('data-bs-toggle');
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('href').replace('#', '');
            showTab(tabId);
        });
    });

    // Mobile tab select
    document.getElementById('mobile-tab-select').addEventListener('change', function() {
        switchMobileTab(this.value);
    });

    // Délégation globale (éléments statiques ET dynamiques)
    document.addEventListener('click', function(e) {
        // Composants statiques
        const badge = e.target.closest('.badge-distance[data-target]');
        if (badge) { setDistanceField(badge.dataset.target, parseFloat(badge.dataset.value)); return; }
        const modelCard = e.target.closest('.model-card[data-model]');
        if (modelCard && !e.target.closest('a, input')) { selectModel(modelCard.dataset.model); return; }
        const seanceCard = e.target.closest('.seance-card[data-seance]');
        if (seanceCard && !e.target.closest('a')) { selectSeance(seanceCard.dataset.seance); return; }

        // Actions dynamiques (templates innerHTML)
        const action = e.target.closest('[data-action]');
        if (!action) return;
        const { action: act, idx, km } = action.dataset;
        if (act === 'supprimer-seance')  { supprimerSeance(parseInt(idx, 10)); return; }
        if (act === 'remove-ravito')     { planRemoveRavitaillement(parseFloat(km)); return; }
        if (act === 'qty-dec')           { changeQty(parseInt(idx, 10), -1); return; }
        if (act === 'qty-inc')           { changeQty(parseInt(idx, 10),  1); return; }
        if (act === 'suppr-aliment')     { supprimerAlimentCustom(parseInt(idx, 10)); return; }
        if (act === 'calculer-vma')      { calculerVMA(); return; }
    });

    // Boutons
    document.getElementById('btn-allure-vitesse').addEventListener('click', allureToVitesse);
    document.getElementById('btn-vitesse-allure').addEventListener('click', vitesseToAllure);
    document.getElementById('btn-calculer-temps').addEventListener('click', calculerTemps);
    document.getElementById('btn-calculer-allure').addEventListener('click', calculerAllure);
    document.getElementById('btn-generer-tableau').addEventListener('click', genererTableau);
    document.getElementById('btn-calculer-predictions').addEventListener('click', calculerPredictions);
    document.getElementById('btn-estimer-fcmax').addEventListener('click', estimerFCmax);
    document.getElementById('btn-calculer-fc').addEventListener('click', calculerZonesFC);
    document.getElementById('btn-ajouter-seance').addEventListener('click', ajouterSeance);
    document.getElementById('btn-effacer-seances').addEventListener('click', effacerSeances);
    document.getElementById('btn-calculer-hydratation').addEventListener('click', calculerHydratation);
    document.getElementById('btn-calculer-nutrition').addEventListener('click', calculerNutrition);
    document.getElementById('btn-reset-nutri').addEventListener('click', resetNutriConfig);
    document.getElementById('btn-ajouter-aliment').addEventListener('click', ajouterAlimentCustom);
    document.getElementById('btn-plan-ravi').addEventListener('click', planAddRavitaillement);
    document.getElementById('btn-generer-plan').addEventListener('click', genererPlanCourse);
    document.getElementById('btn-export-plan').addEventListener('click', exportPlanCSV);

    // Selects / inputs avec changement d'état
    document.getElementById('fc-methode').addEventListener('change', toggleFCInputs);
    document.getElementById('charge-type').addEventListener('change', updateTSSAuto);
    document.getElementById('charge-duree-h').addEventListener('change', updateTSSAuto);
    document.getElementById('charge-duree-min').addEventListener('change', updateTSSAuto);
});

