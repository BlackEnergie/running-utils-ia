// =====================
// ANALYSE GPX
// =====================

/** Résultat de la dernière analyse, accessible par les autres modules */
let gpxData = null;
/** Liste de toutes les traces importées */
let gpxListe = [];

const _GPX_LS_KEY = 'ru_gpx_traces';

function _sauvegarderGPX() {
    try {
        // On stocke l'index de la trace active
        const actifIdx = gpxListe.indexOf(gpxData);
        localStorage.setItem(_GPX_LS_KEY, JSON.stringify({ traces: gpxListe, actif: actifIdx }));
    } catch (e) { /* quota dépassé : on ignore */ }
}

function _chargerGPX() {
    try {
        const raw = localStorage.getItem(_GPX_LS_KEY);
        if (!raw) return;
        const { traces, actif } = JSON.parse(raw);
        if (!Array.isArray(traces) || traces.length === 0) return;
        gpxListe = traces;
        gpxData  = gpxListe[actif >= 0 && actif < gpxListe.length ? actif : 0];
        _rendreListe();
        _afficherResultatGPX(gpxData);
    } catch (e) { /* données corrompues : on ignore */ }
}

/** Distance Haversine entre deux points GPS (en mètres) */
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parse un fichier GPX et retourne les données analysées */
function parseGPX(xmlText) {
    const doc    = new DOMParser().parseFromString(xmlText, 'application/xml');
    const points = Array.from(doc.querySelectorAll('trkpt, rtept, wpt'));

    if (points.length < 2) throw new Error('Fichier GPX invalide ou vide.');

    let distTotale = 0;
    let dPlus = 0, dMoins = 0;
    let dureeMs = null;
    let firstTime = null, lastTime = null;
    const elevations = [];
    const distCumulees = [0];
    const LISSAGE_ELE = 2; // ignore variations < 2 m (bruit GPS)

    for (let i = 0; i < points.length; i++) {
        const pt  = points[i];
        const lat = parseFloat(pt.getAttribute('lat'));
        const lon = parseFloat(pt.getAttribute('lon'));
        const ele = parseFloat(pt.querySelector('ele')?.textContent);
        const timeEl = pt.querySelector('time');

        if (!isNaN(ele)) elevations.push(ele);

        if (timeEl) {
            const t = new Date(timeEl.textContent).getTime();
            if (!firstTime) firstTime = t;
            lastTime = t;
        }

        if (i > 0) {
            const prev = points[i - 1];
            const d = haversine(
                parseFloat(prev.getAttribute('lat')), parseFloat(prev.getAttribute('lon')),
                lat, lon
            );
            distTotale += d;
            distCumulees.push(distTotale / 1000);

            if (elevations.length >= 2) {
                const delta = elevations[elevations.length - 1] - elevations[elevations.length - 2];
                if (delta > LISSAGE_ELE)  dPlus  += delta;
                if (delta < -LISSAGE_ELE) dMoins += -delta;
            }
        }
    }

    if (firstTime && lastTime && lastTime > firstTime) {
        dureeMs = lastTime - firstTime;
    }

    const distKm     = distTotale / 1000;
    const ke         = calculerKmEfforts(distKm, Math.round(dPlus), Math.round(dMoins));
    const allureSec  = dureeMs ? (dureeMs / 1000) / distKm : null;
    const allureKeSec = dureeMs ? (dureeMs / 1000) / ke : null;
    const penteAvg   = distTotale > 0 ? (dPlus / distTotale) * 100 : 0;
    const gapSec     = allureSec ? allureSec / facteurGAP(penteAvg) : null;

    // Profil d'élévation réduit à max 300 points pour le SVG
    const profilReduit = _reduirePoints(elevations, distCumulees, 300);

    return {
        nomFichier: '',
        distKm:     Math.round(distKm * 100) / 100,
        dPlus:      Math.round(dPlus),
        dMoins:     Math.round(dMoins),
        ke:         Math.round(ke * 100) / 100,
        penteAvg:   Math.round(penteAvg * 10) / 10,
        eleMin:     elevations.length ? Math.round(Math.min(...elevations)) : null,
        eleMax:     elevations.length ? Math.round(Math.max(...elevations)) : null,
        dureeMs,
        allureSec,
        allureKeSec,
        gapSec,
        profil:     profilReduit,
        nbPoints:   points.length,
    };
}

