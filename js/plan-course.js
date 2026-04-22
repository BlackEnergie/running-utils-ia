// =====================
// PLAN DE COURSE
// =====================

function planAddRavitaillement() {
    clearFieldErrors('plan-ravi-km');
    const km = parseFloat(document.getElementById("plan-ravi-km").value);
    const dist = parseFloat(document.getElementById("plan-distance").value);
    if (isNaN(km) || km <= 0) return showFieldError('plan-ravi-km', 'Kilomètre invalide.');
    if (dist && km > dist) return showFieldError('plan-ravi-km', 'Ce km dépasse la distance de la course.');
    if (RU.planRavitaillements.includes(km)) return showFieldError('plan-ravi-km', 'Ce km est déjà ajouté.');
    RU.planRavitaillements.push(km);
    RU.planRavitaillements.sort((a, b) => a - b);
    document.getElementById("plan-ravi-km").value = "";
    planRenderRaviList();
}

function planRemoveRavitaillement(km) {
    RU.planRavitaillements = RU.planRavitaillements.filter(k => k !== km);
    planRenderRaviList();
}

function planRenderRaviList() {
    const el = document.getElementById("plan-ravi-list");
    if (RU.planRavitaillements.length === 0) {
        el.innerHTML = '<span class="text-muted small">Aucun point ajouté</span>';
        return;
    }
    el.innerHTML = RU.planRavitaillements.map(km =>
        `<span class="badge bg-secondary me-1 mb-1" style="cursor:pointer" data-action="remove-ravito" data-km="${km}">
            ${km} km <i class="bi bi-x"></i>
        </span>`
    ).join("");
}

