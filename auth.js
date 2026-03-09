// ============================================================
// GeoVilles Explorer — Authentification LocalStorage
// ============================================================

var isLoginMode = true;

var form = document.getElementById('login-form');
var emailInput = document.getElementById('email');
var passInput = document.getElementById('password');
var btnSubmit = document.getElementById('btn-submit');
var toggleLink = document.getElementById('toggle-link');
var toggleMode = document.getElementById('toggle-mode');
var alertError = document.getElementById('alert-error');
var alertSuccess = document.getElementById('alert-success');

// ─── VÉRIFICATION : si déjà connecté → rediriger ──────────
if (localStorage.getItem('gv_session')) {
    window.location.replace('index.html');
}

// ─── BASCULER LOGIN / INSCRIPTION ─────────────────────────
function setupToggle() {
    var tl = document.getElementById('toggle-link');
    if (tl) {
        tl.addEventListener('click', function () {
            isLoginMode = !isLoginMode;
            hideAlerts();

            if (isLoginMode) {
                btnSubmit.textContent = 'Se connecter';
                toggleMode.innerHTML = 'Pas encore de compte ? <a id="toggle-link" style="cursor:pointer;color:var(--accent);font-weight:500;">Créer un compte</a>';
            } else {
                btnSubmit.textContent = 'Créer un compte';
                toggleMode.innerHTML = 'Déjà un compte ? <a id="toggle-link" style="cursor:pointer;color:var(--accent);font-weight:500;">Se connecter</a>';
            }
            setupToggle(); // Rebind
        });
    }
}
setupToggle();

// ─── SOUMISSION DU FORMULAIRE ─────────────────────────────
form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAlerts();

    var email = emailInput.value.trim();
    var password = passInput.value;

    if (!email || !password) {
        showError('Veuillez remplir tous les champs.');
        return;
    }

    if (password.length < 6) {
        showError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Chargement…';

    setTimeout(function () {
        var rawUsers = localStorage.getItem('gv_users');
        var users = rawUsers ? JSON.parse(rawUsers) : [];

        if (isLoginMode) {
            // Se connecter
            var found = users.find(function (u) { return u.email === email && u.password === btoa(password); });
            if (found) {
                localStorage.setItem('gv_session', JSON.stringify({ email: found.email, name: email.split('@')[0] }));
                showSuccess('Connexion réussie ! Redirection…');
                setTimeout(function () {
                    window.location.replace('index.html');
                }, 800);
            } else {
                showError('Email ou mot de passe incorrect.');
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Se connecter';
            }
        } else {
            // Créer un compte
            var exists = users.find(function (u) { return u.email === email; });
            if (exists) {
                showError('Un compte existe déjà avec cet email.');
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Créer un compte';
            } else {
                users.push({ email: email, password: btoa(password) });
                localStorage.setItem('gv_users', JSON.stringify(users));
                localStorage.setItem('gv_session', JSON.stringify({ email: email, name: email.split('@')[0] }));

                showSuccess('Compte créé et connecté ! Redirection…');
                setTimeout(function () {
                    window.location.replace('index.html');
                }, 800);
            }
        }
    }, 400);
});

// ─── UTILITAIRES ───────────────────────────────────────────
function showError(msg) {
    alertError.textContent = msg;
    alertError.classList.add('show');
    alertSuccess.classList.remove('show');
}
function showSuccess(msg) {
    alertSuccess.textContent = msg;
    alertSuccess.classList.add('show');
    alertError.classList.remove('show');
}
function hideAlerts() {
    alertError.classList.remove('show');
    alertSuccess.classList.remove('show');
}