/** Réduit un tableau de points à N max en prenant 1 sur k */
function _reduirePoints(elevations, distCumulees, maxPts) {
    if (elevations.length <= maxPts) {
        return elevations.map((e, i) => ({ d: distCumulees[i] || 0, e }));
    }
    const step = Math.ceil(elevations.length / maxPts);
    return elevations
        .filter((_, i) => i % step === 0)
        .map((e, i) => ({ d: distCumulees[i * step] || 0, e }));
}

/** Gestionnaire de drop / sélection de fichier */
function gpxHandleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.gpx')) {
        document.getElementById('gpx-error').textContent = 'Veuillez sélectionner un fichier .gpx';
        document.getElementById('gpx-error').style.display = 'block';
        return;
    }
    document.getElementById('gpx-error').style.display = 'none';
    document.getElementById('gpx-loading').style.display = 'block';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = parseGPX(e.target.result);
            data.nomFichier = file.name;
            const existing = gpxListe.findIndex(t => t.nomFichier === file.name);
            if (existing >= 0) {
                gpxListe[existing] = data;
            } else {
                gpxListe.push(data);
            }
            gpxData = data;
            _sauvegarderGPX();
            _rendreListe();
            _afficherResultatGPX(gpxData);
        } catch (err) {
            document.getElementById('gpx-error').textContent = err.message;
            document.getElementById('gpx-error').style.display = 'block';
        } finally {
            document.getElementById('gpx-loading').style.display = 'none';
        }
    };
    reader.readAsText(file);
}

function _rendreListe() {
    const el = document.getElementById('gpx-liste');
    if (!el) return;
    if (gpxListe.length === 0) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = 'flex';
    el.innerHTML = gpxListe.map((t, i) => {
        const actif = t === gpxData;
        const nom   = t.nomFichier.replace(/\.gpx$/i, '');
        return `<span class="gpx-trace-card${actif ? ' active' : ''}" data-action="gpx-select" data-idx="${i}">
            <span class="gpx-trace-nom">📍 ${nom}</span>
            <span class="gpx-trace-stats">${t.distKm.toFixed(1)} km · D+${t.dPlus} m</span>
            <span class="gpx-trace-suppr" data-action="gpx-rename" data-idx="${i}" title="Renommer"><i class="bi bi-pencil" style="font-size:0.75rem;pointer-events:none"></i></span>
            <span class="gpx-trace-suppr" data-action="gpx-suppr" data-idx="${i}" title="Supprimer">×</span>
        </span>`;
    }).join('');
}

function gpxSelectTrace(idx) {
    if (idx < 0 || idx >= gpxListe.length) return;
    gpxData = gpxListe[idx];
    _rendreListe();
    _afficherResultatGPX(gpxData);
}

function gpxRenommerTrace(idx) {
    if (idx < 0 || idx >= gpxListe.length) return;
    // Trouver le span du nom dans la liste
    const cards = document.querySelectorAll('#gpx-liste .gpx-trace-card');
    const card = cards[idx];
    if (!card) return;
    const nomSpan = card.querySelector('.gpx-trace-nom');
    if (!nomSpan) return;

    const nomActuel = gpxListe[idx].nomFichier.replace(/\.gpx$/i, '');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = nomActuel;
    input.style.cssText = 'border:none;background:transparent;outline:1px solid #e8500a;border-radius:4px;padding:1px 4px;font-size:0.82rem;width:' + Math.max(80, nomActuel.length * 8) + 'px;color:inherit;';

    // Empêcher le clic sur la carte pendant l'édition
    card.dataset.action = '';

    function confirmer() {
        const nouveau = input.value.trim();
        if (nouveau) gpxListe[idx].nomFichier = nouveau + '.gpx';
        _sauvegarderGPX();
        card.dataset.action = 'gpx-select';
        _rendreListe();
        if (gpxListe[idx] === gpxData) {
            document.getElementById('gpx-nom').textContent = gpxListe[idx].nomFichier;
        }
        _majBadgesGPX();
    }

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = nomActuel; input.blur(); }
    });
    input.addEventListener('blur', confirmer);

    nomSpan.textContent = '';
    nomSpan.prepend('📍 ');
    nomSpan.appendChild(input);
    input.focus();
    input.select();
}

