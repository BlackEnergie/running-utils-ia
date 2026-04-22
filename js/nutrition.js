// =====================
// NUTRITION COURSE
// =====================

const ALIMENTS = [
    { nom: "Gel énergétique",              glucides: 25, kcal: 100, pratique: "⭐⭐⭐", priorite: 3 },
    { nom: "Banane (1 moyenne)",           glucides: 27, kcal: 105, pratique: "⭐⭐",   priorite: 4 },
    { nom: "Barre de céréales",            glucides: 30, kcal: 120, pratique: "⭐⭐",   priorite: 4 },
    { nom: "Datte (5 pièces)",             glucides: 30, kcal: 120, pratique: "⭐⭐",   priorite: 3 },
    { nom: "Boisson isotonique (500 mL)",  glucides: 30, kcal: 120, pratique: "⭐⭐⭐", priorite: 1 },
    { nom: "Compote de fruit (1 gourde)",  glucides: 15, kcal: 60,  pratique: "⭐⭐⭐", priorite: 2 },
    { nom: "Pâtes de fruit (30g)",         glucides: 24, kcal: 96,  pratique: "⭐⭐⭐", priorite: 2 },
];

// Initialise les quantités alignées sur la liste des aliments
RU.nutriQtys = new Array(ALIMENTS.length).fill(0);

// =====================
// CALCUL DES BESOINS
// =====================

