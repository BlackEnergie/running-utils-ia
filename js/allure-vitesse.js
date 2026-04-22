// =====================
// ALLURE ↔ VITESSE
// =====================

function allureToVitesse() {
    clearFieldErrors('allure-min', 'allure-sec');
    const m = parseFloat(document.getElementById("allure-min").value) || 0,
        s = parseFloat(document.getElementById("allure-sec").value) || 0;
    if (m === 0 && s === 0) return showFieldError('allure-min', 'Allure invalide.');
    document.getElementById("result-av-value").textContent = (60 / (m + s / 60)).toFixed(2);
    showResult("result-av");
}

function vitesseToAllure() {
    clearFieldErrors('vitesse-kmh');
    const v = parseFloat(document.getElementById("vitesse-kmh").value);
    if (!v || v <= 0) return showFieldError('vitesse-kmh', 'Vitesse invalide.');
    document.getElementById("result-va-value").textContent = formatAllure(3600 / v);
    showResult("result-va");
}

// =====================
// TABLEAU DE RÉFÉRENCE
// =====================

function genererTableauReference() {
    const tbody = document.getElementById("tableau-reference");
    [
        [3, 0], [3, 30],
        [4, 0], [4, 30],
        [5, 0], [5, 30],
        [6, 0], [6, 30],
        [7, 0], [7, 30],
        [8, 0],
    ].forEach(([m, s]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><strong>${m}'${s.toString().padStart(2, "0")}"</strong></td><td>${(60 / (m + s / 60)).toFixed(2)} km/h</td>`;
        tbody.appendChild(tr);
    });
}

// =====================
// TABLEAU MULTI (calculateur)
// =====================

function genererTableau() {
    clearFieldErrors('range-min-m', 'range-max-m');
    const s1 =
            (parseInt(document.getElementById("range-min-m").value) || 3) * 60 +
            (parseInt(document.getElementById("range-min-s").value) || 0),
        s2 =
            (parseInt(document.getElementById("range-max-m").value) || 7) * 60 +
            (parseInt(document.getElementById("range-max-s").value) || 0),
        step = parseInt(document.getElementById("range-step").value);

    if (s1 >= s2) return showFieldError('range-min-m', 'Allure min doit être < allure max.');

    const D = [
        { label: "1 km", km: 1 },
        { label: "5 km", km: 5 },
        { label: "10 km", km: 10 },
        { label: "Semi", km: 21.0975 },
        { label: "Marathon", km: 42.195 },
    ];

    let html = `<table class="table table-bordered table-striped table-hover text-center small">
        <thead class="table-dark">
            <tr><th>Allure</th><th>Vitesse</th>${D.map((d) => `<th>${d.label}</th>`).join("")}</tr>
        </thead>
        <tbody>`;

    for (let s = s1; s <= s2; s += step) {
        const m = Math.floor(s / 60),
            sec = s % 60;
        html += `<tr>
            <td><strong>${m}'${sec.toString().padStart(2, "0")}"</strong></td>
            <td>${(3600 / s).toFixed(2)} km/h</td>
            ${D.map((d) => `<td>${formatTemps(s * d.km)}</td>`).join("")}
        </tr>`;
    }

    html += "</tbody></table>";
    document.getElementById("tableau-multi-container").innerHTML = html;
}

