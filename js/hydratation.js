// =====================
// HYDRATATION
// =====================

function calculerHydratation() {
    clearFieldErrors('hydra-poids', 'hydra-distance', 'hydra-min', 'hydra-sec');
    const poids  = parseFloat(document.getElementById("hydra-poids").value);
    const dist   = parseFloat(document.getElementById("hydra-distance").value);
    const m      = parseFloat(document.getElementById("hydra-min").value) || 0;
    const s      = parseFloat(document.getElementById("hydra-sec").value) || 0;
    const dPlus  = parseFloat(document.getElementById("hydra-dplus").value)  || 0;
    const dMoins = parseFloat(document.getElementById("hydra-dminus").value) || 0;

    if (!poids || poids <= 0) return showFieldError('hydra-poids', 'Poids invalide.');
    if (!dist  || dist  <= 0) return showFieldError('hydra-distance', 'Distance invalide.');
    if (m === 0 && s === 0)   return showFieldError('hydra-min', 'Allure invalide.');

    const allureSec = m * 60 + s;
    const ke        = calculerKmEfforts(dist, dPlus, dMoins);
    const dureeH    = (allureSec * ke) / 3600;
    const temp      = document.getElementById("hydra-temperature").value;
    const humi      = document.getElementById("hydra-humidite").value;
    const transpi   = document.getElementById("hydra-transpiration").value;

    // Taux de sueur (L/h)
    const sweatRate = calculerSweatRate(transpi, temp, humi);

    const totalSweat  = sweatRate * dureeH * 1000; // mL
    const totalNeeded = Math.round(totalSweat * HYDRA_COMPENSATION);
    const preRace     = 400;
    const postRace    = Math.round(totalSweat * HYDRA_RECUP_FACTOR);

    const minutesCourse = Math.round(dureeH * 60);
    const priseFreq     = Math.round(minutesCourse / Math.max(Math.floor(minutesCourse / 20), 1));
    const nbPrises      = Math.floor(minutesCourse / priseFreq);
    const mlParPrise    = nbPrises > 0 ? Math.round(totalNeeded / nbPrises) : totalNeeded;

    const tempLabel = {
        frais: "Frais (< 10°C)", tempere: "Tempéré (10–20°C)",
        chaud: "Chaud (20–28°C)", "tres-chaud": "Très chaud (> 28°C)",
    }[temp];

    document.getElementById("hydra-summary-cards").innerHTML = `
        <div class="col-6 col-md-3">
            <div class="card text-center p-3 border-0 bg-light">
                <div class="text-muted small">Durée estimée</div>
                <div class="fw-bold fs-4 text-primary">${formatTemps(allureSec * dist)}</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card text-center p-3 border-0 bg-light">
                <div class="text-muted small">Transpiration</div>
                <div class="fw-bold fs-4 text-danger">${(sweatRate * 1000).toFixed(0)} mL/h</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card text-center p-3 border-0 bg-light">
                <div class="text-muted small">Pertes totales</div>
                <div class="fw-bold fs-4 text-warning">${Math.round(totalSweat)} mL</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card text-center p-3 border-0 bg-light">
                <div class="text-muted small">À boire (course)</div>
                <div class="fw-bold fs-4 text-success">${totalNeeded} mL</div>
            </div>
        </div>`;

    document.getElementById("hydra-detail").innerHTML = `
        <div class="info-bubble mb-3">
            <i class="bi bi-thermometer me-2"></i>Conditions : <strong>${tempLabel}</strong>
            · Transpiration estimée : <strong>${sweatRate.toFixed(2)} L/h</strong>
        </div>
        <div class="row g-2">
            <div class="col-md-4">
                <div class="p-3 rounded" style="background:#e8f4fd;border-left:4px solid #2980b9">
                    <div class="fw-semibold small mb-1">🥤 Avant la course</div>
                    <div class="fw-bold">${preRace} mL</div>
                    <div class="text-muted" style="font-size:.8rem">Dans les 2h précédant le départ</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="p-3 rounded" style="background:#e9f7ef;border-left:4px solid #27ae60">
                    <div class="fw-semibold small mb-1">🏃 Pendant la course</div>
                    <div class="fw-bold">${totalNeeded} mL</div>
                    <div class="text-muted" style="font-size:.8rem">~${mlParPrise} mL toutes les ${priseFreq} min</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="p-3 rounded" style="background:#fef9e7;border-left:4px solid #f39c12">
                    <div class="fw-semibold small mb-1">🔄 Après la course</div>
                    <div class="fw-bold">${postRace} mL</div>
                    <div class="text-muted" style="font-size:.8rem">Dans les 4h après la course</div>
                </div>
            </div>
        </div>`;

    let planHtml = '<ul class="list-unstyled mb-0">';
    planHtml += `<li class="mb-2">⏰ <strong>J-1 :</strong> Boire régulièrement, urines claires = bonne hydratation.</li>`;
    planHtml += `<li class="mb-2">🌅 <strong>Matin de la course :</strong> ${preRace} mL d'eau 1–2h avant le départ.</li>`;
    if (nbPrises > 0) {
        for (let i = 1; i <= Math.min(nbPrises, 6); i++) {
            planHtml += `<li class="mb-2">🏃 <strong>${i * priseFreq} min :</strong> ~${mlParPrise} mL (${Math.round(mlParPrise / 2)} mL minimum).</li>`;
        }
    }
    if (dist >= 21) {
        planHtml += `<li class="mb-2">⚡ <strong>Boissons isotoniques :</strong> Envisagez une boisson avec électrolytes toutes les 45–60 min.</li>`;
    }
    planHtml += `<li class="mb-2">🔄 <strong>Récupération :</strong> ${postRace} mL dans les 4h + aliments salés pour reconstituer les électrolytes.</li>`;
    planHtml += "</ul>";

    document.getElementById("hydra-plan").innerHTML = planHtml;
    document.getElementById("hydra-placeholder").style.display = "none";
    document.getElementById("hydra-results").style.display = "block";
}