function gpxSupprimerTrace(idx) {
    if (idx < 0 || idx >= gpxListe.length) return;
    const removed = gpxListe.splice(idx, 1)[0];
    if (gpxListe.length === 0) {
        gpxData = null;
        document.getElementById('gpx-result').style.display = 'none';
        Object.keys(_GPX_CHAMPS).forEach(c => {
            const el = document.getElementById('gpx-badge-' + c);
            if (el) el.innerHTML = '';
        });
    } else {
        if (gpxData === removed) {
            gpxData = gpxListe[Math.min(idx, gpxListe.length - 1)];
            _afficherResultatGPX(gpxData);
        }
        _majBadgesGPX();
    }
    _sauvegarderGPX();
    _rendreListe();
}

function _afficherResultatGPX(d) {
    // Statistiques
    document.getElementById('gpx-stat-dist').textContent    = d.distKm.toFixed(2) + ' km';
    document.getElementById('gpx-stat-dplus').textContent   = d.dPlus + ' m';
    document.getElementById('gpx-stat-dminus').textContent  = d.dMoins + ' m';
    document.getElementById('gpx-stat-ke').textContent      = d.ke.toFixed(2) + ' KE';
    document.getElementById('gpx-stat-elemin').textContent  = d.eleMin !== null ? d.eleMin + ' m' : '—';
    document.getElementById('gpx-stat-elemax').textContent  = d.eleMax !== null ? d.eleMax + ' m' : '—';
    document.getElementById('gpx-stat-pente').textContent   = d.penteAvg.toFixed(1) + ' %';
    document.getElementById('gpx-stat-pts').textContent     = d.nbPoints;

    if (d.dureeMs) {
        document.getElementById('gpx-stat-duree').textContent  = formatTemps(d.dureeMs / 1000);
        document.getElementById('gpx-stat-allure').textContent = formatAllure(d.allureSec) + '/km';
        document.getElementById('gpx-stat-gap').textContent    = formatAllure(d.gapSec) + '/km';
        document.getElementById('gpx-row-duree').style.display = '';
    } else {
        document.getElementById('gpx-row-duree').style.display = 'none';
    }

    document.getElementById('gpx-nom').textContent = d.nomFichier;

    // Profil d'élévation SVG
    if (d.profil.length > 1) {
        _dessinerProfil(d.profil);
        document.getElementById('gpx-profil-container').style.display = 'block';
    }

    document.getElementById('gpx-result').style.display = 'block';
    _majBadgesGPX();
}

// Mapping cible → champs à remplir
const _GPX_CHAMPS = {
    tc:    { dist: 'tc-distance',    dplus: 'tc-dplus',    dminus: 'tc-dminus'    },
    obj:   { dist: 'obj-distance',   dplus: 'obj-dplus',   dminus: 'obj-dminus'   },
    pred:  { dist: 'pred-dist'                                                     },
    hydra: { dist: 'hydra-distance', dplus: 'hydra-dplus', dminus: 'hydra-dminus' },
    nutri: { dist: 'nutri-distance'                                                },
    plan:  { dist: 'plan-distance',  dplus: 'plan-dplus',  dminus: 'plan-dminus'  },
    ke:    { dist: 'ke-distance',    dplus: 'ke-dplus',    dminus: 'ke-dminus'    },
};

function _majBadgesGPX() {
    Object.keys(_GPX_CHAMPS).forEach(cible => {
        const container = document.getElementById('gpx-badge-' + cible);
        if (!container) return;
        if (gpxListe.length === 0) { container.innerHTML = ''; return; }
        container.innerHTML = gpxListe.map((t, i) => {
            const nom   = t.nomFichier.replace(/\.gpx$/i, '');
            const label = '📍 ' + (nom.length > 14 ? nom.slice(0, 13) + '…' : nom);
            return `<span class="badge-gpx" data-action="gpx-badge" data-cible="${cible}" data-idx="${i}" title="${nom}">${label}</span>`;
        }).join('');
    });
}