function calculerNutrition() {
    clearFieldErrors('nutri-poids', 'nutri-distance', 'nutri-min', 'nutri-sec');
    const poids = parseFloat(document.getElementById("nutri-poids").value);
    const dist  = parseFloat(document.getElementById("nutri-distance").value);
    const m     = parseFloat(document.getElementById("nutri-min").value) || 0;
    const s     = parseFloat(document.getElementById("nutri-sec").value) || 0;

    if (!poids || poids <= 0) return showFieldError('nutri-poids', 'Poids invalide.');
    if (!dist  || dist  <= 0) return showFieldError('nutri-distance', 'Distance invalide.');
    if (m === 0 && s === 0)   return showFieldError('nutri-min', 'Allure invalide.');

    const allureSec = m * 60 + s;
    const dureeH    = (allureSec * dist) / 3600;
    const dureeMin  = dureeH * 60;
    const intensite = document.getElementById("nutri-intensite").value;
    const sexe      = document.getElementById("nutri-sexe").value;

    const met           = { faible: 7, modere: 10, eleve: 13, max: 16 }[intensite];
    const kcalTotal     = Math.round(met * poids * dureeH);
    const glucidesRatio = { faible: 0.5, modere: 0.6, eleve: 0.7, max: 0.8 }[intensite];
    const kcalGlucides  = Math.round(kcalTotal * glucidesRatio);
    const grammesGlucides = Math.round(kcalGlucides / 4);
    const glucidesH = { faible: 0, modere: dureeMin > 60 ? 30 : 0, eleve: dureeMin > 45 ? 45 : 0, max: dureeMin > 30 ? 60 : 0 }[intensite];
    const glucidesTotaux  = Math.round(glucidesH * dureeH);
    const corrSexe        = sexe === "femme" ? 0.9 : 1.0;
    const kcalCorr        = Math.round(kcalTotal * corrSexe);
    const glucCorr        = Math.round(glucidesTotaux * corrSexe);

    RU.nutriBesoins = { glucides: glucCorr, kcal: kcalCorr, dureeMin };

    const intensiteLabel = { faible: "Faible", modere: "Modérée", eleve: "Élevée", max: "Maximale" }[intensite];

    document.getElementById("nutri-summary-cards").innerHTML = `
        <div class="col-6 col-md-3">
            <div class="card text-center p-3 border-0 bg-light">
                <div class="text-muted small">Durée estimée</div>
                <div class="fw-bold fs-4 text-primary">${formatTemps(allureSec * dist)}</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card text-center p-3 border-0 bg-light">
                <div class="text-muted small">Calories dépensées</div>
                <div class="fw-bold fs-4 text-danger">${kcalCorr} kcal</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card text-center p-3 border-0 bg-light">
                <div class="text-muted small">Glucides brûlés</div>
                <div class="fw-bold fs-4 text-warning">${grammesGlucides} g</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card text-center p-3 border-0 bg-light">
                <div class="text-muted small">Apport recommandé</div>
                <div class="fw-bold fs-4 text-success">${glucCorr} g</div>
            </div>
        </div>`;

    document.getElementById("nutri-detail").innerHTML = `
        <div class="info-bubble mb-3">
            <i class="bi bi-info-circle me-2"></i>Intensité : <strong>${intensiteLabel}</strong>
            · Dépense : <strong>~${Math.round(kcalCorr / dureeH)} kcal/h</strong>
            · Glucides effort : <strong>${glucidesH} g/h</strong>
        </div>
        <div class="row g-2">
            <div class="col-md-4">
                <div class="p-3 rounded" style="background:#fef9e7;border-left:4px solid #f39c12">
                    <div class="fw-semibold small mb-1">🍞 Avant (J-1 & matin)</div>
                    <div class="fw-bold">${Math.round(poids * CHARGE_GLUCIDIQUE_GKG)} g glucides</div>
                    <div class="text-muted" style="font-size:.8rem">Pâtes, riz, pain — charge glucidique</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="p-3 rounded" style="background:#e9f7ef;border-left:4px solid #27ae60">
                    <div class="fw-semibold small mb-1">🏃 Pendant la course</div>
                    <div class="fw-bold">${dureeMin > 60 ? glucCorr + " g glucides" : "Non nécessaire"}</div>
                    <div class="text-muted" style="font-size:.8rem">${dureeMin > 60 ? glucidesH + " g/h — gels, bananes, barres" : "Eau seule suffisante"}</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="p-3 rounded" style="background:#fdedec;border-left:4px solid #e74c3c">
                    <div class="fw-semibold small mb-1">🔄 Récupération (< 30 min)</div>
                    <div class="fw-bold">${Math.round(poids * 1.2)} g glucides + ${Math.round(poids * 0.3)} g protéines</div>
                    <div class="text-muted" style="font-size:.8rem">Fenêtre métabolique — lait chocolat, banane</div>
                </div>
            </div>
        </div>`;

    let planHtml = "";
    if (dureeMin > 60 && glucCorr > 0) {
        const nbGels = Math.ceil(glucCorr / 25);
        planHtml = `<div class="info-bubble"><i class="bi bi-lightbulb me-2"></i>Pour cette course : environ <strong>${nbGels} gels</strong> ou équivalent (25 g de glucides chacun), à prendre toutes les <strong>${Math.round(dureeMin / nbGels)} min</strong>. Configurez votre ravitaillement ci-dessous.</div>`;
    } else {
        planHtml = `<div class="info-bubble"><i class="bi bi-info-circle me-2"></i>Pour une course de moins d'1h, l'apport en glucides pendant l'effort n'est généralement pas nécessaire. De l'eau suffit.</div>`;
    }
    document.getElementById("nutri-plan").innerHTML = planHtml;

    renderNutriConfig();
    document.getElementById("nutri-placeholder").style.display = "none";
    document.getElementById("nutri-results").style.display = "block";
}

// =====================
// CONFIGURATEUR DE RAVITAILLEMENT
// =====================

