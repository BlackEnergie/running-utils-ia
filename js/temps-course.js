// =====================
// TEMPS DE COURSE
// =====================

function calculerTemps() {
    clearFieldErrors('tc-distance', 'tc-min', 'tc-sec');
    const dist = parseFloat(document.getElementById("tc-distance").value),
        m = parseFloat(document.getElementById("tc-min").value) || 0,
        s = parseFloat(document.getElementById("tc-sec").value) || 0;
    const dPlus  = parseFloat(document.getElementById("tc-dplus").value)  || 0;
    const dMoins = parseFloat(document.getElementById("tc-dminus").value) || 0;
    if (!dist || dist <= 0) return showFieldError('tc-distance', 'Distance invalide.');
    if (m === 0 && s === 0) return showFieldError('tc-min', 'Allure invalide.');
    const a = m * 60 + s;
    const ke = calculerKmEfforts(dist, dPlus, dMoins);
    const t = a * ke;
    document.getElementById("result-tc-value").textContent = formatTemps(t);
    let vitLabel = `Vitesse : ${(3600 / a).toFixed(2)} km/h`;
    if (ke > dist) vitLabel += ` · ${ke.toFixed(2)} km-effort`;
    document.getElementById("result-tc-vitesse").textContent = vitLabel;
    showResult("result-tc");
}

// =====================
// ALLURE POUR UN OBJECTIF
// =====================

function calculerAllure() {
    clearFieldErrors('obj-distance', 'obj-h', 'obj-min', 'obj-sec');
    const dist = parseFloat(document.getElementById("obj-distance").value),
        h = parseFloat(document.getElementById("obj-h").value) || 0,
        m = parseFloat(document.getElementById("obj-min").value) || 0,
        s = parseFloat(document.getElementById("obj-sec").value) || 0;
    const dPlus  = parseFloat(document.getElementById("obj-dplus").value)  || 0;
    const dMoins = parseFloat(document.getElementById("obj-dminus").value) || 0;
    if (!dist || dist <= 0) return showFieldError('obj-distance', 'Distance invalide.');
    const t = h * 3600 + m * 60 + s;
    if (t <= 0) return showFieldError('obj-h', 'Temps invalide.');
    const ke = calculerKmEfforts(dist, dPlus, dMoins);
    document.getElementById("result-obj-value").textContent = formatAllure(t / ke);
    let vitLabel = `Vitesse : ${(ke / (t / 3600)).toFixed(2)} km/h`;
    if (ke > dist) vitLabel += ` · ${ke.toFixed(2)} km-effort`;
    document.getElementById("result-obj-vitesse").textContent = vitLabel;
    showResult("result-obj");
}

