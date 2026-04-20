// =====================
// CHARGE D'ENTRAÎNEMENT (ATL / CTL / TSB / TSS)
// =====================

let seances = [];

const TSS_AUTO = {
    recup:     30,
    endurance: 55,
    tempo:     80,
    interval:  100,
    course:    150,
    longue:    70,
    custom:    0,
};

function updateTSSAuto() {
    const type = document.getElementById("charge-type").value,
        h = parseFloat(document.getElementById("charge-duree-h").value) || 0,
        m = parseFloat(document.getElementById("charge-duree-min").value) || 0;
    if (type === "custom") return;
    const base = TSS_AUTO[type] || 0;
    const dureeH = h + m / 60;
    // Si durée non renseignée : afficher le TSS de référence (base = pour 1h)
    // Si durée renseignée : scaler proportionnellement
    document.getElementById("charge-tss").value = Math.round(dureeH > 0 ? base * dureeH : base);
}

function ajouterSeance() {
    const date = document.getElementById("charge-date").value,
        type = document.getElementById("charge-type").value,
        h = parseFloat(document.getElementById("charge-duree-h").value) || 0,
        m = parseFloat(document.getElementById("charge-duree-min").value) || 0,
        tss = parseFloat(document.getElementById("charge-tss").value);
    if (!date) return alert("Veuillez sélectionner une date.");
    if (!tss || tss <= 0) return alert("TSS invalide.");

    const labels = {
        recup: "Récupération", endurance: "Endurance", tempo: "Tempo/Seuil",
        interval: "Fractionné", course: "Course", longue: "Sortie longue", custom: "Personnalisé",
    };
    seances.push({ date, type, label: labels[type] || type, duree: h * 60 + m, tss });
    seances.sort((a, b) => new Date(a.date) - new Date(b.date));
    majListeSeances();
    calculerCharge();
}