function renderNutriConfig() {
    const prioriteColors = ["", "#2980b9", "#27ae60", "#f39c12", "#e74c3c"];
    let html = `<div class="table-responsive">
        <table class="table table-hover small align-middle mb-0">
            <thead class="table-dark">
                <tr>
                    <th>Aliment</th>
                    <th class="text-center">Glucides/u</th>
                    <th class="text-center">Kcal/u</th>
                    <th class="text-center" style="min-width:110px">Quantité</th>
                    <th class="text-center">Total glucides</th>
                    <th class="text-center">Total kcal</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>`;

    ALIMENTS.forEach((a, i) => {
        const badge = a.custom
            ? `<span class="badge me-1" style="background:#6c757d;font-size:.65rem">perso</span>`
            : `<span class="badge me-1" style="background:${prioriteColors[a.priorite]};font-size:.65rem">${a.priorite}</span>`;
        html += `<tr>
            <td>${badge}<strong>${a.nom}</strong></td>
            <td class="text-center">${a.glucides} g</td>
            <td class="text-center">${a.kcal} kcal</td>
            <td class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-1">
                    <button class="btn btn-sm btn-outline-secondary px-2 py-0" data-action="qty-dec" data-idx="${i}">−</button>
                    <span id="qty-${i}" style="min-width:24px;text-align:center;font-weight:700;">0</span>
                    <button class="btn btn-sm btn-outline-secondary px-2 py-0" data-action="qty-inc" data-idx="${i}">+</button>
                </div>
            </td>
            <td class="text-center fw-semibold" id="sub-gluc-${i}">0 g</td>
            <td class="text-center fw-semibold" id="sub-kcal-${i}">0 kcal</td>
            <td class="text-center">
                ${a.custom ? `<button class="btn btn-sm btn-outline-danger px-2 py-0" title="Supprimer" data-action="suppr-aliment" data-idx="${i}"><i class="bi bi-trash"></i></button>` : ""}
            </td>
        </tr>`;
    });

    html += "</tbody></table></div>";
    document.getElementById("nutri-config-table").innerHTML = html;
    document.getElementById("nutri-config-bilan").innerHTML = "";
}

function ajouterAlimentCustom() {
    clearFieldErrors('custom-nom', 'custom-glucides', 'custom-kcal');
    const nom     = document.getElementById("custom-nom").value.trim();
    const glucides = parseFloat(document.getElementById("custom-glucides").value);
    const kcal    = parseFloat(document.getElementById("custom-kcal").value);
    if (!nom) return showFieldError('custom-nom', 'Veuillez saisir un nom.');
    if (isNaN(glucides) || glucides < 0) return showFieldError('custom-glucides', 'Glucides invalides.');
    if (isNaN(kcal) || kcal < 0) return showFieldError('custom-kcal', 'Calories invalides.');
    ALIMENTS.push({ nom, glucides, kcal, pratique: "", priorite: 3, custom: true });
    RU.nutriQtys.push(0);
    document.getElementById("custom-nom").value = "";
    document.getElementById("custom-glucides").value = "";
    document.getElementById("custom-kcal").value = "";
    renderNutriConfig();
    majBilanNutri();
}

function resetNutriConfig() {
    for (let i = ALIMENTS.length - 1; i >= 0; i--) {
        if (ALIMENTS[i].custom) {
            ALIMENTS.splice(i, 1);
            RU.nutriQtys.splice(i, 1);
        }
    }
    RU.nutriQtys.fill(0);
    renderNutriConfig();
    document.getElementById("nutri-config-bilan").innerHTML = "";
    document.getElementById("nutri-config-planning").innerHTML = "";
}

function supprimerAlimentCustom(idx) {
    if (!ALIMENTS[idx] || !ALIMENTS[idx].custom) return;
    ALIMENTS.splice(idx, 1);
    RU.nutriQtys.splice(idx, 1);
    renderNutriConfig();
    majBilanNutri();
}

function changeQty(idx, delta) {
    RU.nutriQtys[idx] = Math.max(0, RU.nutriQtys[idx] + delta);
    document.getElementById("qty-" + idx).textContent = RU.nutriQtys[idx];
    const a = ALIMENTS[idx];
    document.getElementById("sub-gluc-" + idx).textContent = a.glucides * RU.nutriQtys[idx] + " g";
    document.getElementById("sub-kcal-" + idx).textContent = a.kcal * RU.nutriQtys[idx] + " kcal";
    majBilanNutri();
}

// =====================
// BILAN & PLANNING DES PRISES
// =====================

