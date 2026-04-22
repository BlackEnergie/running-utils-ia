// =====================
// MODÈLES MATHÉMATIQUES
// =====================

const DISTANCES_PRED = [
    { label: "400 m", km: 0.4 },
    { label: "800 m", km: 0.8 },
    { label: "1 km", km: 1 },
    { label: "1 mile", km: 1.60934 },
    { label: "3 km", km: 3 },
    { label: "5 km", km: 5 },
    { label: "10 km", km: 10 },
    { label: "15 km", km: 15 },
    { label: "Semi-marathon", km: 21.0975 },
    { label: "Marathon", km: 42.195 },
    { label: "50 km", km: 50 },
    { label: "100 km", km: 100 },
];

const PURDY_WR = {
    0.4: 43.03,
    0.8: 100.91,
    1: 131.96,
    1.60934: 223.13,
    3: 440.67,
    5: 755.36,
    10: 1577.53,
    21.0975: 3561,
    42.195: 7299,
    50: 9000,
    100: 21036,
};

function riegelPredict(t1, d1, d2, e) {
    return t1 * Math.pow(d2 / d1, e || 1.06);
}

function cameronPredict(t1, d1, d2) {
    const a = 13.49681, b = 0.048865, c = 29.54, d = 1.4528;
    function cs(dm) {
        return a / (Math.pow(Math.log(dm), b) - c / Math.pow(dm, d));
    }
    const v1 = (d1 * 1000) / t1;
    return (d2 * 1000) / (v1 * (cs(d2 * 1000) / cs(d1 * 1000)));
}

function vo2maxFromPerf(t_min, d_km) {
    const v = (d_km / t_min) * 1000,
        vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v,
        pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t_min) + 0.2989558 * Math.exp(-0.1932605 * t_min);
    return vo2 / pct;
}

function vo2maxPredict(vo2max, d2) {
    let lo = 1, hi = 600;
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2,
            v = (d2 / mid) * 1000,
            vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v,
            pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * mid) + 0.2989558 * Math.exp(-0.1932605 * mid);
        if (vo2 / pct > vo2max) lo = mid;
        else hi = mid;
    }
    return ((lo + hi) / 2) * 60;
}

function purdyPoints(t, d) {
    const wr = PURDY_WR[d];
    return wr ? 950 * Math.pow(wr / t, 1.1) : null;
}

function purdyPredict(pts, d2) {
    const wr = PURDY_WR[d2];
    return wr ? wr * Math.pow(950 / pts, 1 / 1.1) : null;
}

function findNearestPurdy(dist) {
    return Object.keys(PURDY_WR)
        .map(Number)
        .reduce((a, b) => (Math.abs(b - dist) < Math.abs(a - dist) ? b : a));
}

function predictByModel(model, t1, d1, d2, exp, vo2max, purdyPts) {
    switch (model) {
        case "riegel":     return riegelPredict(t1, d1, d2, 1.06);
        case "riegel_var": return riegelPredict(t1, d1, d2, exp);
        case "cameron":    return cameronPredict(t1, d1, d2);
        case "vo2max":     return vo2maxPredict(vo2max, d2);
        case "purdy":      return purdyPts ? purdyPredict(purdyPts, d2) : null;
        default:           return riegelPredict(t1, d1, d2, 1.06);
    }
}

// =====================
// INTERFACE PRÉDICTION
// =====================

function selectModel(m) {
    RU.selectedModel = m;
    document.querySelectorAll(".model-card").forEach((c) => c.classList.remove("selected"));
    document.getElementById("model-" + m).classList.add("selected");
    const labels = {
        riegel: "Riegel",
        riegel_var: "Riegel variable",
        cameron: "Cameron",
        vo2max: "Daniels & Gilbert",
        purdy: "Purdy",
        all: "Comparaison",
    };
    document.getElementById("model-badge-display").textContent = labels[m] || m;
}

