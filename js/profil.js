// =====================
// PROFIL COUREUR
// =====================

const PROFIL_KEY = 'ru_profil';

/** Retourne le profil stocké, ou un objet vide. */
function chargerProfil() {
    try {
        return JSON.parse(localStorage.getItem(PROFIL_KEY)) || {};
    } catch (_) {
        return {};
    }
}

/** Sauvegarde et prérempli les champs dépendants. */
function sauvegarderProfil() {
    const profil = {
        prenom:        document.getElementById('profil-prenom').value.trim(),
        poids:         document.getElementById('profil-poids').value,
        age:           document.getElementById('profil-age').value,
        sexe:          document.getElementById('profil-sexe').value,
        fcmax:         document.getElementById('profil-fcmax').value,
        fcrepos:       document.getElementById('profil-fcrepos').value,
        transpiration: document.getElementById('profil-transpiration').value,
    };
    localStorage.setItem(PROFIL_KEY, JSON.stringify(profil));
    appliquerProfil(profil);

    // Retour visuel sur le bouton
    const btn = document.getElementById('btn-sauvegarder-profil');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check me-2"></i>Enregistré !';
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
}

/** Réinitialise le profil. */
function reinitialiserProfil() {
    if (!confirm('Supprimer le profil enregistré ?')) return;
    localStorage.removeItem(PROFIL_KEY);
    ['profil-prenom','profil-poids','profil-age','profil-fcmax','profil-fcrepos'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('profil-sexe').value = 'homme';
    document.getElementById('profil-transpiration').value = 'normale';
    document.getElementById('profil-avatar').textContent = '🏃';
    document.getElementById('profil-nom-affichage').textContent = 'Mon profil';
}

/**
 * Remplit les champs de chaque onglet avec les données du profil.
 * N'écrase pas les champs déjà renseignés manuellement.
 */
function appliquerProfil(profil) {
    function remplir(id, val) {
        const el = document.getElementById(id);
        if (el && val !== '' && val !== undefined) el.value = val;
    }
    function remplirSelect(id, val) {
        const el = document.getElementById(id);
        if (el && val !== '' && val !== undefined) el.value = val;
    }

    // Poids
    remplir('hydra-poids',  profil.poids);
    remplir('nutri-poids',  profil.poids);
    remplir('plan-poids',   profil.poids);

    // Sexe
    remplirSelect('nutri-sexe', profil.sexe);

    // FC
    remplir('fc-age',   profil.age);
    remplir('fc-max',   profil.fcmax);
    remplir('fc-repos', profil.fcrepos);

    // Transpiration (hydratation + plan de course)
    remplirSelect('hydra-transpiration', profil.transpiration);
    remplirSelect('plan-transpiration',  profil.transpiration);

    // Badge avatar dans la sidebar
    const avatar = document.getElementById('profil-avatar');
    const nomAff = document.getElementById('profil-nom-affichage');
    if (avatar) avatar.textContent = profil.sexe === 'femme' ? '🏃‍♀️' : '🏃';
    if (nomAff) nomAff.textContent = profil.prenom || 'Mon profil';
}

/** Remplit le formulaire profil depuis le localStorage. */
function afficherProfil() {
    const profil = chargerProfil();

    function val(id, v) {
        const el = document.getElementById(id);
        if (el && v !== undefined) el.value = v;
    }

    val('profil-prenom',  profil.prenom);
    val('profil-poids',   profil.poids);
    val('profil-age',     profil.age);
    val('profil-fcmax',   profil.fcmax);
    val('profil-fcrepos', profil.fcrepos);
    if (profil.sexe)         document.getElementById('profil-sexe').value = profil.sexe;
    if (profil.transpiration) document.getElementById('profil-transpiration').value = profil.transpiration;

    appliquerProfil(profil);
}
