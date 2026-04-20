// =====================
// ZONES DE FRÉQUENCE CARDIAQUE
// =====================

function toggleFCInputs() {
    const m = document.getElementById("fc-methode").value;
    document.getElementById("fc-repos-zone").style.display = m === "karvonen" ? "block" : "none";
}

function estimerFCmax() {
    const age = parseFloat(document.getElementById("fc-age").value);
    if (!age || age <= 0) return alert("Âge invalide.");
    document.getElementById("fc-max").value = Math.round(220 - age);
}

function calculerZonesFC() {
    const fcmax = parseFloat(document.getElementById("fc-max").value),
        methode = document.getElementById("fc-methode").value;
    if (!fcmax || fcmax <= 0) return alert("FCmax invalide.");

    const fcrepos = methode === "karvonen" ? parseFloat(document.getElementById("fc-repos").value) || 0 : 0;
    if (methode === "karvonen" && fcrepos <= 0) return alert("FC de repos invalide.");
    const fcReserve = fcmax - fcrepos;

    const zones = [
        { nom: "Zone 1", label: "Récupération active",    pct: [50, 60],  couleur: "#3498db", effet: "Récupération, brûle les graisses, très faible effort" },
        { nom: "Zone 2", label: "Endurance fondamentale", pct: [60, 70],  couleur: "#2ecc71", effet: "Base aérobie, longues sorties, économie de course" },
        { nom: "Zone 3", label: "Aérobie modéré",         pct: [70, 80],  couleur: "#f1c40f", effet: "Amélioration cardio-vasculaire, seuil aérobie" },
        { nom: "Zone 4", label: "Seuil lactique",         pct: [80, 90],  couleur: "#e67e22", effet: "Amélioration du seuil anaérobie, tempo" },
        { nom: "Zone 5", label: "VO2max / VMA",           pct: [90, 100], couleur: "#e74c3c", effet: "Développement de la puissance maximale aérobie" },
    ];

    let barsHtml = "", tbodyHtml = "", cardsHtml = "";
    const fcReserveLabel = methode === "karvonen" ? ` (FC réserve : ${fcReserve} bpm)` : "";

    zones.forEach((z) => {
        let bpmMin, bpmMax;
        if (methode === "karvonen") {
            bpmMin = Math.round(fcrepos + (fcReserve * z.pct[0]) / 100);
            bpmMax = Math.round(fcrepos + (fcReserve * z.pct[1]) / 100);
        } else {
            bpmMin = Math.round((fcmax * z.pct[0]) / 100);
            bpmMax = Math.round((fcmax * z.pct[1]) / 100);
        }
        const widthPct = z.pct[1] - z.pct[0];

        barsHtml += `<div class="mb-3">
            <div class="d-flex justify-content-between mb-1">
                <span class="fw-semibold small">${z.nom} — ${z.label}</span>
                <span class="fw-bold small">${bpmMin}–${bpmMax} bpm</span>
            </div>
            <div class="progress" style="height:22px;">
                <div class="progress-bar" style="width:${widthPct * 2}%;background:${z.couleur};font-size:.8rem;" role="progressbar">
                    ${z.pct[0]}–${z.pct[1]}%
                </div>
            </div>
        </div>`;

        tbodyHtml += `<tr>
            <td><span class="badge" style="background:${z.couleur}">${z.nom}</span></td>
            <td>${z.label}</td>
            <td>${z.pct[0]}–${z.pct[1]}%</td>
            <td><strong>${bpmMin}–${bpmMax} bpm</strong></td>
            <td class="text-start">${z.effet}</td>
        </tr>`;
    });

    cardsHtml = `<div class="col-6 col-md-4">
        <div class="p-3 bg-light rounded text-center">
            <div class="text-muted small">FCmax</div>
            <div class="fw-bold fs-4 text-danger">${fcmax}</div>
            <div class="text-muted small">bpm</div>
        </div>
    </div>`;

    if (methode === "karvonen") {
        cardsHtml += `<div class="col-6 col-md-4">
            <div class="p-3 bg-light rounded text-center">
                <div class="text-muted small">FC repos</div>
                <div class="fw-bold fs-4 text-primary">${fcrepos}</div>
                <div class="text-muted small">bpm</div>
            </div>
        </div>
        <div class="col-6 col-md-4">
            <div class="p-3 bg-light rounded text-center">
                <div class="text-muted small">FC réserve</div>
                <div class="fw-bold fs-4 text-success">${fcReserve}</div>
                <div class="text-muted small">bpm</div>
            </div>
        </div>`;
    }

    document.getElementById("fc-summary-cards").innerHTML = cardsHtml;
    document.getElementById("fc-zones-bars").innerHTML =
        `<div class="info-bubble mb-3">
            <i class="bi bi-info-circle me-2"></i>Méthode :
            <strong>${methode === "karvonen" ? "Karvonen (FC réserve)" : "% FCmax"}</strong>${fcReserveLabel}
        </div>` + barsHtml;
    document.getElementById("fc-zones-tbody").innerHTML = tbodyHtml;
    document.getElementById("fc-results-placeholder").style.display = "none";
    document.getElementById("fc-results").style.display = "block";
}