function calculerPredictions() {
    clearFieldErrors('pred-dist', 'pred-h', 'pred-min', 'pred-sec');
    const dist1 = parseFloat(document.getElementById("pred-dist").value),
        h = parseFloat(document.getElementById("pred-h").value) || 0,
        m = parseFloat(document.getElementById("pred-min").value) || 0,
        s = parseFloat(document.getElementById("pred-sec").value) || 0;
    if (!dist1 || dist1 <= 0) return showFieldError('pred-dist', 'Distance invalide.');
    const temps1 = h * 3600 + m * 60 + s;
    if (temps1 <= 0) return showFieldError('pred-h', 'Temps invalide.');

    const vo2max = vo2maxFromPerf(temps1 / 60, dist1),
        purdyPts = purdyPoints(temps1, dist1) || purdyPoints(temps1, findNearestPurdy(dist1)),
        riegelExp = parseFloat(document.getElementById("riegel-exp").value) || 1.06,
        vma = dist1 / (temps1 / 3600);

    document.getElementById("pred-ref-summary").textContent = `${dist1} km en ${formatTemps(temps1)}`;
    document.getElementById("pred-ref-allure").textContent = `Allure : ${formatAllure(temps1 / dist1)}/km · ${vma.toFixed(2)} km/h`;
    document.getElementById("pred-ref-vo2max").textContent = `VO2max estimée : ${vo2max.toFixed(1)} ml/kg/min`;
    showResult("pred-ref-box");

    let html = "";

    if (RU.selectedModel === "all") {
        const models = [
            { key: "riegel", label: "Riegel" },
            { key: "riegel_var", label: `Riegel(${riegelExp})` },
            { key: "cameron", label: "Cameron" },
            { key: "vo2max", label: "VO2max" },
            { key: "purdy", label: "Purdy" },
        ];
        html = `<table class="table table-bordered table-hover text-center small">
            <thead class="table-dark">
                <tr><th>Distance</th>${models.map((m) => `<th>${m.label}</th>`).join("")}</tr>
            </thead>
            <tbody>`;
        DISTANCES_PRED.forEach((d) => {
            const isRef = Math.abs(d.km - dist1) < 0.01;
            html += `<tr${isRef ? ' class="table-success"' : ""}>
                <td><strong>${d.label}</strong>${isRef ? ' <span class="badge bg-success">réf.</span>' : ""}</td>`;
            models.forEach((mo) => {
                const t2 = predictByModel(mo.key, temps1, dist1, d.km, riegelExp, vo2max, purdyPts);
                html += `<td>${t2 && t2 > 0 ? formatTemps(t2) : "—"}</td>`;
            });
            html += "</tr>";
        });
        html += "</tbody></table>";
        document.getElementById("pred-model-info").innerHTML =
            `<i class="bi bi-info-circle me-2"></i><strong>Comparaison de tous les modèles.</strong>`;
    } else {
        html = `<table class="table table-hover text-center mb-0">
            <thead class="table-dark">
                <tr><th>Distance</th><th>Temps</th><th>Allure</th><th>Vitesse</th><th>% VMA</th><th>% VO2max</th></tr>
            </thead>
            <tbody>`;
        DISTANCES_PRED.forEach((d) => {
            const t2 = predictByModel(RU.selectedModel, temps1, dist1, d.km, riegelExp, vo2max, purdyPts);
            if (!t2 || t2 <= 0) {
                html += `<tr><td>${d.label}</td><td colspan="5" class="text-muted">—</td></tr>`;
                return;
            }
            const isRef = Math.abs(d.km - dist1) < 0.01,
                isShorter = d.km < dist1,
                vitesse = d.km / (t2 / 3600),
                allure = t2 / d.km,
                pctVMA = ((vitesse / vma) * 100).toFixed(1),
                v_mmin = (vitesse / 60) * 1000,
                vo2c = -4.6 + 0.182258 * v_mmin + 0.000104 * v_mmin * v_mmin,
                pctVO2 = Math.min((vo2c / vo2max) * 100, 100).toFixed(1),
                badgePct =
                    parseFloat(pctVMA) >= 95 ? "bg-danger"
                    : parseFloat(pctVMA) >= 85 ? "bg-warning text-dark"
                    : parseFloat(pctVMA) >= 75 ? "bg-info text-dark"
                    : "bg-success";

            html += `<tr${isRef ? ' class="table-success"' : ""}>
                <td>
                    <strong>${d.label}</strong>
                    ${isRef ? '<span class="badge bg-success ms-1">réf.</span>' : ""}
                    ${!isRef && isShorter ? '<span class="badge bg-secondary ms-1" style="font-size:.7rem">↑</span>' : ""}
                    ${!isRef && !isShorter ? '<span class="badge bg-warning text-dark ms-1" style="font-size:.7rem">↓</span>' : ""}
                </td>
                <td><strong>${formatTemps(t2)}</strong></td>
                <td>${formatAllure(allure)}/km</td>
                <td>${vitesse.toFixed(2)} km/h</td>
                <td><span class="badge ${badgePct}">${pctVMA}%</span></td>
                <td>${pctVO2}%</td>
            </tr>`;
        });
        html += "</tbody></table>";

        const infos = {
            riegel:     `<i class="bi bi-info-circle me-2"></i><strong>Riegel (1977)</strong> — T₂ = T₁ × (D₂/D₁)^1,06 <a href="https://en.wikipedia.org/wiki/Peter_Riegel" target="_blank">En savoir plus</a>`,
            riegel_var: `<i class="bi bi-info-circle me-2"></i><strong>Riegel variable</strong> — Exposant personnalisé. <a href="https://en.wikipedia.org/wiki/Peter_Riegel" target="_blank">En savoir plus</a>`,
            cameron:    `<i class="bi bi-info-circle me-2"></i><strong>Cameron</strong> — Modèle logarithmique. <a href="https://www.cs.uml.edu/~phoffman/xcinfo3.html" target="_blank">En savoir plus</a>`,
            vo2max:     `<i class="bi bi-info-circle me-2"></i><strong>Daniels & Gilbert</strong> — Basé sur la VO2max. <a href="https://runsmartproject.com/calculator/" target="_blank">En savoir plus</a>`,
            purdy:      `<i class="bi bi-info-circle me-2"></i><strong>Purdy (1974)</strong> — Basé sur les records du monde. <a href="https://en.wikipedia.org/wiki/Purdy_Points" target="_blank">En savoir plus</a>`,
        };
        document.getElementById("pred-model-info").innerHTML = infos[RU.selectedModel] || "";
    }

    document.getElementById("pred-table-container").innerHTML = html;
    document.getElementById("pred-results-placeholder").style.display = "none";
    document.getElementById("pred-results").style.display = "block";
}