function majBilanNutri() {
    const totalGluc  = ALIMENTS.reduce((s, a, i) => s + a.glucides * RU.nutriQtys[i], 0);
    const totalKcal  = ALIMENTS.reduce((s, a, i) => s + a.kcal    * RU.nutriQtys[i], 0);
    const besoinGluc = RU.nutriBesoins.glucides;
    const besoinKcal = RU.nutriBesoins.kcal;
    const dureeMin   = RU.nutriBesoins.dureeMin;

    const pctGluc = besoinGluc > 0 ? Math.round((totalGluc / besoinGluc) * 100) : 100;
    const pctKcal = besoinKcal > 0 ? Math.round((totalKcal / besoinKcal) * 100) : 100;

    function status(pct) {
        if (pct < 70)  return { label: "Insuffisant", cls: "danger",  icon: "⚠️" };
        if (pct < 90)  return { label: "Limite",      cls: "warning", icon: "🟡" };
        if (pct <= 120)return { label: "Suffisant",   cls: "success", icon: "✅" };
        return             { label: "Excès",       cls: "info",    icon: "ℹ️" };
    }

    const sg = status(pctGluc), sk = status(pctKcal);

    document.getElementById("nutri-config-bilan").innerHTML = `
        <div class="info-bubble mb-3"><i class="bi bi-bar-chart me-2"></i><strong>Bilan de votre ravitaillement</strong></div>
        <div class="row g-3 mb-2">
            <div class="col-md-6">
                <div class="p-3 rounded border" style="background:#f8f9fa">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-semibold small">🍬 Glucides apportés</span>
                        <span class="badge bg-${sg.cls}">${sg.icon} ${sg.label}</span>
                    </div>
                    <div class="d-flex justify-content-between small mb-1">
                        <span class="text-muted">Apporté : <strong>${totalGluc} g</strong></span>
                        <span class="text-muted">Besoin : <strong>${besoinGluc} g</strong></span>
                    </div>
                    <div class="progress" style="height:10px">
                        <div class="progress-bar bg-${sg.cls}" style="width:${Math.min(pctGluc, 100)}%" role="progressbar"></div>
                    </div>
                    <div class="text-end small text-muted mt-1">${pctGluc}% du besoin</div>
                    ${totalGluc < besoinGluc ? `<div class="text-danger small mt-1">Il manque <strong>${besoinGluc - totalGluc} g</strong> de glucides.</div>` : ""}
                </div>
            </div>
            <div class="col-md-6">
                <div class="p-3 rounded border" style="background:#f8f9fa">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-semibold small">🔥 Calories apportées</span>
                        <span class="badge bg-${sk.cls}">${sk.icon} ${sk.label}</span>
                    </div>
                    <div class="d-flex justify-content-between small mb-1">
                        <span class="text-muted">Apporté : <strong>${totalKcal} kcal</strong></span>
                        <span class="text-muted">Dépense : <strong>${besoinKcal} kcal</strong></span>
                    </div>
                    <div class="progress" style="height:10px">
                        <div class="progress-bar bg-${sk.cls}" style="width:${Math.min(pctKcal, 100)}%" role="progressbar"></div>
                    </div>
                    <div class="text-end small text-muted mt-1">${pctKcal}% de la dépense</div>
                    <div class="text-muted small mt-1">(On ne compense jamais 100% des calories en course)</div>
                </div>
            </div>
        </div>`;

    // Planning des prises — trié par priorité digestive
    const prises = [];
    ALIMENTS.forEach((a, i) => {
        for (let q = 0; q < RU.nutriQtys[i]; q++) prises.push(a);
    });

    // Priorité croissante (1=liquide, 4=solide) ; gels en dernier parmi même priorité
    prises.sort((a, b) => {
        if (a.priorite !== b.priorite) return a.priorite - b.priorite;
        if (a.nom.startsWith("Gel")) return 1;
        if (b.nom.startsWith("Gel")) return -1;
        return 0;
    });

    const planningEl = document.getElementById("nutri-config-planning");
    if (prises.length === 0 || dureeMin <= 0) { planningEl.innerHTML = ""; return; }

    const debut    = 20;
    const fin      = Math.max(debut + 5, dureeMin - 15);
    const plage    = fin - debut;
    const interval = prises.length > 1 ? plage / (prises.length - 1) : 0;

    let planHtml = `
        <div class="info-bubble mb-2 d-flex align-items-center justify-content-between gap-2">
            <span>
                <i class="bi bi-clock me-2"></i><strong>Planning des prises suggéré</strong>
                · ${prises.length} prise${prises.length > 1 ? "s" : ""} sur ${Math.round(dureeMin)} min de course
            </span>
            <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2"
                style="white-space:nowrap;font-size:.8rem"
                data-bs-toggle="popover" data-bs-placement="left" data-bs-html="true"
                data-bs-trigger="focus" tabindex="0"
                title="Ordre des prises"
                data-bs-content="Les aliments sont ordonnés selon leur facilité de digestion :<br><br>
                    <span class='badge' style='background:#2980b9'>1</span> <strong>Boissons isotoniques</strong> — absorption immédiate<br>
                    <span class='badge' style='background:#27ae60'>2</span> <strong>Compotes · Pâtes de fruit</strong> — semi-liquide, digestion facile<br>
                    <span class='badge' style='background:#f39c12'>3</span> <strong>Gels · Dattes</strong> — sucres simples ; les gels en dernier pour le boost final<br>
                    <span class='badge' style='background:#e74c3c'>4</span> <strong>Barres · Bananes</strong> — solides, mieux tolérés en 1ère moitié">
                <i class="bi bi-info-circle me-1"></i>Ordre ?
            </button>
        </div>
        <div class="table-responsive">
            <table class="table table-hover small mb-0">
                <thead class="table-dark">
                    <tr><th>⏱ Temps</th><th>Aliment</th><th class="text-center">Glucides</th><th class="text-center">Kcal</th><th>Conseil</th></tr>
                </thead>
                <tbody>`;

    const prioriteColors = ["", "#2980b9", "#27ae60", "#f39c12", "#e74c3c"];
    prises.forEach((a, idx) => {
        const tMin     = Math.round(prises.length === 1 ? (debut + fin) / 2 : debut + interval * idx);
        const h        = Math.floor(tMin / 60), mm = tMin % 60;
        const tLabel   = h > 0 ? `${h}h${mm.toString().padStart(2, "0")}` : `${mm} min`;
        const pctCours = tMin / dureeMin;
        const conseil  =
            a.priorite === 1                             ? "Hydratation + glucides, idéal dès le début"
            : a.priorite === 2                           ? "Facile à digérer, bon en milieu de course"
            : a.nom.startsWith("Gel") && pctCours > 0.7 ? "⚡ Boost final — sucre rapide, effet en ~10 min"
            : pctCours < 0.4                            ? "Première moitié, mangez avant d'avoir faim"
            :                                             "Maintenez l'énergie, ne dépassez pas 60g de glucides/h";

        planHtml += `<tr>
            <td><strong>${tLabel}</strong></td>
            <td><span class="badge me-1" style="background:${prioriteColors[a.priorite]};font-size:.65rem">${a.priorite}</span>${a.nom}</td>
            <td class="text-center text-success fw-semibold">+${a.glucides} g</td>
            <td class="text-center text-warning fw-semibold">+${a.kcal} kcal</td>
            <td class="text-muted">${conseil}</td>
        </tr>`;
    });

    planHtml += `</tbody></table></div>
        <div class="info-bubble mt-2" style="font-size:.8rem">
            <i class="bi bi-exclamation-triangle me-1"></i>Ne dépassez pas <strong>60 g de glucides/h</strong>
            pour éviter les troubles digestifs. Prenez toujours les glucides avec de l'eau.
            Testez votre stratégie à l'entraînement.
        </div>`;

    planningEl.innerHTML = planHtml;
}