function gpxAppliquerBadge(cible, idx) {
    const trace = (idx !== undefined && gpxListe[idx]) ? gpxListe[idx] : gpxData;
    if (!trace) return;
    const champs = _GPX_CHAMPS[cible];
    if (!champs) return;
    function set(id, val) {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.value = val;
    }
    set(champs.dist,   parseFloat(trace.distKm.toFixed(2)));
    if (champs.dplus)  set(champs.dplus,  trace.dPlus);
    if (champs.dminus) set(champs.dminus, trace.dMoins);
    // Mettre à jour la trace active et rafraîchir les badges
    gpxData = trace;
    _majBadgesGPX();
}

function _dessinerProfil(profil) {
    const W = 800, H = 196, PX = 40, PY = 16;
    const eles = profil.map(p => p.e);
    const dists = profil.map(p => p.d);
    const eMin = Math.min(...eles), eMax = Math.max(...eles);
    const dMax = dists[dists.length - 1];
    const eRange = eMax - eMin || 1;

    const sx = d  => PX + ((d  / dMax)     * (W - PX - 10));
    const sy = e  => PY + ((1 - (e - eMin) / eRange) * (H - PY - 38));

    const pts = profil.map(p => `${sx(p.d).toFixed(1)},${sy(p.e).toFixed(1)}`).join(' ');

    // Zone remplie sous la courbe
    const aireX1 = sx(dists[0]).toFixed(1);
    const aireXN = sx(dists[dists.length - 1]).toFixed(1);
    const aireY  = (H - 38).toFixed(1);
    const aire   = `${aireX1},${aireY} ${pts} ${aireXN},${aireY}`;

    // Axe Y : 4 graduations
    let axes = '';
    for (let i = 0; i <= 3; i++) {
        const e   = eMin + (eRange * i / 3);
        const y   = sy(e).toFixed(1);
        const lab = Math.round(e);
        axes += `<line x1="${PX}" y1="${y}" x2="${W - 10}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
        axes += `<text x="${PX - 4}" y="${parseFloat(y) + 4}" text-anchor="end" font-size="10" fill="#999">${lab}</text>`;
    }
    // Axe X : quelques km
    let axesX = '';
    const nbTicks = Math.min(8, Math.floor(dMax));
    for (let i = 0; i <= nbTicks; i++) {
        const d   = (dMax * i / nbTicks);
        const x   = sx(d).toFixed(1);
        axesX += `<text x="${x}" y="${H - 18}" text-anchor="middle" font-size="10" fill="#999">${d.toFixed(1)}</text>`;
    }

    const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;border-radius:8px;background:#f8f9fa;cursor:crosshair">
        ${axes}
        <polygon points="${aire}" fill="rgba(230,80,10,0.15)"/>
        <polyline points="${pts}" fill="none" stroke="#e8500a" stroke-width="2" stroke-linejoin="round"/>
        ${axesX}
        <text x="${PX - 2}" y="12" font-size="10" fill="#666">Alt. (m)</text>
        <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="10" fill="#666">Distance (km)</text>
        <g id="gpx-xhair" style="display:none" pointer-events="none">
            <line id="gpx-xhair-line" x1="0" y1="${PY}" x2="0" y2="${H - 38}" stroke="#555" stroke-width="1" stroke-dasharray="4,3"/>
            <circle id="gpx-xhair-dot" cx="0" cy="0" r="4" fill="#e8500a" stroke="white" stroke-width="1.5"/>
            <rect id="gpx-tt-bg" x="0" y="0" width="140" height="58" rx="5" fill="rgba(30,30,30,0.85)"/>
            <text id="gpx-tt-dist"  x="0" y="0" font-size="11" fill="white"></text>
            <text id="gpx-tt-alt"   x="0" y="0" font-size="11" fill="white"></text>
            <text id="gpx-tt-pente" x="0" y="0" font-size="11" fill="white"></text>
        </g>
        <rect id="gpx-overlay" x="${PX}" y="${PY}" width="${W - PX - 10}" height="${H - PY - 38}" fill="transparent"/>
    </svg>`;

    document.getElementById('gpx-profil-svg').innerHTML = svg;

    // --- Interactivité : crosshair + tooltip au survol ---
    const svgEl  = document.getElementById('gpx-profil-svg').querySelector('svg');
    const xhair  = document.getElementById('gpx-xhair');
    const xline  = document.getElementById('gpx-xhair-line');
    const xdot   = document.getElementById('gpx-xhair-dot');
    const ttBg   = document.getElementById('gpx-tt-bg');
    const ttDist = document.getElementById('gpx-tt-dist');
    const ttAlt  = document.getElementById('gpx-tt-alt');
    const ttPente= document.getElementById('gpx-tt-pente');

    function toSvgX(evt) {
        const pt = svgEl.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        return pt.matrixTransform(svgEl.getScreenCTM().inverse()).x;
    }

    document.getElementById('gpx-overlay').addEventListener('mousemove', evt => {
        const x = toSvgX(evt);
        const d = Math.max(0, Math.min(dMax, (x - PX) / (W - PX - 10) * dMax));

        // Point le plus proche dans profil
        let idx = 0, minDiff = Infinity;
        for (let i = 0; i < profil.length; i++) {
            const diff = Math.abs(profil[i].d - d);
            if (diff < minDiff) { minDiff = diff; idx = i; }
        }
        const p  = profil[idx];
        const px = sx(p.d);
        const py = sy(p.e);

        // Pente locale
        let pente = 0;
        if (idx > 0) {
            const dDist = (p.d - profil[idx - 1].d) * 1000;
            pente = dDist > 0 ? ((p.e - profil[idx - 1].e) / dDist) * 100 : 0;
        }

        xline.setAttribute('x1', px); xline.setAttribute('x2', px);
        xdot.setAttribute('cx', px);  xdot.setAttribute('cy', py);

        // Tooltip : éviter de sortir à droite
        const ttW = 140, ttH = 58;
        const ttX = px + 12 + ttW > W - 10 ? px - ttW - 12 : px + 12;
        const ttY = PY + 4;

        ttBg.setAttribute('x', ttX);   ttBg.setAttribute('y', ttY);
        ttBg.setAttribute('width', ttW); ttBg.setAttribute('height', ttH);

        [[ttDist, 17], [ttAlt, 33], [ttPente, 49]].forEach(([el, dy]) => {
            el.setAttribute('x', ttX + 8);
            el.setAttribute('y', ttY + dy);
        });

        const sign = pente >= 0 ? '+' : '';
        ttDist.textContent  = `Distance : ${p.d.toFixed(2)} km`;
        ttAlt.textContent   = `Altitude : ${Math.round(p.e)} m`;
        ttPente.textContent = `Pente : ${sign}${pente.toFixed(1)} %`;

        xhair.style.display = '';
    });

    document.getElementById('gpx-overlay').addEventListener('mouseleave', () => {
        xhair.style.display = 'none';
    });
}

/** Remplit les champs d'un onglet cible avec les données GPX */
function gpxUtiliserDans(cible) {
    if (!gpxData) return;
    const { distKm, dPlus, dMoins, allureSec } = gpxData;

    function set(id, val) {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.value = val;
    }

    if (cible === 'temps-course') {
        set('tc-distance', distKm);
        set('tc-dplus',  dPlus);
        set('tc-dminus', dMoins);
        if (allureSec) { set('tc-min', Math.floor(allureSec / 60)); set('tc-sec', Math.round(allureSec % 60)); }
        showTab('tab-temps-course');
    }
    if (cible === 'ke') {
        set('ke-distance', distKm);
        set('ke-dplus',  dPlus);
        set('ke-dminus', dMoins);
        showTab('tab-km-effort');
    }
    if (cible === 'gap') {
        if (allureSec) { set('gap-allure-min2', Math.floor(allureSec / 60)); set('gap-allure-sec2', Math.round(allureSec % 60)); }
        set('gap-dist',   distKm);
        set('gap-dplus2', dPlus);
        showTab('tab-gap');
    }
    if (cible === 'hydratation') {
        set('hydra-distance', distKm);
        set('hydra-dplus',  dPlus);
        set('hydra-dminus', dMoins);
        if (allureSec) { set('hydra-min', Math.floor(allureSec / 60)); set('hydra-sec', Math.round(allureSec % 60)); }
        showTab('tab-hydratation');
    }
    if (cible === 'plan') {
        set('plan-distance', distKm);
        set('plan-dplus',  dPlus);
        set('plan-dminus', dMoins);
        if (allureSec) { set('plan-allure-min', Math.floor(allureSec / 60)); set('plan-allure-sec', Math.round(allureSec % 60)); }
        showTab('tab-plan-course');
    }
}
