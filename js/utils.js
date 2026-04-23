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

// Restauration depuis localStorage (sans bloquer si données corrompues)
(function () {
    try {
        const s = localStorage.getItem('ru_seances');
        if (s) RU.seances = JSON.parse(s);
        const p = localStorage.getItem('ru_ravitaillements');
        if (p) RU.planRavitaillements = JSON.parse(p);
    } catch (_) {}
})();

// =====================
// UTILITAIRES COMMUNS
// =====================

/**
 * Kilomètres Effort (standard Trail/ITRA)
 * 1 m D+ = 10 m plat · 1 m D- = 5 m plat
 * KE = distKm + dPlusM/100 + dMoinsM/200
 */
function calculerKmEfforts(distKm, dPlusM, dMoinsM) {
    return distKm + (dPlusM || 0) / 100 + (dMoinsM || 0) / 200;
}

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
// VALIDATION INLINE
// =====================

/**
 * Marque un champ comme invalide et affiche un message Bootstrap.
 * Crée le div .invalid-feedback s'il n'existe pas encore.
 */
function showFieldError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('is-invalid');
    if (!msg) return;
    const container = el.closest('.input-group') || el.parentElement;
    let fb = container.querySelector(':scope > .invalid-feedback');
    if (!fb) {
        fb = document.createElement('div');
        fb.className = 'invalid-feedback';
        container.appendChild(fb);
    }
    fb.textContent = msg;
}

/** Retire l'état invalide de un ou plusieurs champs. */
function clearFieldErrors(...ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('is-invalid');
        const container = el.closest('.input-group') || el.parentElement;
        const fb = container.querySelector(':scope > .invalid-feedback');
        if (fb) fb.textContent = '';
    });
}

// =====================
// HELPERS UI
// =====================

function setDistanceField(id, val) {
    document.getElementById(id).value = val;
}

function sauvegarderSeances() {
    localStorage.setItem('ru_seances', JSON.stringify(RU.seances));
}

function sauvegarderRavitaillements() {
    localStorage.setItem('ru_ravitaillements', JSON.stringify(RU.planRavitaillements));
}

/**
 * Copie le contenu d'un tableau HTML dans le presse-papiers (format TSV).
 * Affiche un retour visuel éphémère sur le bouton déclencheur.
 */
function copierTableauTexte(containerId, btn) {
    const table = document.querySelector('#' + containerId + ' table');
    if (!table) return;
    const text = Array.from(table.querySelectorAll('tr'))
        .map(r => Array.from(r.querySelectorAll('th, td')).map(c => c.innerText.trim()).join('\t'))
        .join('\n');
    navigator.clipboard.writeText(text).then(() => {
        if (!btn) return;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check me-1"></i>Copié\u00a0!';
        btn.disabled = true;
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
    });
}

/**
 * Ouvre un onglet dédié contenant uniquement le tableau,
 * avec un bouton "Imprimer / Enregistrer en PDF".
 */
function imprimerSection(containerId, titre) {
    const table = document.querySelector('#' + containerId + ' table');
    if (!table) return;
    const w = window.open('', '_blank', 'width=960,height=700');
    w.document.write(`<!DOCTYPE html><html lang="fr"><head>
        <meta charset="utf-8">
        <title>${titre}</title>
        <style>
            body { font-family: sans-serif; padding: 24px; }
            h2 { margin-bottom: 1rem; }
            table { border-collapse: collapse; width: 100%; font-size: 13px; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: center; }
            thead { background: #222; color: #fff; }
            tr:nth-child(even) { background: #f5f5f5; }
            .print-btn { margin-top: 1rem; padding: 8px 20px; font-size: 14px; cursor: pointer; }
            @media print { .print-btn { display: none; } }
        </style>
    </head><body>
        <h2>${titre}</h2>
        ${table.outerHTML}
        <br>
        <button class="print-btn" onclick="window.print()">&#128438; Imprimer / Enregistrer en PDF</button>
    </body></html>`);
    w.document.close();
}

const _VALID_TABS = new Set([
    'tab-allure-vitesse','tab-temps-course','tab-tableau-allures','tab-prediction',
    'tab-vma','tab-fc','tab-charge','tab-hydratation','tab-nutrition',
    'tab-plan-course','tab-gpx','tab-gap','tab-km-effort','tab-profil'
]);

