// =====================
// KILOMÈTRES EFFORT
// =====================

function calculerKE() {
    clearFieldErrors('ke-distance');
    const dist   = parseFloat(document.getElementById('ke-distance').value);
    const dPlus  = parseFloat(document.getElementById('ke-dplus').value)  || 0;
    const dMoins = parseFloat(document.getElementById('ke-dminus').value) || 0;

    if (!dist || dist <= 0) return showFieldError('ke-distance', 'Distance invalide.');

    const ke = calculerKmEfforts(dist, dPlus, dMoins);

    document.getElementById('result-ke-value').textContent = ke.toFixed(2) + ' KE';

    const parts = [`${dist} km plat`];
    if (dPlus)  parts.push(`+ ${dPlus} m D+ (≈ ${(dPlus / 100).toFixed(1)} km)`);
    if (dMoins) parts.push(`+ ${dMoins} m D− (≈ ${(dMoins / 200).toFixed(1)} km)`);
    document.getElementById('result-ke-detail').textContent = parts.join(' ');

    document.getElementById('result-ke').style.display = 'block';
}