function genererPlanCourse() {
    clearFieldErrors('plan-distance', 'plan-allure-min', 'plan-poids');
    const dist      = parseFloat(document.getElementById("plan-distance").value);
    const minVal    = parseFloat(document.getElementById("plan-allure-min").value) || 0;
    const secVal    = parseFloat(document.getElementById("plan-allure-sec").value) || 0;
    const poids     = parseFloat(document.getElementById("plan-poids").value);
    const temp      = document.getElementById("plan-temperature").value;
    const humi      = document.getElementById("plan-humidite").value;
    const transpi   = document.getElementById("plan-transpiration").value;
    const intervEau = parseInt(document.getElementById("plan-interv-eau").value) || 20;

    if (!dist || dist <= 0) return showFieldError('plan-distance', 'Distance invalide.');
    if (minVal === 0 && secVal === 0) return showFieldError('plan-allure-min', 'Allure invalide.');
    if (!poids || poids <= 0) return showFieldError('plan-poids', 'Poids invalide.');

    const allureSec = minVal * 60 + secVal;
    const dureeMin  = (allureSec * dist) / 60;
    const dureeH    = dureeMin / 60;

    // -------- HYDRATATION --------
    const sweatRate = calculerSweatRate(transpi, temp, humi);
    const totalSweat = sweatRate * dureeH * 1000;
    const totalEau   = Math.round(totalSweat * HYDRA_COMPENSATION);
    const preRace    = Math.round(Math.min(600, Math.max(300, poids * 5)));
    const postRace   = Math.round(totalSweat * HYDRA_RECUP_FACTOR);
    const nbPointsEau = Math.max(1, Math.floor(dureeMin / intervEau));
    const mlParPrise  = Math.round(totalEau / nbPointsEau);

    // Points d'eau (toutes les N minutes)
    const pointsEau = [];
    for (let t = intervEau; t < dureeMin - 5; t += intervEau) {
        const km = parseFloat((t / (allureSec / 60)).toFixed(1));
        pointsEau.push({ type: "eau", minuteCourse: Math.round(t), km });
    }

    // -------- NUTRITION — Gels unitaires --------
    const intensite = allureSec <= 240 ? "elevee" : allureSec <= 330 ? "moderee" : "faible";
    const glucParH  = { faible: 40, moderee: 55, elevee: 70 }[intensite];
    const totalGluc = Math.round(glucParH * Math.max(0, dureeH - 0.5)); // pas de glucides la 1ère demi-heure
    const nbGelsCible = dureeH >= 1 ? Math.ceil(totalGluc / GEL_GLUCIDES_G) : 0;

    // Intervalle optimal entre gels selon intensité (min)
    const gelInterv = intensite === "elevee" ? 20 : intensite === "moderee" ? 25 : 30;
    // Premier gel : 40 min (estomac stabilisé), pas avant 30 min
    const premierGelMin = Math.max(30, Math.min(45, dureeMin * 0.2));

    // Planifier les gels dans le temps
    const pointsGel = [];
    if (nbGelsCible > 0) {
        // Répartition sur la fenêtre [premierGelMin .. dureeMin-15]
        const finNutri = dureeMin - 15; // dernier gel au moins 15 min avant l'arrivée
        const fenetre  = finNutri - premierGelMin;

        let gelsAPlacers = nbGelsCible;
        let minuteGel    = premierGelMin;

        while (gelsAPlacers > 0 && minuteGel <= finNutri) {
            const km = parseFloat((minuteGel / (allureSec / 60)).toFixed(1));
            const ratio = minuteGel / dureeMin;

            // Suggestion d'aliment selon progression et disponibilité ravito
            let aliment = "1 gel énergétique";
            const ravitoProche = RU.planRavitaillements.some(r => Math.abs(r - km) <= 1.5);
            if (ravitoProche && ratio < 0.6) {
                // En début/milieu de course avec ravito : proposer alternative plus solide
                aliment = ratio < 0.3
                    ? "1 barre énergétique (ravito) — digestion facile"
                    : "1 barre ou 2 pâtes de fruit (ravito)";
            } else if (ratio >= 0.85) {
                aliment = "1 gel énergétique (avec eau obligatoire)";
            }

            pointsGel.push({
                type: "nutri",
                minuteCourse: Math.round(minuteGel),
                km,
                glucides: GEL_GLUCIDES_G,
                aliment,
                numGel: pointsGel.length + 1,
            });

            gelsAPlacers--;
            minuteGel += gelsAPlacers > 0 ? Math.min(gelInterv, fenetre / Math.max(gelsAPlacers, 1)) : 999;
        }
    }

    // Nombre réel de gels placés (source de vérité pour l'affichage)
    const nbGels = pointsGel.length;
    // Renuméroter avec le total réel
    pointsGel.forEach((g, i) => { g.numGel = i + 1; });

    // -------- TEMPS DE PASSAGE --------
    const checkpoints = genererCheckpoints(dist);

    // -------- ASSEMBLAGE DU PLAN --------
    let events = [];
    events.push({ minuteCourse: -2, type: "avant",  label: "🌙 J-1",    detail: "Boire régulièrement, urines claires = bonne hydratation", km: null });
    events.push({ minuteCourse: -1, type: "avant",  label: "🌅 Matin course", detail: `Boire ${preRace} mL d'eau 1–2h avant le départ`, km: null });
    events.push({ minuteCourse: 0,  type: "depart", label: "🚀 Départ", detail: "C'est parti !", km: 0 });

    checkpoints.forEach(cp => {
        const tMin = Math.round((cp.km * allureSec) / 60);
        events.push({ minuteCourse: tMin, type: "passage", label: `📍 ${cp.label}`, detail: formatTemps(cp.km * allureSec), km: cp.km });
    });

    pointsEau.forEach(p => {
        // Ne pas dupliquer si un gel est prévu dans la même minute (±2 min)
        const dejaGel = pointsGel.some(g => Math.abs(g.minuteCourse - p.minuteCourse) <= 2);
        if (!dejaGel) {
            events.push({ ...p, label: "💧 Hydratation", detail: `~${mlParPrise} mL` });
        }
    });

    pointsGel.forEach(g => {
        const detail = `Gel n°${g.numGel}/${nbGels} — ${g.aliment} (${g.glucides}g glucides) + eau`;
        events.push({ ...g, label: `🍬 Gel`, detail });
    });

    events.push({ minuteCourse: Math.round(dureeMin),     type: "arrivee", label: "🏁 Arrivée",       detail: "Félicitations !", km: dist });
    events.push({ minuteCourse: Math.round(dureeMin) + 1, type: "apres",   label: "🔄 Récupération",  detail: `Boire ${postRace} mL d'eau dans les 4h`, km: null });
    events.push({ minuteCourse: Math.round(dureeMin) + 2, type: "apres",   label: "🧂 Électrolytes",  detail: "Aliments salés pour reconstituer les réserves", km: null });
    events.sort((a, b) => a.minuteCourse - b.minuteCourse || (a.type === "passage" ? -1 : 1));

    // -------- AFFICHAGE --------
    renderPlanResume({ dureeMin, totalEau, preRace, postRace, totalGluc, nbGels, intensite, glucParH, gelInterv });
    renderPlanTable(events);

    document.getElementById("plan-placeholder").style.display = "none";
    document.getElementById("plan-results").style.display = "block";
}

