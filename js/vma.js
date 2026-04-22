// =====================
// VMA & VO2MAX
// =====================

function selectSeance(s) {
    RU.selectedSeance = s;
    document.querySelectorAll(".seance-card").forEach((c) => c.classList.remove("selected"));
    document.getElementById("seance-" + s).classList.add("selected");
    renderVmaInput();
}

function renderVmaInput() {
    const z = document.getElementById("vma-input-zone");
    const selectedSeance = RU.selectedSeance;
    let html = "";

    if (selectedSeance === "demi-cooper") {
        html = `
            <label class="form-label fw-semibold">Distance en 6 minutes</label>
            <div class="input-group mb-3">
                <input type="number" class="form-control" id="vma-input-1" placeholder="ex: 1500" min="0">
                <span class="input-group-text">mètres</span>
            </div>
            <div class="info-bubble mb-3">
                <i class="bi bi-lightbulb me-2"></i>Courez le plus loin possible pendant exactement 6 minutes.
            </div>`;
    } else if (selectedSeance === "cooper") {
        html = `
            <label class="form-label fw-semibold">Distance en 12 minutes</label>
            <div class="input-group mb-3">
                <input type="number" class="form-control" id="vma-input-1" placeholder="ex: 2800" min="0">
                <span class="input-group-text">mètres</span>
            </div>
            <div class="info-bubble mb-3">
                <i class="bi bi-lightbulb me-2"></i>Courez le plus loin possible pendant exactement 12 minutes.
            </div>`;
    } else if (selectedSeance === "vameval") {
        html = `
            <label class="form-label fw-semibold">Vitesse au dernier palier</label>
            <div class="input-group mb-3">
                <input type="number" class="form-control" id="vma-input-1" placeholder="ex: 15.5" step="0.5" min="8">
                <span class="input-group-text">km/h</span>
            </div>
            <div class="info-bubble mb-3">
                <i class="bi bi-lightbulb me-2"></i>Entrez la vitesse du dernier palier complété entièrement.
            </div>`;
    } else if (selectedSeance === "leger") {
        html = `
            <label class="form-label fw-semibold">Vitesse au dernier palier</label>
            <div class="input-group mb-3">
                <input type="number" class="form-control" id="vma-input-1" placeholder="ex: 12" step="0.5" min="6">
                <span class="input-group-text">km/h</span>
            </div>
            <label class="form-label fw-semibold">Votre âge</label>
            <div class="input-group mb-3">
                <input type="number" class="form-control" id="vma-input-2" placeholder="ex: 35" min="10" max="80">
                <span class="input-group-text">ans</span>
            </div>`;
    } else if (selectedSeance === "3200") {
        html = `
            <label class="form-label fw-semibold">Temps sur 3200m</label>
            <div class="row g-2 mb-3">
                <div class="col-6">
                    <div class="input-group">
                        <input type="number" class="form-control" id="vma-input-1" placeholder="min" min="0">
                        <span class="input-group-text">min</span>
                    </div>
                </div>
                <div class="col-6">
                    <div class="input-group">
                        <input type="number" class="form-control" id="vma-input-2" placeholder="sec" min="0" max="59">
                        <span class="input-group-text">sec</span>
                    </div>
                </div>
            </div>`;
    } else if (selectedSeance === "5min") {
        html = `
            <label class="form-label fw-semibold">Distance en 5 minutes</label>
            <div class="input-group mb-3">
                <input type="number" class="form-control" id="vma-input-1" placeholder="ex: 1350" min="0">
                <span class="input-group-text">mètres</span>
            </div>`;
    }

    html += `<button class="btn btn-convert w-100 mt-2" data-action="calculer-vma">
        <i class="bi bi-calculator me-2"></i>Calculer ma VMA
    </button>`;
    z.innerHTML = html;
}

function calculerVMA() {
    let vma = 0, vo2max = 0;
    const selectedSeance = RU.selectedSeance;

    if (selectedSeance === "demi-cooper") {
        const d = parseFloat(document.getElementById("vma-input-1").value);
        if (!d || d <= 0) return alert("Distance invalide.");
        vma = d / 100;
        vo2max = vma * VO2MAX_PAR_KMH;
    } else if (selectedSeance === "cooper") {
        const d = parseFloat(document.getElementById("vma-input-1").value);
        if (!d || d <= 0) return alert("Distance invalide.");
        vo2max = (d - 504.9) / 44.73;
        vma = vo2max / VO2MAX_PAR_KMH;
    } else if (selectedSeance === "vameval") {
        vma = parseFloat(document.getElementById("vma-input-1").value);
        if (!vma || vma <= 0) return alert("Vitesse invalide.");
        vo2max = vma * VO2MAX_PAR_KMH;
    } else if (selectedSeance === "leger") {
        const v = parseFloat(document.getElementById("vma-input-1").value),
            age = parseFloat(document.getElementById("vma-input-2").value);
        if (!v || v <= 0) return alert("Vitesse invalide.");
        if (!age || age <= 0) return alert("Âge invalide.");
        vo2max = 31.025 + 3.238 * v - 3.248 * age + 0.1536 * v * age;
        vma = vo2max / VO2MAX_PAR_KMH;
    } else if (selectedSeance === "3200") {
        const m = parseFloat(document.getElementById("vma-input-1").value) || 0,
            s = parseFloat(document.getElementById("vma-input-2").value) || 0;
        if (m === 0 && s === 0) return alert("Temps invalide.");
        vma = (3.2 / ((m * 60 + s) / 3600)) * 0.925;
        vo2max = vma * VO2MAX_PAR_KMH;
    } else if (selectedSeance === "5min") {
        const d = parseFloat(document.getElementById("vma-input-1").value);
        if (!d || d <= 0) return alert("Distance invalide.");
        vma = d / 83.33;
        vo2max = vma * VO2MAX_PAR_KMH;
    }

    if (vma <= 0 || isNaN(vma)) return alert("Calcul impossible.");
    RU.vma = vma;
    afficherResultatsVMA(vma, vo2max);
}