function majListeSeances() {
    const container = document.getElementById("seances-list");
    document.getElementById("nb-seances-badge").textContent = seances.length;
    if (seances.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-3 small">Aucune séance</p>';
        return;
    }
    const colors = {
        recup: "primary", endurance: "success", tempo: "warning",
        interval: "danger", course: "dark", longue: "info", custom: "secondary",
    };
    container.innerHTML = seances
        .slice()
        .reverse()
        .map((s, i) => {
            const realIdx = seances.length - 1 - i;
            return `
            <div class="plan-day d-flex justify-content-between align-items-center">
                <div>
                    <div class="small fw-semibold">${formatDate(s.date)}</div>
                    <span class="badge bg-${colors[s.type] || "secondary"} seance-badge">${s.label}</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <div class="text-end">
                        <div class="fw-bold text-warning">${s.tss} TSS</div>
                        <div class="text-muted" style="font-size:.75rem">
                            ${s.duree > 0 ? `${Math.floor(s.duree / 60)}h${(s.duree % 60).toString().padStart(2, "0")}` : "—"}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="supprimerSeance(${realIdx})" title="Supprimer"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        })
        .join("");
}

function supprimerSeance(idx) {
    seances.splice(idx, 1);
    majListeSeances();
    calculerCharge();
}

function effacerSeances() {
    if (confirm("Effacer toutes les séances ?")) {
        seances = [];
        majListeSeances();
        calculerCharge();
    }
}

function calculerCharge() {
    if (seances.length === 0) {
        ["atl-value", "ctl-value", "tsb-value", "tss-semaine-value"].forEach(
            (id) => (document.getElementById(id).textContent = "—"),
        );
        document.getElementById("charge-interpretation").innerHTML =
            '<p class="text-muted text-center">Ajoutez des séances pour voir votre analyse</p>';
        document.getElementById("charge-historique-tbody").innerHTML = "";
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ATL : EWMA sur 7 jours  |  CTL : EWMA sur 42 jours
    const kATL = 1 / 7, kCTL = 1 / 42;
    let atl = 0, ctl = 0;

    const firstDate = new Date(seances[0].date);
    const days = Math.ceil((today - firstDate) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < days; i++) {
        const d = new Date(firstDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const tssJour = seances.filter((s) => s.date === dateStr).reduce((sum, s) => sum + s.tss, 0);
        atl = atl * (1 - kATL) + tssJour * kATL;
        ctl = ctl * (1 - kCTL) + tssJour * kCTL;
    }

    const tsb = ctl - atl;

    const lundi = getWeekStart(today);
    const tssWeek = seances
        .filter((s) => { const d = new Date(s.date); return d >= lundi && d <= today; })
        .reduce((sum, s) => sum + s.tss, 0);

    document.getElementById("atl-value").textContent = atl.toFixed(0);
    document.getElementById("ctl-value").textContent = ctl.toFixed(0);
    document.getElementById("tsb-value").textContent = (tsb >= 0 ? "+" : "") + tsb.toFixed(0);
    document.getElementById("tss-semaine-value").textContent = tssWeek;

    // Interprétation TSB
    let interp = "", couleurTSB = "";
    if (tsb > 25) {
        interp = "😴 <strong>Sous-entraîné / Désentraîné</strong> — Vous êtes très reposé mais votre forme de fond diminue. Augmentez progressivement la charge.";
        couleurTSB = "info";
    } else if (tsb >= 5) {
        interp = "✅ <strong>Forme optimale</strong> — Vous êtes frais et en forme. Idéal pour une compétition ou une séance clé.";
        couleurTSB = "success";
    } else if (tsb >= -10) {
        interp = "⚡ <strong>En charge productive</strong> — Légère fatigue normale en période d'entraînement. Continuez ainsi.";
        couleurTSB = "warning";
    } else if (tsb >= -30) {
        interp = "⚠️ <strong>Fatigue accumulée</strong> — Charge élevée. Surveillez les signes de surmenage. Prévoyez une semaine de récupération.";
        couleurTSB = "orange";
    } else {
        interp = "🚨 <strong>Surmenage / Surentraînement</strong> — Charge trop élevée. Réduisez immédiatement la charge et reposez-vous.";
        couleurTSB = "danger";
    }

    document.getElementById("charge-interpretation").innerHTML = `
        <div class="alert alert-${couleurTSB === "orange" ? "warning" : couleurTSB} mb-3">${interp}</div>
        <div class="row g-3">
            <div class="col-md-4">
                <div class="p-3 bg-light rounded text-center">
                    <div class="text-muted small">ATL — Fatigue</div>
                    <div class="fw-bold fs-4 text-danger">${atl.toFixed(0)}</div>
                    <div class="text-muted small">Charge 7 jours</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="p-3 bg-light rounded text-center">
                    <div class="text-muted small">CTL — Forme</div>
                    <div class="fw-bold fs-4 text-success">${ctl.toFixed(0)}</div>
                    <div class="text-muted small">Charge 42 jours</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="p-3 bg-light rounded text-center">
                    <div class="text-muted small">TSB — Condition</div>
                    <div class="fw-bold fs-4 ${tsb >= 0 ? "text-success" : "text-danger"}">${tsb >= 0 ? "+" : ""}${tsb.toFixed(0)}</div>
                    <div class="text-muted small">CTL - ATL</div>
                </div>
            </div>
        </div>`;

    // Historique 4 semaines
    let histHtml = "";
    for (let w = 3; w >= 0; w--) {
        const wStart = new Date(lundi);
        wStart.setDate(wStart.getDate() - w * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);
        const wSeances = seances.filter((s) => { const d = new Date(s.date); return d >= wStart && d <= wEnd; });
        const wTSS = wSeances.reduce((sum, s) => sum + s.tss, 0),
            wMoy = (wTSS / 7).toFixed(0);
        const charge =
            wTSS > 500 ? "Très élevée"
            : wTSS > 350 ? "Élevée"
            : wTSS > 200 ? "Modérée"
            : wTSS > 100 ? "Légère"
            : "Très légère";
        const badgeC =
            wTSS > 500 ? "danger"
            : wTSS > 350 ? "warning"
            : wTSS > 200 ? "info"
            : wTSS > 100 ? "success"
            : "secondary";
        histHtml += `<tr>
            <td>${formatDate(wStart)} – ${formatDate(wEnd)}</td>
            <td>${wSeances.length}</td>
            <td><strong>${wTSS}</strong></td>
            <td>${wMoy}/j</td>
            <td><span class="badge bg-${badgeC}">${charge}</span></td>
        </tr>`;
    }
    document.getElementById("charge-historique-tbody").innerHTML = histHtml;
}