function genererCheckpoints(dist) {
    const points = [];
    const standards = [
        { km: 5, label: "5 km" }, { km: 10, label: "10 km" }, { km: 15, label: "15 km" },
        { km: 21.0975, label: "Semi-marathon" }, { km: 20, label: "20 km" }, { km: 25, label: "25 km" },
        { km: 30, label: "30 km" }, { km: 35, label: "35 km" }, { km: 40, label: "40 km" },
        { km: 42.195, label: "Marathon" }
    ];
    standards.forEach(s => { if (s.km < dist - 0.5) points.push(s); });
    if (points.length === 0) {
        for (let k = 5; k < dist; k += 5) points.push({ km: k, label: `${k} km` });
    }
    return points.sort((a, b) => a.km - b.km).filter((p, i, arr) =>
        i === 0 || p.km - arr[i - 1].km >= 4.5
    );
}

function renderPlanResume({ dureeMin, totalEau, preRace, postRace, totalGluc, nbGels, intensite, glucParH, gelInterv }) {
    const h = Math.floor(dureeMin / 60);
    const m = Math.round(dureeMin % 60);
    const dureeLabel = h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
    const intensiteLabel = { faible: "Faible", moderee: "Modérée", elevee: "Élevée" }[intensite];

    document.getElementById("plan-resume").innerHTML = `
        <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
                <div class="card text-center p-3 border-0 bg-light">
                    <div class="text-muted small">Durée estimée</div>
                    <div class="fw-bold fs-4 text-primary">${dureeLabel}</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="card text-center p-3 border-0 bg-light">
                    <div class="text-muted small">Eau pendant la course</div>
                    <div class="fw-bold fs-4 text-info">${totalEau} mL</div>
                    <div class="text-muted" style="font-size:.75rem">+ ${preRace} mL avant / ${postRace} mL après</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="card text-center p-3 border-0 bg-light">
                    <div class="text-muted small">Glucides nécessaires</div>
                    <div class="fw-bold fs-4 text-warning">${totalGluc} g</div>
                    <div class="text-muted" style="font-size:.75rem">${glucParH} g/h · intensité ${intensiteLabel}</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="card text-center p-3 border-0 bg-light">
                    <div class="text-muted small">Gels à emporter</div>
                    <div class="fw-bold fs-4 text-danger">${nbGels > 0 ? nbGels : "—"}</div>
                    <div class="text-muted" style="font-size:.75rem">${nbGels > 0 ? `1 gel / ~${gelInterv} min` : "Course trop courte"}</div>
                </div>
            </div>
        </div>`;
}

function renderPlanTable(events) {
    const colorMap = {
        avant:   "table-secondary",
        depart:  "table-success",
        arrivee: "table-success",
        apres:   "table-secondary",
        passage: "table-light",
        eau:     "table-info",
        nutri:   "table-warning",
    };

    let html = `
        <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle">
            <thead class="table-dark">
                <tr>
                    <th>⏱ Temps</th>
                    <th>📍 km</th>
                    <th>Événement</th>
                    <th>Détail</th>
                </tr>
            </thead>
            <tbody>`;

    events.forEach(ev => {
        const cls = colorMap[ev.type] || "";
        const tempsLabel = ev.minuteCourse < 0 || ev.type === "apres" ? "—" : ev.minuteCourse === 0 ? "00:00" : formatTemps(ev.minuteCourse * 60);
        const kmLabel = ev.km != null ? ev.km.toFixed(1) : "—";
        html += `<tr class="${cls}">
            <td class="fw-semibold text-nowrap">${tempsLabel}</td>
            <td class="text-nowrap">${kmLabel}</td>
            <td>${ev.label}</td>
            <td class="text-muted small">${ev.detail}</td>
        </tr>`;
    });

    html += `</tbody></table></div>
        <div class="info-bubble mt-2">
            <i class="bi bi-info-circle me-1"></i>
            <strong>Légende :</strong>
            <span class="badge bg-success me-1">Départ / Arrivée</span>
            <span class="badge bg-secondary me-1">Avant / Après course</span>
            <span class="badge bg-info text-dark me-1">Hydratation</span>
            <span class="badge bg-warning text-dark me-1">Gel / Ravitaillement</span>
            <span class="badge bg-light text-dark border me-1">Temps de passage</span>
            · Toujours avaler un gel avec de l'eau.
        </div>`;

    document.getElementById("plan-table").innerHTML = html;
}

function exportPlanCSV() {
    const rows = document.querySelectorAll("#plan-table table tbody tr");
    if (!rows.length) return;
    let csv = "Temps;km;Événement;Détail\n";
    rows.forEach(r => {
        const cells = r.querySelectorAll("td");
        csv += Array.from(cells).map(c => `"${c.innerText.trim()}"`).join(";") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plan-course.csv";
    a.click();
}







