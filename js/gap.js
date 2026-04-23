// =====================
// GAP — GRADE ADJUSTED PACE
// Allure ajustée à la pente (trail)
// =====================

/**
 * Facteur multiplicateur GAP selon la pente (%).
 * Modèle Strava/Minetti : ajuste l'allure terrain en équivalent plat.
 * Valeurs empiriques validées pour la course à pied trail.
 *   pente < 0 → descente (facteur < 1 = plus rapide que le plat)
 *   pente = 0 → plat (facteur = 1)
 *   pente > 0 → montée (facteur > 1 = plus lent que le plat)
 */
function facteurGAP(pentePct) {
    const p = Math.max(-40, Math.min(40, pentePct)) / 100;
    // Modèle Minetti et al. (2002) adapté course
    // Coût métabolique relatif normalisé au plat
    const cPlat  = 3.86;
    const cPente = 155.4 * Math.pow(p, 5)
                 - 30.4  * Math.pow(p, 4)
                 - 43.3  * Math.pow(p, 3)
                 + 46.3  * Math.pow(p, 2)
                 + 19.5  * p
                 + 3.6;
    return cPente / cPlat;
}

/**
 * Calcul GAP à partir d'une allure terrain et d'une pente.
 * GAP (s/km) = allure terrain (s/km) / facteur(pente)
 */
function calculerGAPDepuisPente() {
    clearFieldErrors('gap-allure-min', 'gap-pente');

    const m      = parseFloat(document.getElementById('gap-allure-min').value) || 0;
    const s      = parseFloat(document.getElementById('gap-allure-sec').value) || 0;
    const pente  = parseFloat(document.getElementById('gap-pente').value);

    if (m === 0 && s === 0) return showFieldError('gap-allure-min', 'Allure invalide.');
    if (isNaN(pente))       return showFieldError('gap-pente', 'Pente invalide.');

    const allureSec = m * 60 + s;
    const f         = facteurGAP(pente);
    const gapSec    = allureSec / f;

    _afficherResultatGAP(allureSec, gapSec, pente, f);
}

/**
 * Calcul GAP à partir d'une allure terrain, d'une distance et d'un D+.
 * Pente = D+ / (dist * 1000) × 100
 */
function calculerGAPDepuisDenivele() {
    clearFieldErrors('gap-allure-min2', 'gap-dist', 'gap-dplus2');

    const m     = parseFloat(document.getElementById('gap-allure-min2').value) || 0;
    const s     = parseFloat(document.getElementById('gap-allure-sec2').value) || 0;
    const dist  = parseFloat(document.getElementById('gap-dist').value);
    const dPlus = parseFloat(document.getElementById('gap-dplus2').value);

    if (m === 0 && s === 0) return showFieldError('gap-allure-min2', 'Allure invalide.');
    if (!dist  || dist  <= 0) return showFieldError('gap-dist',  'Distance invalide.');
    if (isNaN(dPlus) || dPlus < 0) return showFieldError('gap-dplus2', 'D+ invalide.');

    const allureSec = m * 60 + s;
    const pentePct  = (dPlus / (dist * 1000)) * 100;
    const f         = facteurGAP(pentePct);
    const gapSec    = allureSec / f;

    _afficherResultatGAP(allureSec, gapSec, pentePct, f);
}

function _afficherResultatGAP(allureSec, gapSec, pentePct, facteur) {
    const sens   = pentePct > 0 ? '↑ montée' : pentePct < 0 ? '↓ descente' : '→ plat';
    const effort = facteur > 1.15 ? 'Effort élevé' : facteur < 0.90 ? 'Effort réduit' : 'Effort modéré';

    document.getElementById('result-gap-allure-terrain').textContent = formatAllure(allureSec);
    document.getElementById('result-gap-value').textContent          = formatAllure(gapSec);
    document.getElementById('result-gap-detail').textContent =
        `Pente : ${pentePct.toFixed(1)}% ${sens} · Facteur : ×${facteur.toFixed(2)} · ${effort}`;

    document.getElementById('result-gap').style.display = 'block';
    _genererTableauGAP(allureSec);
}

/** Tableau GAP pour plusieurs pentes autour de la valeur calculée */
function _genererTableauGAP(allureSec) {
    const pentes = [-20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30];
    let html = `<table class="table table-bordered table-striped table-hover small text-center mb-0">
        <thead class="table-dark">
            <tr>
                <th>Pente</th>
                <th>Facteur</th>
                <th>GAP (allure équivalente plat)</th>
                <th>Interprétation</th>
            </tr>
        </thead><tbody>`;

    pentes.forEach(p => {
        const f   = facteurGAP(p);
        const gap = allureSec / f;
        const cls = p === 0 ? 'table-warning fw-bold' : p > 0 ? 'table-danger bg-opacity-10' : 'table-success bg-opacity-10';
        const label = p > 0 ? `+${p}% ↑` : p < 0 ? `${p}% ↓` : `${p}% →`;
        const interp = f > 1.3 ? '🔴 Très difficile' : f > 1.1 ? '🟠 Difficile' : f > 0.95 ? '🟢 Normal' : '🔵 Récupération';
        html += `<tr class="${cls}">
            <td>${label}</td>
            <td>×${f.toFixed(2)}</td>
            <td><strong>${formatAllure(gap)}</strong>/km</td>
            <td>${interp}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('gap-tableau-container').innerHTML = html;
}