function afficherResultatsVMA(vma, vo2max) {
    document.getElementById("vma-value").textContent = vma.toFixed(1);
    document.getElementById("vo2max-value").textContent = vo2max.toFixed(1);

    let niveau, couleur;
    if (vo2max >= 70)      { niveau = "🏆 Élite";         couleur = "success";   }
    else if (vo2max >= 60) { niveau = "⚡ Très bon";       couleur = "primary";   }
    else if (vo2max >= 50) { niveau = "🔥 Bon niveau";     couleur = "info";      }
    else if (vo2max >= 40) { niveau = "👍 Intermédiaire";  couleur = "warning";   }
    else                   { niveau = "🌱 Débutant";       couleur = "secondary"; }

    document.getElementById("vma-niveau-badge").innerHTML =
        `<span class="badge bg-${couleur} fs-6 px-3 py-2">${niveau} — VO2max ${vo2max.toFixed(1)} ml/kg/min</span>`;

    const zones = [
        { nom: "Zone 1 — Récupération",         pct: [50,  60],  couleur: "#aed6f1", desc: "Footing très lent, récupération."         },
        { nom: "Zone 2 — Endurance fondamentale",pct: [60,  70],  couleur: "#82e0aa", desc: "Longues sorties, base aérobie."           },
        { nom: "Zone 3 — Allure marathon",       pct: [70,  80],  couleur: "#f9e79f", desc: "Tempo modéré, seuil aérobie."             },
        { nom: "Zone 4 — Seuil lactique",        pct: [80,  90],  couleur: "#f0b27a", desc: "Allure semi-marathon."                    },
        { nom: "Zone 5 — VMA",                   pct: [90,  100], couleur: "#f1948a", desc: "Intervalles, développement VMA."          },
        { nom: "Zone 6 — Anaérobie",             pct: [100, 120], couleur: "#c39bd3", desc: "Sprint, au-delà de la VMA."              },
    ];

    let zh = "";
    zones.forEach((z) => {
        const vMin = ((vma * z.pct[0]) / 100).toFixed(1),
            vMax = ((vma * z.pct[1]) / 100).toFixed(1),
            aMin = formatAllure(3600 / ((vma * z.pct[1]) / 100)),
            aMax = formatAllure(3600 / ((vma * z.pct[0]) / 100));
        zh += `<div class="zone-row mb-2" style="background:${z.couleur}22;border-left:4px solid ${z.couleur};">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                    <div class="fw-semibold small">${z.nom}</div>
                    <div class="text-muted" style="font-size:.78rem">${z.desc}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold small">${vMin}–${vMax} km/h</div>
                    <div class="text-muted" style="font-size:.78rem">${aMin}–${aMax}/km</div>
                    <span class="badge" style="background:${z.couleur};color:#333">${z.pct[0]}–${z.pct[1]}% VMA</span>
                </div>
            </div>
        </div>`;
    });
    document.getElementById("zones-container").innerHTML = zh;

    const distancesVMA = [
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
    ];
    const t1km = 3600 / vma;
    let tb = "";
    distancesVMA.forEach((d) => {
        const t = riegelPredict(t1km, 1, d.km, 1.06),
            vitesse = d.km / (t / 3600),
            allure = t / d.km,
            pctVMA = ((vitesse / vma) * 100).toFixed(1),
            v_mmin = (vitesse / 60) * 1000,
            vo2c = -4.6 + 0.182258 * v_mmin + 0.000104 * v_mmin * v_mmin,
            pctVO2 = Math.min((vo2c / vo2max) * 100, 100).toFixed(1),
            badgePct =
                parseFloat(pctVMA) >= 95 ? "bg-danger"
                : parseFloat(pctVMA) >= 85 ? "bg-warning text-dark"
                : parseFloat(pctVMA) >= 75 ? "bg-info text-dark"
                : "bg-success";
        tb += `<tr>
            <td><strong>${d.label}</strong></td>
            <td>${formatTemps(t)}</td>
            <td>${formatAllure(allure)}/km</td>
            <td>${vitesse.toFixed(2)} km/h</td>
            <td><span class="badge ${badgePct}">${pctVMA}%</span></td>
            <td>${pctVO2}%</td>
        </tr>`;
    });
    document.getElementById("distances-vma-tbody").innerHTML = tb;
    document.getElementById("vma-results-zone").style.display = "block";
    document.getElementById("vma-results-zone").scrollIntoView({ behavior: "smooth", block: "start" });
}