function showTab(tabId, { pushState = true } = {}) {
    if (!_VALID_TABS.has(tabId)) return;
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });
    const target = document.getElementById(tabId);
    if (target) target.classList.add('show', 'active');
    const sidebarLink = document.querySelector('#mainTabs [href="#' + tabId + '"]');
    document.querySelectorAll('#mainTabs .sidebar-link').forEach(l => l.classList.remove('active'));
    if (sidebarLink) sidebarLink.classList.add('active');
    const sel = document.getElementById('mobile-tab-select');
    if (sel) sel.value = tabId;
    if (pushState && location.hash !== '#' + tabId) {
        history.pushState({ tabId }, '', '#' + tabId);
    }
}

function switchMobileTab(tabId) {
    showTab(tabId);
}

window.addEventListener('popstate', e => {
    const tabId = e.state?.tabId || location.hash.replace('#', '');
    if (_VALID_TABS.has(tabId)) showTab(tabId, { pushState: false });
});

document.addEventListener('DOMContentLoaded', () => {
    // Restaurer les traces GPX sauvegardées
    if (typeof _chargerGPX === 'function') _chargerGPX();
    // Afficher les badges "Ajouter une trace" si aucune trace chargée
    if (typeof _majBadgesGPX === 'function') _majBadgesGPX();

    // Restaurer l'onglet depuis le hash de l'URL
    const hashTab = location.hash.replace('#', '');
    if (_VALID_TABS.has(hashTab)) {
        showTab(hashTab, { pushState: false });
    }

    // Mobile tab select
    document.getElementById('mobile-tab-select').addEventListener('change', function() {
        switchMobileTab(this.value);
    });

    // Délégation globale (éléments statiques ET dynamiques)
    document.addEventListener('click', function(e) {
        // Navigation sidebar (statique + dynamique, ex: sidebar-profil-card)
        const sidebarLink = e.target.closest('#mainTabs [href^="#tab-"]');
        if (sidebarLink) {
            e.preventDefault();
            const tabId = sidebarLink.getAttribute('href').replace('#', '');
            showTab(tabId);
            return;
        }

        // Navigation hors sidebar (ex: widget profil navbar)
        const anyTabLink = e.target.closest('[href^="#tab-"]');
        if (anyTabLink) {
            e.preventDefault();
            const tabId = anyTabLink.getAttribute('href').replace('#', '');
            showTab(tabId);
            return;
        }

        // Composants statiques
        const badge = e.target.closest('.badge-distance[data-target]');
        if (badge) { setDistanceField(badge.dataset.target, parseFloat(badge.dataset.value)); return; }

        // Lien externe à l'intérieur d'une card : sélectionner la card ET laisser le navigateur suivre le lien
        const extLink = e.target.closest('a[href]:not([href^="#"])');
        if (extLink) {
            const mc = extLink.closest('.model-card[data-model]');
            if (mc) selectModel(mc.dataset.model);
            const sc = extLink.closest('.seance-card[data-seance]');
            if (sc) selectSeance(sc.dataset.seance);
            return; // laisser le navigateur ouvrir le lien
        }

        // Actions dynamiques (data-action) — inclut select-model, select-seance, etc.
        const action = e.target.closest('[data-action]');
        if (!action) return;
        const { action: act, idx, km } = action.dataset;
        if (act === 'select-model')  { selectModel(action.dataset.model); return; }
        if (act === 'select-seance') { selectSeance(action.dataset.seance); return; }
        if (act === 'nav-tab')       { e.preventDefault(); showTab(action.dataset.tab); return; }
        if (act === 'supprimer-seance')  { supprimerSeance(parseInt(idx, 10)); return; }
        if (act === 'remove-ravito')     { planRemoveRavitaillement(parseFloat(km)); return; }
        if (act === 'qty-dec')           { changeQty(parseInt(idx, 10), -1); return; }
        if (act === 'qty-inc')           { changeQty(parseInt(idx, 10),  1); return; }
        if (act === 'suppr-aliment')     { supprimerAlimentCustom(parseInt(idx, 10)); return; }
        if (act === 'calculer-vma')      { calculerVMA(); return; }
        if (act === 'copier-tableau')    { copierTableauTexte(action.dataset.container, action); return; }
        if (act === 'imprimer-section')  { imprimerSection(action.dataset.container, action.dataset.titre); return; }
        if (act === 'gpx-utiliser')      { gpxUtiliserDans(action.dataset.cible); return; }
        if (act === 'gpx-badge')         { gpxAppliquerBadge(action.dataset.cible, parseInt(action.dataset.idx, 10)); return; }
        if (act === 'gpx-select')        { gpxSelectTrace(parseInt(action.dataset.idx, 10)); return; }
        if (act === 'gpx-rename')        { gpxRenommerTrace(parseInt(action.dataset.idx, 10)); return; }
        if (act === 'gpx-suppr')         { gpxSupprimerTrace(parseInt(action.dataset.idx, 10)); return; }
    });

    // Boutons
    document.getElementById('btn-allure-vitesse').addEventListener('click', allureToVitesse);
    document.getElementById('btn-vitesse-allure').addEventListener('click', vitesseToAllure);
    document.getElementById('btn-calculer-temps').addEventListener('click', calculerTemps);
    document.getElementById('btn-calculer-allure').addEventListener('click', calculerAllure);
    document.getElementById('btn-calculer-ke').addEventListener('click', calculerKE);
    document.getElementById('btn-calculer-gap').addEventListener('click', calculerGAPDepuisPente);
    document.getElementById('btn-calculer-gap2').addEventListener('click', calculerGAPDepuisDenivele);

    // GPX — input fichier (multiple)
    const gpxInput = document.getElementById('gpx-input');
    if (gpxInput) {
        gpxInput.addEventListener('change', e => {
            Array.from(e.target.files).forEach(f => gpxHandleFile(f));
            e.target.value = '';
        });
    }
    // GPX — drag & drop (multiple)
    const dropzone = document.getElementById('gpx-dropzone');
    if (dropzone) {
        dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.borderColor = 'var(--primary)'; });
        dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = '#dee2e6'; });
        dropzone.addEventListener('drop', e => {
            e.preventDefault();
            dropzone.style.borderColor = '#dee2e6';
            Array.from(e.dataTransfer.files).forEach(f => gpxHandleFile(f));
        });
    }
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
    document.querySelectorAll('input[name="plan-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isTemps = radio.value === 'temps';
            document.getElementById('plan-bloc-allure').style.display = isTemps ? 'none' : '';
            document.getElementById('plan-bloc-temps').style.display  = isTemps ? '' : 'none';
        });
    });
    document.getElementById('btn-export-plan').addEventListener('click', exportPlanCSV);
    document.getElementById('btn-copy-plan').addEventListener('click', function() { copierTableauTexte('plan-table', this); });
    document.getElementById('btn-print-plan').addEventListener('click', () => imprimerSection('plan-table', 'Plan de course'));

    // Profil coureur
    document.getElementById('btn-sauvegarder-profil').addEventListener('click', sauvegarderProfil);
    document.getElementById('btn-reinit-profil').addEventListener('click', reinitialiserProfil);

    // Raccourci Entrée : valide le calcul de l'onglet actif
    const _enterActions = {
        'tab-allure-vitesse': () => {
            // Si le focus est dans le bloc vitesse, convertir vitesse→allure, sinon allure→vitesse
            const active = document.activeElement;
            if (active && active.closest('#bloc-vitesse-allure')) vitesseToAllure();
            else allureToVitesse();
        },
        'tab-temps-course':   () => {
            const active = document.activeElement;
            if (active && active.closest('#bloc-objectif')) calculerAllure();
            else calculerTemps();
        },
        'tab-km-effort':      calculerKE,
        'tab-gap':            () => {
            const active = document.activeElement;
            if (active && active.closest('#bloc-gap-denivele')) calculerGAPDepuisDenivele();
            else calculerGAPDepuisPente();
        },
        'tab-tableau-allures': genererTableau,
        'tab-prediction':     calculerPredictions,
        'tab-vma':            () => {
            const active = document.activeElement;
            if (active && active.id === 'vma-fcmax-age') estimerFCmax();
        },
        'tab-fc':             calculerZonesFC,
        'tab-hydratation':    calculerHydratation,
        'tab-nutrition':      calculerNutrition,
        'tab-plan-course':    genererPlanCourse,
        'tab-profil':         sauvegarderProfil,
    };

    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        // Ne pas interférer avec textarea, select, button
        const tag = document.activeElement?.tagName;
        if (!tag || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
        const activeTab = document.querySelector('.tab-pane.show.active');
        if (!activeTab) return;
        const action = _enterActions[activeTab.id];
        if (action) { e.preventDefault(); action(); }
    });

    // Selects / inputs avec changement d'état
    document.getElementById('fc-methode').addEventListener('change', toggleFCInputs);
    document.getElementById('charge-type').addEventListener('change', updateTSSAuto);
    document.getElementById('charge-duree-h').addEventListener('change', updateTSSAuto);
    document.getElementById('charge-duree-min').addEventListener('change', updateTSSAuto);

    // Restauration UI des données persistées
    majListeSeances();
    calculerCharge();
    planRenderRaviList();
    afficherProfil(); // charge le profil et prérempli tous les formulaires
});

