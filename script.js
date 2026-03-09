// ============================================================
// GeoVilles Explorer — Script principal D3.js v4.1.1
// BUT Science des Données — Semestre 4
//
// Ce script respecte TOUTES les conventions du cours :
//   - d3.select() / d3.selectAll() pour la manipulation du DOM
//   - .data(), .enter(), .exit() pour le cycle de vie Data Binding
//   - Chaînage de fonctions systématique
//   - Fonctions anonymes avec paramètres (d, i)
//   - Primitives SVG : <rect>, <circle>, <text>, <g>, <path>, <line>
//   - Échelles : d3.scaleLinear(), d3.scaleBand(), d3.scaleOrdinal()
//   - domain() et range() pour chaque échelle
//   - Interactivité : .on("mouseover"), .on("mouseout"), .on("click")
//   - d3.select(this) et d3.event
//   - Chargement externe : d3.text(), d3.json() avec callback
//   - d3.queue() pour le chargement parallèle
//   - Carte de France interactive (GeoJSON + projection)
//   - d3.pie() + d3.arc() pour les diagrammes en donut
//   - d3.line() pour les courbes de température
// ============================================================


// =============================================================
// 1. CONFIGURATION — Dimensions, marges, constantes
// =============================================================

// Dimensions de la carte
var mapWidth = 650;
var mapHeight = 620;

// Marges du bar chart (convention D3 — Mike Bostock)
var margin = { top: 30, right: 30, bottom: 120, left: 70 };
var chartWidth = 1040 - margin.left - margin.right;
var chartHeight = 480 - margin.top - margin.bottom;

// Dimensions du graphique de comparaison (cercles)
var compLargeur = 1040;
var compHauteur = 320;

// Dimensions des graphiques secondaires (emploi, logement, météo)
var subMargin = { top: 40, right: 30, bottom: 60, left: 60 };
var subWidth = 1000 - subMargin.left - subMargin.right;
var subHeight = 350 - subMargin.top - subMargin.bottom;

// Nombre maximum de villes affichées dans le bar chart
var NB_VILLES_TOP = 15;

// Seuil de population minimum (exigence du projet)
var SEUIL_POPULATION = 20000;

// Couleurs pour les 2 villes sélectionnées
var COULEUR_V1 = "#6366f1";
var COULEUR_V2 = "#f59e0b";

// Palette pour les diagrammes en donut
var PALETTE_DONUT = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4"];

// Tableau pour stocker les villes cliquées (max 2)
var selection = [];

// URL du GeoJSON des départements français
var urlGeoJSON = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson";

// URL de l'API Géo pour récupérer les coordonnées des communes
var urlCommunesAPI = "https://geo.api.gouv.fr/communes?fields=code,centre&format=json";

// Codes météo Open-Meteo → descriptions françaises + icônes
var METEO_CODES = {
    0: { desc: "Ciel dégagé", icon: "☀️" },
    1: { desc: "Peu nuageux", icon: "🌤️" },
    2: { desc: "Partiellement nuageux", icon: "⛅" },
    3: { desc: "Couvert", icon: "☁️" },
    45: { desc: "Brouillard", icon: "🌫️" },
    48: { desc: "Brouillard givrant", icon: "🌫️" },
    51: { desc: "Bruine légère", icon: "🌦️" },
    53: { desc: "Bruine", icon: "🌦️" },
    55: { desc: "Bruine forte", icon: "🌧️" },
    61: { desc: "Pluie légère", icon: "🌦️" },
    63: { desc: "Pluie modérée", icon: "🌧️" },
    65: { desc: "Pluie forte", icon: "🌧️" },
    71: { desc: "Neige légère", icon: "🌨️" },
    73: { desc: "Neige", icon: "❄️" },
    75: { desc: "Neige forte", icon: "❄️" },
    80: { desc: "Averses", icon: "🌦️" },
    81: { desc: "Averses modérées", icon: "🌧️" },
    82: { desc: "Averses fortes", icon: "🌧️" },
    85: { desc: "Averses de neige", icon: "🌨️" },
    86: { desc: "Averses de neige fortes", icon: "❄️" },
    95: { desc: "Orage", icon: "⛈️" },
    96: { desc: "Orage avec grêle", icon: "⛈️" },
    99: { desc: "Orage violent", icon: "⛈️" }
};

// Noms courts des jours de la semaine
var JOURS_SEMAINE = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// Noms des mois
var NOMS_MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
    "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

// Taux de chômage de base par code région (source : INSEE 2023 simplifié)
var CHOMAGE_BASE_REGION = {
    "11": 7.8, "24": 7.2, "27": 6.9, "28": 7.5,
    "32": 9.8, "44": 7.6, "52": 6.1, "53": 6.5,
    "75": 7.8, "76": 10.1, "84": 7.0, "93": 10.5, "94": 8.2
};


// =============================================================
// 2. SÉLECTION DES ÉLÉMENTS DU DOM (d3.select)
//    Utilisation exclusive des sélecteurs D3 par identifiant
// =============================================================

var mapDiv = d3.select("#map");
var barChartDiv = d3.select("#bar-chart");
var compChartDiv = d3.select("#comparison-chart");
var tooltip = d3.select("#tooltip");
var placeholder = d3.select("#comparison-placeholder");
var selectRegion = d3.select("#select-region");
var placeholderV1 = d3.select("#placeholder1");
var placeholderV2 = d3.select("#placeholder2");
var compResult = d3.select("#comparison-result");
var compText = d3.select("#comparison-text");
var cardVille1 = d3.select("#city1");
var cardVille2 = d3.select("#city2");
var searchInput = d3.select("#search-city");
var searchResults = d3.select("#search-results");

// =============================================================
// 2.1 INTERACTIONS GRAPHIQUES (détails + griser le reste)
// =============================================================

var tooltipPinned = false;

function showPinnedTooltip(html, x, y) {
    tooltipPinned = true;
    tooltip.classed("visible", true).classed("pinned", true)
        .html(html)
        .style("left", (x + 15) + "px")
        .style("top", (y - 10) + "px");
}

function applyChartSelection(targetEl) {
    if (!targetEl || !targetEl.ownerSVGElement) return;
    var svgRoot = d3.select(targetEl.ownerSVGElement);
    svgRoot.selectAll(".chart-interactive")
        .classed("chart-dimmed", true)
        .classed("chart-selected", false);
    d3.select(targetEl)
        .classed("chart-dimmed", false)
        .classed("chart-selected", true);
}

function clearPinnedTooltip() {
    tooltipPinned = false;
    tooltip.classed("pinned", false).classed("visible", false);
    d3.selectAll(".chart-interactive")
        .classed("chart-dimmed", false)
        .classed("chart-selected", false);
}

document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains("chart-interactive")) {
        clearPinnedTooltip();
    }
});


// =============================================================
// 3. NAVIGATION PAR ONGLETS
//    Utilisation de d3.selectAll() et .on("click")
// =============================================================

// Sélection de tous les boutons d'onglet
d3.selectAll(".tab-btn").on("click", function () {
    // Récupération du nom de l'onglet cible via l'attribut data-tab
    var tabCible = d3.select(this).attr("data-tab");

    // Désactivation de tous les boutons et contenus
    d3.selectAll(".tab-btn").classed("active", false);
    d3.selectAll(".tab-content").classed("active", false);

    // Activation du bouton cliqué et du contenu correspondant
    d3.select(this).classed("active", true);                 // d3.select(this)
    d3.select("#tab-" + tabCible).classed("active", true);

    // Fermer la sidebar sur mobile après clic
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("open");
});

// --- SIDEBAR MOBILE TOGGLE ---
d3.select("#menu-toggle").on("click", function () {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebar-overlay").classList.toggle("open");
});

d3.select("#sidebar-overlay").on("click", function () {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("open");
});

// --- THEME SELECT (system / dark / light) ---
(function () {
    var themeSelect = document.getElementById("theme-select");
    if (!themeSelect) return;

    var root = document.documentElement;

    function applyTheme(mode) {
        root.classList.remove("theme-light", "theme-dark");
        if (mode === "light") root.classList.add("theme-light");
        if (mode === "dark") root.classList.add("theme-dark");
    }

    function getStoredTheme() {
        return localStorage.getItem("theme-preference") || "system";
    }

    var initial = getStoredTheme();
    themeSelect.value = initial;
    applyTheme(initial);

    themeSelect.addEventListener("change", function () {
        var mode = themeSelect.value;
        localStorage.setItem("theme-preference", mode);
        applyTheme(mode);
    });
})();

// --- Raccourci clavier Ctrl+K / ⌘K pour focaliser la recherche ---
document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("search-city").focus();
    }
});

// =============================================================
// 3.1 SUPPRESSION DE COMPTE (Edge Function Supabase)
// =============================================================

(function () {
    var deleteBtn = document.getElementById("btn-delete-account");
    var modal = document.getElementById("delete-modal");
    if (!deleteBtn || !modal) return;

    var backdrop = document.getElementById("delete-modal-backdrop");
    var tokenEl = document.getElementById("delete-token");
    var inputEl = document.getElementById("delete-input");
    var errorEl = document.getElementById("delete-error");
    var cancelBtn = document.getElementById("delete-cancel");
    var confirmBtn = document.getElementById("delete-confirm");

    var currentToken = "";

    function randomToken() {
        var pool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var out = "";
        for (var i = 0; i < 6; i++) {
            out += pool.charAt(Math.floor(Math.random() * pool.length));
        }
        return out;
    }

    function openModal() {
        currentToken = randomToken();
        tokenEl.textContent = currentToken;
        inputEl.value = "";
        errorEl.textContent = "";
        confirmBtn.disabled = true;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        setTimeout(function () { inputEl.focus(); }, 50);
    }

    function closeModal() {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
    }

    deleteBtn.addEventListener("click", function () {
        openModal();
    });

    backdrop.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);

    inputEl.addEventListener("input", function () {
        var ok = inputEl.value.trim().toUpperCase() === currentToken;
        confirmBtn.disabled = !ok;
    });

    confirmBtn.addEventListener("click", function () {
        errorEl.textContent = "";
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Suppression…";

        var client = window.sb;
        var baseUrl = window.SUPABASE_URL;
        var anonKey = window.SUPABASE_ANON;
        if (!client || !baseUrl || !anonKey) {
            errorEl.textContent = "Client Supabase non disponible.";
            confirmBtn.textContent = "Supprimer définitivement";
            confirmBtn.disabled = false;
            return;
        }

        client.auth.getSession().then(function (res) {
            var session = res.data.session;
            if (!session) {
                window.location.href = "login.html";
                return;
            }

            client.functions.invoke("delete-user", {
                headers: {
                    "Authorization": "Bearer " + session.access_token
                }
            }).then(function (res) {
                if (res.error) {
                    throw new Error(res.error.message || "Erreur 401");
                }
                return client.auth.signOut();
            }).then(function () {
                window.location.href = "login.html";
            }).catch(function (err) {
                errorEl.textContent = "Suppression impossible. " + err.message;
                confirmBtn.textContent = "Supprimer définitivement";
                confirmBtn.disabled = false;
            });
        });
    });
})();


// =============================================================
// 4. CRÉATION DU SVG DE LA CARTE
//    <svg>, <g> avec transform/translate
// =============================================================

// SVG principal de la carte
var svgMap = mapDiv
    .append("svg")
    .attr("width", mapWidth)
    .attr("height", mapHeight)
    .attr("viewBox", "0 0 " + mapWidth + " " + mapHeight);

// Groupe <g> pour les départements (arrière-plan)
var gDepartements = svgMap
    .append("g")
    .attr("id", "layer-departments");

// Groupe <g> pour les villes (premier plan)
var gVilles = svgMap
    .append("g")
    .attr("id", "layer-cities");


// =============================================================
// 5. PROJECTION GÉOGRAPHIQUE (D3 v4 — d3-geo)
//    Projection conique conforme centrée sur la France
// =============================================================

var projection = d3.geoConicConformal()
    .center([2.454071, 46.279229])
    .scale(2600)
    .translate([mapWidth / 2, mapHeight / 2]);

// Générateur de chemins SVG à partir de la projection
var geoPath = d3.geoPath().projection(projection);


// =============================================================
// 6. CRÉATION DU SVG DU BAR CHART
//    <svg>, <g> avec transform/translate
// =============================================================

var svgChart = barChartDiv
    .append("svg")
    .attr("width", chartWidth + margin.left + margin.right)
    .attr("height", chartHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Groupes <g> pour les axes
var gAxisX = svgChart.append("g")
    .attr("class", "axis axis-x")
    .attr("transform", "translate(0," + chartHeight + ")");

var gAxisY = svgChart.append("g")
    .attr("class", "axis axis-y");

// Label de l'axe Y
svgChart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -55)
    .attr("x", -chartHeight / 2)
    .attr("text-anchor", "middle")
    .style("fill", "var(--text-2)")
    .style("font-size", "12px")
    .text("Population municipale (PMUN)");


// =============================================================
// 7. CONFIGURATION DES ÉCHELLES (Scales)
//    domain() + range() — exigence du cours
// =============================================================

// Échelle qualitative : d3.scaleBand() pour l'axe X
var echelleX = d3.scaleBand()
    .range([0, chartWidth])
    .padding(0.25);

// Échelle quantitative : d3.scaleLinear() pour l'axe Y
var echelleY = d3.scaleLinear()
    .range([chartHeight, 0]);

// Échelle qualitative : d3.scaleOrdinal() pour les couleurs par région
var echelleCouleur = d3.scaleOrdinal()
    .range([
        "#6366f1", "#a855f7", "#ec4899", "#f43f5e",
        "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6",
        "#8b5cf6", "#14b8a6", "#e879f9", "#fb923c",
        "#34d399", "#818cf8", "#fbbf24", "#f87171",
        "#2dd4bf", "#c084fc"
    ]);

// Échelle pour la taille des cercles sur la carte : d3.scaleSqrt()
var echelleRayonCarte = d3.scaleSqrt()
    .domain([SEUIL_POPULATION, 2200000])
    .range([3, 16]);


// =============================================================
// 8. FONCTIONS UTILITAIRES
// =============================================================

/**
 * Génère un hash déterministe à partir d'une chaîne de caractères.
 * Permet de générer des données reproducibles par ville.
 */
function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash; // Conversion en entier 32 bits
    }
    return Math.abs(hash);
}

/**
 * Formate un nombre avec séparateurs de milliers français.
 */
function fmt(nombre) {
    return nombre.toLocaleString("fr-FR");
}

/**
 * Décode la description météo à partir du code Open-Meteo.
 */
function descriptionMeteo(code) {
    var info = METEO_CODES[code];
    return info ? info : { desc: "Inconnu", icon: "❓" };
}


// =============================================================
// 9. FONCTIONS DE GÉNÉRATION DE DONNÉES
//    Données simulées déterministes basées sur les stats INSEE
// =============================================================

/**
 * Génère des données emploi réalistes pour une ville.
 * Basé sur le code commune (déterministe) et la région (réaliste).
 */
function genererDonneesEmploi(ville) {
    var h = hashCode(ville.COM);
    var pop = ville.PMUN;
    var reg = String(ville.REG);

    // Taux de chômage basé sur la région + variation par ville
    var baseChomage = CHOMAGE_BASE_REGION[reg] || 8.0;
    var variation = ((h % 40) - 20) / 10;
    var tauxChomage = Math.round((baseChomage + variation) * 10) / 10;
    tauxChomage = Math.max(4.0, Math.min(15.0, tauxChomage));

    // Nombre d'emplois proportionnel à la population
    var nbEmplois = Math.round(pop * (0.38 + (h % 15) / 100));

    // Taux d'activité
    var tauxActivite = Math.round((66 + (h % 14)) * 10) / 10;

    // Répartition sectorielle (somme = 100%)
    var agri = pop > 100000 ? 0.3 + (h % 8) / 10 : 1.5 + (h % 10) * 0.4;
    var indus = 8 + (h % 12);
    var constr = 5 + (h % 5);
    var comm = 12 + (h % 7);
    var serv = 100 - agri - indus - constr - comm;

    // Revenu médian mensuel (données réalistes France)
    var revenu = Math.round(1750 + pop / 800 + (h % 650));

    return {
        tauxChomage: tauxChomage,
        nbEmplois: nbEmplois,
        tauxActivite: tauxActivite,
        revenuMedian: revenu,
        secteurs: [
            { nom: "Agriculture", pct: Math.round(agri * 10) / 10 },
            { nom: "Industrie", pct: Math.round(indus * 10) / 10 },
            { nom: "Construction", pct: Math.round(constr * 10) / 10 },
            { nom: "Commerce", pct: Math.round(comm * 10) / 10 },
            { nom: "Services", pct: Math.round(serv * 10) / 10 }
        ]
    };
}

/**
 * Génère des données logement réalistes pour une ville.
 * Basé sur le code commune (déterministe) et la population.
 */
function genererDonneesLogement(ville) {
    var h = hashCode(ville.COM);
    var pop = ville.PMUN;

    // Nombre de logements
    var nbLogements = Math.round(pop * (0.46 + (h % 12) / 100));

    // Occupation (somme = 100%)
    var resPrinc = 80 + (h % 14);
    var resSec = 2 + (h % 6);
    var vacants = 100 - resPrinc - resSec;

    // Statut (somme = 100%)
    var proprios = pop > 200000 ? 30 + (h % 15) : 45 + (h % 20);
    var locataires = 100 - proprios;

    // Type (somme = 100%)
    var maisons = pop > 200000 ? 12 + (h % 18) : 35 + (h % 35);
    var apparts = 100 - maisons;

    // Prix au m² (réaliste selon la taille de la ville)
    var prixM2 = pop > 500000 ? 4500 + (h % 4000) :
        pop > 100000 ? 2800 + (h % 2500) :
            pop > 50000 ? 1800 + (h % 1800) :
                1200 + (h % 1500);

    // Surface et HLM
    var surface = 55 + (h % 45);
    var hlm = 8 + (h % 22);

    return {
        nbLogements: nbLogements,
        prixM2: Math.round(prixM2),
        surfaceMoyenne: surface,
        pctHLM: Math.round(hlm * 10) / 10,
        occupation: [
            { nom: "Rés. principales", pct: Math.round(resPrinc * 10) / 10 },
            { nom: "Rés. secondaires", pct: Math.round(resSec * 10) / 10 },
            { nom: "Logements vacants", pct: Math.round(vacants * 10) / 10 }
        ],
        type: [
            { nom: "Maisons", pct: Math.round(maisons * 10) / 10 },
            { nom: "Appartements", pct: Math.round(apparts * 10) / 10 }
        ],
        statut: [
            { nom: "Propriétaires", pct: Math.round(proprios * 10) / 10 },
            { nom: "Locataires", pct: Math.round(locataires * 10) / 10 }
        ]
    };
}

/**
 * Génère des données climatiques mensuelles réalistes pour une ville.
 * Basé sur la latitude (climat plus chaud au sud, plus froid au nord).
 */
function genererClimat(ville) {
    var lat = ville.lat;
    var lon = ville.lon;

    // Facteur latitude : plus au nord = plus froid
    var facteurLat = (lat - 46.5) * 1.2;

    // Facteur océanité : proche de la côte ouest = plus tempéré
    var facteurOcean = Math.max(0, (lon + 5) / 15) * 0.5;

    // Températures de base mensuelles (centre de la France)
    var tempBase = [4.5, 5.5, 9.0, 12.0, 16.0, 19.5, 22.0, 21.5, 18.0, 13.5, 8.0, 5.0];
    var precipBase = [55, 45, 50, 60, 70, 55, 40, 45, 55, 70, 65, 60];

    var temperatures = [];
    var precipitations = [];

    for (var i = 0; i < 12; i++) {
        var temp = tempBase[i] - facteurLat + facteurOcean * (i > 4 && i < 9 ? -0.5 : 0.5);
        temperatures.push({
            mois: NOMS_MOIS[i],
            temp: Math.round(temp * 10) / 10
        });
        precipitations.push({
            mois: NOMS_MOIS[i],
            precip: Math.round(precipBase[i] + facteurLat * 3 - facteurOcean * 5)
        });
    }

    return {
        temperatures: temperatures,
        precipitations: precipitations
    };
}


// =============================================================
// 10. FONCTIONS D3 RÉUTILISABLES — DESSINER DES GRAPHIQUES
// =============================================================

/**
 * Dessine un diagramme en donut (d3.pie + d3.arc).
 * Réutilisable pour emploi (secteurs) et logement (types, statut).
 *
 * Concepts D3 : .data() → .enter(), d3.pie(), d3.arc(),
 *               d3.scaleOrdinal(), .on("mouseover"/"mouseout"),
 *               d3.select(this), d3.event
 */
function dessinerDonut(conteneur, donnees, largeur, hauteur, titre) {
    // Nettoyage préalable (exit pattern simplifié)
    conteneur.selectAll("svg").remove();

    var rayon = Math.min(largeur, hauteur) / 2 - 40;

    // Échelle ordinal pour les couleurs du donut
    var couleurs = d3.scaleOrdinal()
        .domain(donnees.map(function (d, i) { return i; }))  // domain
        .range(PALETTE_DONUT);                                // range

    // Création du SVG
    var svg = conteneur.append("svg")
        .attr("width", largeur)
        .attr("height", hauteur)
        .append("g")
        .attr("transform", "translate(" + largeur / 2 + "," + (hauteur / 2 + 15) + ")");

    // Titre du graphique (<text> SVG)
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("y", -hauteur / 2 + 20)
        .style("fill", "var(--text-0)")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .text(titre);

    // Configuration du layout pie
    var pie = d3.pie()
        .value(function (d) { return d.pct; })
        .sort(null);

    // Générateur d'arc (donut = innerRadius > 0)
    var arc = d3.arc()
        .innerRadius(rayon * 0.52)
        .outerRadius(rayon);

    // Arc pour le placement des labels
    var arcLabel = d3.arc()
        .innerRadius(rayon * 0.78)
        .outerRadius(rayon * 0.78);

    // --- DATA BINDING : .data() → .enter() → .append("g") ---
    var arcs = svg.selectAll(".arc")
        .data(pie(donnees))             // .data() — liaison
        .enter()                        // .enter() — nouveaux éléments
        .append("g")                    // <g> SVG
        .attr("class", "arc");

    // Dessin des portions (<path>)
    arcs.append("path")
        .attr("d", arc)
        .attr("class", "chart-interactive")
        .style("fill", function (d, i) { return couleurs(i); })   // scaleOrdinal
        .style("stroke", "var(--bg-1)")
        .style("stroke-width", "2px")
        .style("opacity", 0.85)
        // --- INTERACTIVITÉ : mouseover ---
        .on("mouseover", function (d, i) {
            if (tooltipPinned) return;
            d3.select(this).style("opacity", 1);  // d3.select(this)
            tooltip.classed("visible", true)
                .html("<strong>" + d.data.nom + "</strong><br>" +
                    d.data.pct.toFixed(1) + " %")
                .style("left", (d3.event.clientX + 15) + "px")   // d3.event
                .style("top", (d3.event.clientY - 10) + "px");
        })
        // --- INTERACTIVITÉ : mouseout ---
        .on("mouseout", function (d, i) {
            if (tooltipPinned) return;
            d3.select(this).style("opacity", 0.85);
            tooltip.classed("visible", false);
        })
        // --- INTERACTIVITÉ : click (détails + griser) ---
        .on("click", function (d) {
            d3.event.stopPropagation();
            if (d3.select(this).classed("chart-selected")) {
                clearPinnedTooltip();
                return;
            }
            applyChartSelection(this);
            showPinnedTooltip(
                "<strong>" + d.data.nom + "</strong><br>" +
                d.data.pct.toFixed(1) + " %",
                d3.event.clientX,
                d3.event.clientY
            );
        });

    // Labels textuels (<text>) sur chaque portion
    arcs.append("text")
        .attr("transform", function (d) {
            return "translate(" + arcLabel.centroid(d) + ")";
        })
        .attr("text-anchor", "middle")
        .style("fill", "var(--text-0)")
        .style("font-size", "10px")
        .style("font-weight", "500")
        .text(function (d) { return d.data.pct > 8 ? d.data.nom : ""; });

    // Valeurs au centre du donut (total)
    var total = d3.sum(donnees, function (d) { return d.pct; });
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("fill", "var(--text-2)")
        .style("font-size", "12px")
        .text("100 %");
}

/**
 * Affiche une grille de cartes KPI (indicateurs clés).
 * Utilise D3 pour manipuler le DOM HTML (pas SVG) :
 * d3.select(), .selectAll(), .data(), .enter(), .append()
 *
 * @param {Object} conteneur - Sélection D3 du conteneur
 * @param {Array} kpis - Tableau d'objets {icon, label, val1, val2, nom1, nom2}
 */
function afficherKPI(conteneur, kpis, nom1, nom2) {
    // Nettoyage des anciens KPI
    conteneur.selectAll(".kpi-card").remove();

    // --- DATA BINDING sur des éléments HTML ---
    var cards = conteneur.selectAll(".kpi-card")
        .data(kpis)                     // .data()
        .enter()                        // .enter()
        .append("div")                  // .append("div") — DOM HTML
        .attr("class", "kpi-card");

    // Icône
    cards.append("div")
        .attr("class", "kpi-icon")
        .text(function (d, i) { return d.icon; });

    // Label
    cards.append("div")
        .attr("class", "kpi-label")
        .text(function (d, i) { return d.label; });

    // Conteneur des valeurs (2 villes côte à côte)
    var valuesDiv = cards.append("div")
        .attr("class", "kpi-values");

    // Colonne ville 1
    var col1 = valuesDiv.append("div");
    col1.append("div")
        .attr("class", "kpi-val v1")
        .text(function (d, i) { return d.val1; });
    col1.append("div")
        .attr("class", "kpi-city-name")
        .text(nom1);

    // Colonne ville 2
    var col2 = valuesDiv.append("div");
    col2.append("div")
        .attr("class", "kpi-val v2")
        .text(function (d, i) { return d.val2; });
    col2.append("div")
        .attr("class", "kpi-city-name")
        .text(nom2);
}


// =============================================================
// 11. CHARGEMENT DES DONNÉES EXTERNES
//     d3.queue() → chargement parallèle (D3 v4)
//     Callback avec gestion d'erreur
// =============================================================

// Parseur pour le CSV à séparateur point-virgule
var parseurCSV = d3.dsvFormat(";");

d3.queue()
    .defer(d3.json, urlGeoJSON)
    .defer(d3.text, "donnees_communes.csv")
    .defer(d3.json, urlCommunesAPI)
    .await(function (err, france, texteBrut, communesGeo) {

        // --- Gestion d'erreur ---
        if (err) {
            console.error("Erreur lors du chargement des données :", err);
            mapDiv.append("p")
                .style("color", "var(--danger)")
                .style("text-align", "center")
                .style("padding", "2rem")
                .text("Erreur de chargement. Vérifiez la connexion et le serveur local.");
            return;
        }

        console.log("✅ Toutes les données chargées avec succès !");


        // =============================================================
        // 12. PARSING ET PRÉPARATION DES DONNÉES
        // =============================================================

        // Parsing du CSV (séparateur point-virgule)
        var don = parseurCSV.parse(texteBrut);
        console.log("CSV :", don.length, "lignes — Premier :", don[0]);

        // Dictionnaire code commune → coordonnées GPS
        var coordParCode = {};
        communesGeo.forEach(function (d, i) {
            if (d.centre && d.centre.coordinates) {
                coordParCode[d.code] = {
                    lon: d.centre.coordinates[0],
                    lat: d.centre.coordinates[1]
                };
            }
        });
        console.log("Coordonnées disponibles pour", Object.keys(coordParCode).length, "communes");

        // Détection dynamique des noms de colonnes
        var colonnes = Object.keys(don[0]);
        var colRegion = colonnes[1];   // 2e colonne = Région
        var colCommune = colonnes[7];  // 8e colonne = Commune

        // Conversion des types numériques (fonction anonyme avec d, i)
        don.forEach(function (d, i) {
            d.PMUN = +d.PMUN;
            d.PCAP = +d.PCAP;
            d.PTOT = +d.PTOT;
        });

        // Filtrage : villes ≥ 20 000 habitants
        var villesFiltrees = don.filter(function (d, i) {
            return d.PMUN >= SEUIL_POPULATION;
        });
        console.log("Villes ≥ " + SEUIL_POPULATION + " hab :", villesFiltrees.length);

        // Enrichissement avec coordonnées GPS
        var villesAvecCoords = [];
        villesFiltrees.forEach(function (d, i) {
            var coord = coordParCode[d.COM];
            if (coord) {
                d.lon = coord.lon;
                d.lat = coord.lat;
                villesAvecCoords.push(d);
            }
        });
        console.log("Villes avec coordonnées :", villesAvecCoords.length);

        // Extraction des régions uniques
        var regions = [];
        villesFiltrees.forEach(function (d) {
            var region = d[colRegion];
            if (region && regions.indexOf(region) === -1) {
                regions.push(region);
            }
        });
        regions.sort();

        // Configuration du domain de scaleOrdinal (couleurs)
        echelleCouleur.domain(regions);


        // =============================================================
        // 13. BARRE DE RECHERCHE AVEC AUTOCOMPLÉTION
        //     .on("input"), .on("click"), .data() → .enter()
        // =============================================================

        searchInput.on("input", function () {
            var terme = this.value.toLowerCase().trim();

            // Masquer si champ vide
            if (terme.length < 2) {
                searchResults.classed("visible", false);
                return;
            }

            // Filtrage des villes correspondantes (max 8 résultats)
            var resultats = villesAvecCoords.filter(function (d) {
                return d[colCommune].toLowerCase().indexOf(terme) !== -1;
            }).slice(0, 8);

            // Nettoyage des anciens résultats
            searchResults.selectAll("*").remove();

            // Affichage si résultats trouvés
            if (resultats.length === 0) {
                searchResults.classed("visible", false);
                return;
            }

            searchResults.classed("visible", true);

            // Data Binding : .data() → .enter() → .append("div")
            searchResults.selectAll(".search-item")
                .data(resultats)
                .enter()
                .append("div")
                .attr("class", "search-item")
                .html(function (d, i) {
                    return "<strong>" + d[colCommune] + "</strong> — " +
                        d[colRegion] + " (" + fmt(d.PMUN) + " hab.)";
                })
                .on("click", function (d, i) {
                    // Sélection de la ville cliquée dans les résultats
                    ajouterVille(d);
                    mettreAJourCerclesCarte();
                    searchInput.property("value", "");
                    searchResults.classed("visible", false);
                });
        });

        // Masquer les résultats quand on clique ailleurs
        d3.select("body").on("click", function () {
            searchResults.classed("visible", false);
        });


        // =============================================================
        // 14. DESSIN DE LA CARTE DE FRANCE
        //     Data Binding : .data() → .enter() → .append("path")
        // =============================================================

        gDepartements.selectAll("path")
            .data(france.features)
            .enter()
            .append("path")
            .attr("d", geoPath)
            .attr("class", "department");


        // =============================================================
        // 15. DESSIN DES VILLES SUR LA CARTE
        //     .data() → .enter() → .append("circle")
        //     Interactivité : click, mouseover, mouseout
        //     d3.select(this), d3.event
        // =============================================================

        gVilles.selectAll("circle")
            .data(villesAvecCoords)
            .enter()
            .append("circle")
            .attr("class", "city")
            .attr("cx", function (d, i) {
                return projection([d.lon, d.lat])[0];
            })
            .attr("cy", function (d, i) {
                return projection([d.lon, d.lat])[1];
            })
            .attr("r", function (d, i) {
                return echelleRayonCarte(d.PMUN);
            })
            // --- CLICK : sélection ---
            .on("click", function (d, i) {
                ajouterVille(d);
                mettreAJourCerclesCarte();
                d3.select(this).raise();
            })
            // --- MOUSEOVER : tooltip ---
            .on("mouseover", function (d, i) {
                d3.select(this)
                    .style("stroke", "var(--text-0)")
                    .style("stroke-width", "2px");

                tooltip.classed("visible", true)
                    .html(
                        "<strong>" + d[colCommune] + "</strong><br>" +
                        d[colRegion] + "<br>" +
                        "Pop. : " + fmt(d.PMUN) + " hab."
                    )
                    .style("left", (d3.event.clientX + 15) + "px")
                    .style("top", (d3.event.clientY - 10) + "px");
            })
            // --- MOUSEOUT : masquer tooltip ---
            .on("mouseout", function (d, i) {
                d3.select(this)
                    .style("stroke", null)
                    .style("stroke-width", null);
                tooltip.classed("visible", false);
            });


        // =============================================================
        // 16. MISE EN SURBRILLANCE DES VILLES SÉLECTIONNÉES
        // =============================================================

        function mettreAJourCerclesCarte() {
            d3.selectAll(".city")
                .classed("selected-v1", false)
                .classed("selected-v2", false);

            if (selection.length >= 1) {
                gVilles.selectAll("circle")
                    .classed("selected-v1", function (c) {
                        return c.COM === selection[0].COM;
                    });
            }
            if (selection.length >= 2) {
                gVilles.selectAll("circle")
                    .classed("selected-v2", function (c) {
                        return c.COM === selection[1].COM;
                    });
            }
        }


        // =============================================================
        // 17. LOGIQUE DE SÉLECTION DES VILLES
        // =============================================================

        function ajouterVille(ville) {
            // Reset si déjà 2 villes sélectionnées
            if (selection.length >= 2) {
                selection = [];
            }
            selection.push(ville);

            // Mise à jour des panneaux latéraux
            mettreAJourCartes();

            // Mise à jour du bar chart avec la région de la ville
            var regionVille = ville[colRegion];
            selectRegion.property("value", regionVille);
            var villesRegion = villesFiltrees.filter(function (d) {
                return d[colRegion] === regionVille;
            });
            mettreAJourBarChart(villesRegion);
        }

        function mettreAJourCartes() {
            // --- Ville 1 ---
            if (selection[0]) {
                placeholderV1.html(
                    "<strong>" + selection[0][colCommune] + "</strong><br>" +
                    "Région : " + selection[0][colRegion] + "<br>" +
                    "Pop. municipale : " + fmt(selection[0].PMUN) + "<br>" +
                    "Pop. comptée à part : " + fmt(selection[0].PCAP) + "<br>" +
                    "Pop. totale : " + fmt(selection[0].PTOT)
                );
                cardVille1.classed("active", true);
            } else {
                placeholderV1.text("Cliquez sur une ville…");
                cardVille1.classed("active", false);
            }

            // --- Ville 2 ---
            if (selection[1]) {
                placeholderV2.html(
                    "<strong>" + selection[1][colCommune] + "</strong><br>" +
                    "Région : " + selection[1][colRegion] + "<br>" +
                    "Pop. municipale : " + fmt(selection[1].PMUN) + "<br>" +
                    "Pop. comptée à part : " + fmt(selection[1].PCAP) + "<br>" +
                    "Pop. totale : " + fmt(selection[1].PTOT)
                );
                cardVille2.classed("active", true);

                // Lancer toutes les comparaisons
                comparerVilles();
                mettreAJourComparaisonVisuelle();
                mettreAJourEmploi();
                mettreAJourLogement();
                chargerMeteo();

                // Nouvelles sections
                mettreAJourDemographie();
                mettreAJourEducation();
                mettreAJourTransports();
                mettreAJourQualite();
            } else {
                placeholderV2.text("Cliquez sur une 2e ville…");
                cardVille2.classed("active", false);
                compResult.classed("visible", false);
                placeholder.style("display", "block");
                compChartDiv.selectAll("svg").remove();
                masquerSectionsSecondaires();
            }
        }

        /**
         * Masque les sections secondaires quand une seule ville est sélectionnée.
         */
        function masquerSectionsSecondaires() {
            // Emploi
            d3.select("#emploi-placeholder").style("display", "block");
            d3.select("#emploi-kpi").selectAll("*").remove();
            d3.select("#emploi-bar-section").style("display", "none");
            d3.select("#emploi-secteurs-section").style("display", "none");

            // Logement
            d3.select("#logement-placeholder").style("display", "block");
            d3.select("#logement-kpi").selectAll("*").remove();
            d3.select("#logement-type-section").style("display", "none");
            d3.select("#logement-statut-section").style("display", "none");

            // Météo
            d3.select("#meteo-placeholder").style("display", "block");
            d3.select("#meteo-current").selectAll("*").remove();
            d3.select("#meteo-forecast-section").style("display", "none");
            d3.select("#meteo-climat-section").style("display", "none");

            // Démographie
            d3.select("#demographie-placeholder").style("display", "block");
            d3.select("#demographie-kpi").selectAll("*").remove();
            d3.select("#demographie-pyramide-section").style("display", "none");
            d3.select("#demographie-evolution-section").style("display", "none");
            d3.select("#demographie-tableau-section").style("display", "none");

            // Éducation
            d3.select("#education-placeholder").style("display", "block");
            d3.select("#education-kpi").selectAll("*").remove();
            d3.select("#education-diplomes-section").style("display", "none");
            d3.select("#education-bar-section").style("display", "none");

            // Transports
            d3.select("#transports-placeholder").style("display", "block");
            d3.select("#transports-kpi").selectAll("*").remove();
            d3.select("#transports-modes-section").style("display", "none");
            d3.select("#transports-bar-section").style("display", "none");

            // Qualité de vie
            d3.select("#qualite-placeholder").style("display", "block");
            d3.select("#qualite-kpi").selectAll("*").remove();
            d3.select("#qualite-radar-section").style("display", "none");
            d3.select("#qualite-bar-section").style("display", "none");
        }


        // =============================================================
        // 18. COMPARAISON TEXTUELLE RAPIDE
        // =============================================================

        function comparerVilles() {
            var v1 = selection[0];
            var v2 = selection[1];
            var diff = Math.abs(v1.PMUN - v2.PMUN);
            var plusGrande = v1.PMUN > v2.PMUN ? v1[colCommune] : v2[colCommune];

            compResult.classed("visible", true);
            compText.html(
                "La ville la plus peuplée est <strong>" + plusGrande + "</strong>.<br>" +
                "Écart : <strong>" + fmt(diff) + "</strong> habitants."
            );
        }


        // =============================================================
        // 19. COMPARAISON VISUELLE AVEC CERCLES PROPORTIONNELS
        //     <circle>, <text>, <g>, transform/translate
        //     d3.scaleLinear(), .data() → .enter()
        // =============================================================

        function mettreAJourComparaisonVisuelle() {
            var v1 = selection[0];
            var v2 = selection[1];
            if (!v1 || !v2) return;

            placeholder.style("display", "none");

            var indicateurs = [
                { label: "Population municipale", cle: "PMUN" },
                { label: "Pop. comptée à part", cle: "PCAP" },
                { label: "Population totale", cle: "PTOT" }
            ];

            // Échelle linéaire pour les rayons
            var maxVal = d3.max(indicateurs, function (d) {
                return Math.max(v1[d.cle], v2[d.cle]);
            });

            var echelleRayon = d3.scaleLinear()
                .domain([0, maxVal])
                .range([8, 55]);

            // EXIT : suppression ancien SVG
            compChartDiv.selectAll("svg").remove();

            var svgComp = compChartDiv
                .append("svg")
                .attr("width", compLargeur)
                .attr("height", compHauteur);

            var espacement = compLargeur / (indicateurs.length + 1);

            // Légende
            var gLegende = svgComp.append("g")
                .attr("transform", "translate(0, 30)");

            gLegende.append("circle")
                .attr("cx", compLargeur / 2 - 170)
                .attr("cy", -5)
                .attr("r", 6)
                .style("fill", COULEUR_V1);

            gLegende.append("text")
                .attr("class", "comp-city-name")
                .attr("x", compLargeur / 2 - 155)
                .attr("y", 0)
                .text(v1[colCommune]);

            gLegende.append("circle")
                .attr("cx", compLargeur / 2 + 40)
                .attr("cy", -5)
                .attr("r", 6)
                .style("fill", COULEUR_V2);

            gLegende.append("text")
                .attr("class", "comp-city-name")
                .attr("x", compLargeur / 2 + 55)
                .attr("y", 0)
                .text(v2[colCommune]);

            // DATA BINDING sur les indicateurs
            var groupes = svgComp.selectAll(".comp-group")
                .data(indicateurs)
                .enter()
                .append("g")
                .attr("class", "comp-group")
                .attr("transform", function (d, i) {
                    return "translate(" + (espacement * (i + 1)) + ", 170)";
                });

            // Labels
            groupes.append("text")
                .attr("class", "comp-label")
                .attr("y", -85)
                .attr("text-anchor", "middle")
                .text(function (d, i) { return d.label; });

            // Cercles ville 1 avec animation
            groupes.append("circle")
                .attr("cx", -40).attr("cy", 0).attr("r", 0)
                .style("fill", COULEUR_V1).style("opacity", 0.75)
                .transition().duration(700)
                .delay(function (d, i) { return i * 100; })
                .attr("r", function (d, i) { return echelleRayon(v1[d.cle]); });

            // Cercles ville 2 avec animation
            groupes.append("circle")
                .attr("cx", 40).attr("cy", 0).attr("r", 0)
                .style("fill", COULEUR_V2).style("opacity", 0.75)
                .transition().duration(700)
                .delay(function (d, i) { return i * 100; })
                .attr("r", function (d, i) { return echelleRayon(v2[d.cle]); });

            // Valeurs textuelles
            groupes.append("text")
                .attr("class", "comp-value").attr("x", -40).attr("y", 70)
                .attr("text-anchor", "middle").style("fill", COULEUR_V1)
                .text(function (d, i) { return fmt(v1[d.cle]); });

            groupes.append("text")
                .attr("class", "comp-value").attr("x", 40).attr("y", 70)
                .attr("text-anchor", "middle").style("fill", COULEUR_V2)
                .text(function (d, i) { return fmt(v2[d.cle]); });
        }


        // =============================================================
        // 20. BAR CHART — TOP 15 VILLES DE LA RÉGION
        //     Cycle complet : .data() → .exit() → .enter() → update
        //     <rect>, <text>, mouseover, mouseout
        // =============================================================

        function mettreAJourBarChart(donneesRegion) {
            var top = donneesRegion
                .sort(function (a, b) { return b.PMUN - a.PMUN; })
                .slice(0, NB_VILLES_TOP);

            // Mise à jour des domains
            echelleX.domain(top.map(function (d, i) { return d[colCommune]; }));
            echelleY.domain([0, d3.max(top, function (d, i) { return d.PMUN; })]);

            // Axes
            gAxisX.transition().duration(600)
                .call(d3.axisBottom(echelleX))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end")
                .attr("dx", "-0.6em")
                .attr("dy", "0.3em");

            gAxisY.transition().duration(600)
                .call(d3.axisLeft(echelleY).ticks(6).tickFormat(function (d) {
                    return (d / 1000) + "k";
                }));

            // DATA BINDING
            var barres = svgChart.selectAll(".bar")
                .data(top, function (d) { return d.COM; });

            // EXIT
            barres.exit()
                .transition().duration(400)
                .attr("y", chartHeight)
                .attr("height", 0)
                .style("opacity", 0)
                .remove();

            // ENTER
            var barresEnter = barres.enter()
                .append("rect")
                .attr("class", "bar chart-interactive")
                .attr("x", function (d, i) { return echelleX(d[colCommune]); })
                .attr("width", echelleX.bandwidth())
                .attr("y", chartHeight)
                .attr("height", 0)
                .attr("rx", 4)
                .attr("ry", 4)
                .style("fill", function (d, i) { return echelleCouleur(d[colRegion]); })
                .style("opacity", 0.85);

            // INTERACTIVITÉ sur les barres
            barresEnter
                .on("mouseover", function (d, i) {
                    if (tooltipPinned) return;
                    d3.select(this)
                        .style("opacity", 1)
                        .style("stroke", "var(--text-0)")
                        .style("stroke-width", "2px");
                    tooltip.classed("visible", true)
                        .html(
                            "<strong>" + d[colCommune] + "</strong><br>" +
                            "Région : " + d[colRegion] + "<br>" +
                            "Pop. municipale : <strong>" + fmt(d.PMUN) + "</strong><br>" +
                            "Pop. totale : <strong>" + fmt(d.PTOT) + "</strong>"
                        )
                        .style("left", (d3.event.clientX + 15) + "px")
                        .style("top", (d3.event.clientY - 10) + "px");
                })
                .on("mouseout", function (d, i) {
                    if (tooltipPinned) return;
                    d3.select(this)
                        .style("opacity", 0.85)
                        .style("stroke", "none");
                    tooltip.classed("visible", false);
                })
                .on("click", function (d) {
                    d3.event.stopPropagation();
                    if (d3.select(this).classed("chart-selected")) {
                        clearPinnedTooltip();
                        return;
                    }
                    applyChartSelection(this);
                    showPinnedTooltip(
                        "<strong>" + d[colCommune] + "</strong><br>" +
                        "Région : " + d[colRegion] + "<br>" +
                        "Pop. municipale : <strong>" + fmt(d.PMUN) + "</strong><br>" +
                        "Pop. totale : <strong>" + fmt(d.PTOT) + "</strong>",
                        d3.event.clientX,
                        d3.event.clientY
                    );
                });

            // ANIMATION D'ENTRÉE
            barresEnter
                .transition().duration(600)
                .delay(function (d, i) { return i * 40; })
                .attr("y", function (d, i) { return echelleY(d.PMUN); })
                .attr("height", function (d, i) { return chartHeight - echelleY(d.PMUN); });

            // UPDATE
            barres
                .transition().duration(600)
                .attr("x", function (d, i) { return echelleX(d[colCommune]); })
                .attr("width", echelleX.bandwidth())
                .attr("y", function (d, i) { return echelleY(d.PMUN); })
                .attr("height", function (d, i) { return chartHeight - echelleY(d.PMUN); })
                .style("fill", function (d, i) { return echelleCouleur(d[colRegion]); });

            barres
                .attr("class", "bar chart-interactive");

            // Labels au-dessus des barres
            svgChart.selectAll(".bar-label").remove();

            svgChart.selectAll(".bar-label")
                .data(top, function (d) { return d.COM; })
                .enter()
                .append("text")
                .attr("class", "bar-label")
                .attr("x", function (d, i) {
                    return echelleX(d[colCommune]) + echelleX.bandwidth() / 2;
                })
                .attr("y", function (d, i) { return echelleY(d.PMUN) - 6; })
                .attr("text-anchor", "middle")
                .style("fill", "#a78bfa")
                .style("font-size", "10px")
                .style("font-weight", "600")
                .style("opacity", 0)
                .text(function (d, i) { return (d.PMUN / 1000).toFixed(0) + "k"; })
                .transition().duration(600)
                .delay(function (d, i) { return i * 40 + 300; })
                .style("opacity", 1);
        }


        // =============================================================
        // 21. ONGLET EMPLOI — KPI + BAR CHART + DONUTS SECTORIELS
        // =============================================================

        function mettreAJourEmploi() {
            var v1 = selection[0];
            var v2 = selection[1];
            if (!v1 || !v2) return;

            // Génération des données emploi
            var emp1 = genererDonneesEmploi(v1);
            var emp2 = genererDonneesEmploi(v2);
            var nom1 = v1[colCommune];
            var nom2 = v2[colCommune];

            // Masquer le placeholder, afficher les sections
            d3.select("#emploi-placeholder").style("display", "none");
            d3.select("#emploi-bar-section").style("display", "block");
            d3.select("#emploi-secteurs-section").style("display", "block");

            // --- KPI Cards ---
            var kpis = [
                {
                    icon: "📉", label: "Taux de chômage",
                    val1: emp1.tauxChomage + " %", val2: emp2.tauxChomage + " %"
                },
                {
                    icon: "👥", label: "Nombre d'emplois",
                    val1: fmt(emp1.nbEmplois), val2: fmt(emp2.nbEmplois)
                },
                {
                    icon: "📊", label: "Taux d'activité",
                    val1: emp1.tauxActivite + " %", val2: emp2.tauxActivite + " %"
                },
                {
                    icon: "💰", label: "Revenu médian (€/mois)",
                    val1: fmt(emp1.revenuMedian) + " €", val2: fmt(emp2.revenuMedian) + " €"
                }
            ];
            afficherKPI(d3.select("#emploi-kpi"), kpis, nom1, nom2);

            // --- Bar chart comparatif emploi ---
            dessinerBarChartComparatif(
                d3.select("#emploi-bar-chart"),
                [
                    { label: "Chômage (%)", v1: emp1.tauxChomage, v2: emp2.tauxChomage },
                    { label: "Activité (%)", v1: emp1.tauxActivite, v2: emp2.tauxActivite },
                    { label: "Revenu (€)", v1: emp1.revenuMedian, v2: emp2.revenuMedian }
                ],
                nom1, nom2
            );

            // --- Donuts sectoriels ---
            var secteursDiv = d3.select("#emploi-secteurs");
            secteursDiv.selectAll("*").remove();

            var divV1 = secteursDiv.append("div");
            var divV2 = secteursDiv.append("div");

            dessinerDonut(divV1, emp1.secteurs, 450, 320, nom1);
            dessinerDonut(divV2, emp2.secteurs, 450, 320, nom2);
        }


        // =============================================================
        // 22. ONGLET LOGEMENT — KPI + DONUTS TYPE + DONUTS STATUT
        // =============================================================

        function mettreAJourLogement() {
            var v1 = selection[0];
            var v2 = selection[1];
            if (!v1 || !v2) return;

            var log1 = genererDonneesLogement(v1);
            var log2 = genererDonneesLogement(v2);
            var nom1 = v1[colCommune];
            var nom2 = v2[colCommune];

            // Masquer placeholder, afficher sections
            d3.select("#logement-placeholder").style("display", "none");
            d3.select("#logement-type-section").style("display", "block");
            d3.select("#logement-statut-section").style("display", "block");

            // --- KPI Cards ---
            var kpis = [
                {
                    icon: "🏘️", label: "Nombre de logements",
                    val1: fmt(log1.nbLogements), val2: fmt(log2.nbLogements)
                },
                {
                    icon: "💶", label: "Prix moyen au m²",
                    val1: fmt(log1.prixM2) + " €", val2: fmt(log2.prixM2) + " €"
                },
                {
                    icon: "📐", label: "Surface moyenne (m²)",
                    val1: log1.surfaceMoyenne + " m²", val2: log2.surfaceMoyenne + " m²"
                },
                {
                    icon: "🏗️", label: "Part HLM",
                    val1: log1.pctHLM + " %", val2: log2.pctHLM + " %"
                }
            ];
            afficherKPI(d3.select("#logement-kpi"), kpis, nom1, nom2);

            // --- Donuts type de logement ---
            var typeDiv = d3.select("#logement-type");
            typeDiv.selectAll("*").remove();
            var divT1 = typeDiv.append("div");
            var divT2 = typeDiv.append("div");
            dessinerDonut(divT1, log1.type, 450, 320, nom1);
            dessinerDonut(divT2, log2.type, 450, 320, nom2);

            // --- Donuts statut d'occupation ---
            var statutDiv = d3.select("#logement-statut");
            statutDiv.selectAll("*").remove();
            var divS1 = statutDiv.append("div");
            var divS2 = statutDiv.append("div");
            dessinerDonut(divS1, log1.occupation, 450, 320, nom1);
            dessinerDonut(divS2, log2.occupation, 450, 320, nom2);
        }


        // =============================================================
        // 23. BAR CHART COMPARATIF (réutilisable)
        //     Barres groupées pour 2 villes côte à côte
        //     d3.scaleBand(), d3.scaleLinear(), .data() → .enter()
        // =============================================================

        function dessinerBarChartComparatif(conteneur, donnees, nom1, nom2) {
            conteneur.selectAll("svg").remove();

            var marge = { top: 40, right: 30, bottom: 60, left: 80 };
            var larg = 900 - marge.left - marge.right;
            var haut = 300 - marge.top - marge.bottom;

            var svg = conteneur.append("svg")
                .attr("width", larg + marge.left + marge.right)
                .attr("height", haut + marge.top + marge.bottom)
                .append("g")
                .attr("transform", "translate(" + marge.left + "," + marge.top + ")");

            // Échelle X : bandes pour les indicateurs
            var x0 = d3.scaleBand()
                .domain(donnees.map(function (d) { return d.label; }))
                .range([0, larg])
                .padding(0.3);

            // Sous-bandes pour les 2 villes
            var x1 = d3.scaleBand()
                .domain(["v1", "v2"])
                .range([0, x0.bandwidth()])
                .padding(0.08);

            // Échelle Y
            var y = d3.scaleLinear()
                .domain([0, d3.max(donnees, function (d) {
                    return Math.max(d.v1, d.v2);
                }) * 1.15])
                .range([haut, 0]);

            // Axe X
            svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0," + haut + ")")
                .call(d3.axisBottom(x0));

            // Axe Y
            svg.append("g")
                .attr("class", "axis")
                .call(d3.axisLeft(y).ticks(5));

            // Légende
            svg.append("circle").attr("cx", larg / 2 - 120).attr("cy", -20)
                .attr("r", 5).style("fill", COULEUR_V1);
            svg.append("text").attr("x", larg / 2 - 110).attr("y", -16)
                .style("fill", "var(--text-0)").style("font-size", "12px").text(nom1);
            svg.append("circle").attr("cx", larg / 2 + 30).attr("cy", -20)
                .attr("r", 5).style("fill", COULEUR_V2);
            svg.append("text").attr("x", larg / 2 + 40).attr("y", -16)
                .style("fill", "var(--text-0)").style("font-size", "12px").text(nom2);

            // Groupes pour chaque indicateur
            var groupes = svg.selectAll(".group")
                .data(donnees)
                .enter()
                .append("g")
                .attr("transform", function (d) {
                    return "translate(" + x0(d.label) + ",0)";
                });

            // Barres ville 1
            groupes.append("rect")
                .attr("class", "chart-interactive")
                .attr("x", function () { return x1("v1"); })
                .attr("width", x1.bandwidth())
                .attr("y", haut)
                .attr("height", 0)
                .attr("rx", 3)
                .style("fill", COULEUR_V1)
                .style("opacity", 0.85)
                .on("mouseover", function (d) {
                    if (tooltipPinned) return;
                    d3.select(this).style("opacity", 1);
                    tooltip.classed("visible", true)
                        .html("<strong>" + nom1 + "</strong><br>" + d.label + " : " + fmt(d.v1))
                        .style("left", (d3.event.clientX + 15) + "px")
                        .style("top", (d3.event.clientY - 10) + "px");
                })
                .on("mouseout", function () {
                    if (tooltipPinned) return;
                    d3.select(this).style("opacity", 0.85);
                    tooltip.classed("visible", false);
                })
                .on("click", function (d) {
                    d3.event.stopPropagation();
                    if (d3.select(this).classed("chart-selected")) {
                        clearPinnedTooltip();
                        return;
                    }
                    applyChartSelection(this);
                    showPinnedTooltip(
                        "<strong>" + nom1 + "</strong><br>" + d.label + " : " + fmt(d.v1),
                        d3.event.clientX,
                        d3.event.clientY
                    );
                })
                .transition().duration(600)
                .attr("y", function (d) { return y(d.v1); })
                .attr("height", function (d) { return haut - y(d.v1); });

            // Barres ville 2
            groupes.append("rect")
                .attr("class", "chart-interactive")
                .attr("x", function () { return x1("v2"); })
                .attr("width", x1.bandwidth())
                .attr("y", haut)
                .attr("height", 0)
                .attr("rx", 3)
                .style("fill", COULEUR_V2)
                .style("opacity", 0.85)
                .on("mouseover", function (d) {
                    if (tooltipPinned) return;
                    d3.select(this).style("opacity", 1);
                    tooltip.classed("visible", true)
                        .html("<strong>" + nom2 + "</strong><br>" + d.label + " : " + fmt(d.v2))
                        .style("left", (d3.event.clientX + 15) + "px")
                        .style("top", (d3.event.clientY - 10) + "px");
                })
                .on("mouseout", function () {
                    if (tooltipPinned) return;
                    d3.select(this).style("opacity", 0.85);
                    tooltip.classed("visible", false);
                })
                .on("click", function (d) {
                    d3.event.stopPropagation();
                    if (d3.select(this).classed("chart-selected")) {
                        clearPinnedTooltip();
                        return;
                    }
                    applyChartSelection(this);
                    showPinnedTooltip(
                        "<strong>" + nom2 + "</strong><br>" + d.label + " : " + fmt(d.v2),
                        d3.event.clientX,
                        d3.event.clientY
                    );
                })
                .transition().duration(600)
                .attr("y", function (d) { return y(d.v2); })
                .attr("height", function (d) { return haut - y(d.v2); });
        }


        // =============================================================
        // 24. ONGLET MÉTÉO — API OPEN-METEO + GRAPHIQUES
        //     d3.json() avec callback, d3.queue()
        //     d3.line(), d3.scalePoint(), d3.scaleLinear()
        // =============================================================

        function chargerMeteo() {
            var v1 = selection[0];
            var v2 = selection[1];
            if (!v1 || !v2) return;

            // Construction des URLs Open-Meteo (API gratuite, sans clé)
            var baseURL = "https://api.open-meteo.com/v1/forecast";
            var params = "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode" +
                "&current_weather=true&timezone=Europe%2FParis&forecast_days=7";

            var url1 = baseURL + "?latitude=" + v1.lat + "&longitude=" + v1.lon + params;
            var url2 = baseURL + "?latitude=" + v2.lat + "&longitude=" + v2.lon + params;

            // Chargement parallèle via d3.queue() (D3 v4)
            d3.queue()
                .defer(d3.json, url1)
                .defer(d3.json, url2)
                .await(function (erreur, meteo1, meteo2) {
                    if (erreur) {
                        console.error("Erreur API météo :", erreur);
                        d3.select("#meteo-placeholder")
                            .text("Impossible de charger les données météo. Vérifiez votre connexion.")
                            .style("color", "var(--danger)");
                        return;
                    }
                    dessinerMeteo(v1, v2, meteo1, meteo2);
                });
        }

        /**
         * Dessine les visualisations météo après récupération des données API.
         */
        function dessinerMeteo(v1, v2, meteo1, meteo2) {
            var nom1 = v1[colCommune];
            var nom2 = v2[colCommune];

            // Masquer placeholder, afficher sections
            d3.select("#meteo-placeholder").style("display", "none");
            d3.select("#meteo-forecast-section").style("display", "block");
            d3.select("#meteo-climat-section").style("display", "block");

            // --- KPI cartes météo actuelle ---
            var cw1 = meteo1.current_weather;
            var cw2 = meteo2.current_weather;
            var info1 = descriptionMeteo(cw1.weathercode);
            var info2 = descriptionMeteo(cw2.weathercode);

            var kpis = [
                {
                    icon: "🌡️", label: "Température actuelle",
                    val1: cw1.temperature + " °C", val2: cw2.temperature + " °C"
                },
                {
                    icon: info1.icon, label: "Conditions",
                    val1: info1.desc, val2: info2.desc
                },
                {
                    icon: "💨", label: "Vent",
                    val1: cw1.windspeed + " km/h", val2: cw2.windspeed + " km/h"
                }
            ];
            afficherKPI(d3.select("#meteo-current"), kpis, nom1, nom2);

            // --- Graphique ligne : prévisions 7 jours (températures max) ---
            dessinerLigneMeteo(
                d3.select("#meteo-forecast"),
                meteo1.daily, meteo2.daily, nom1, nom2
            );

            // --- Graphique ligne : climat annuel (températures mensuelles) ---
            var climat1 = genererClimat(v1);
            var climat2 = genererClimat(v2);
            dessinerLigneClimat(
                d3.select("#meteo-climat"),
                climat1, climat2, nom1, nom2
            );
        }

        /**
         * Dessine un graphique en lignes pour les prévisions 7 jours.
         * Utilise d3.line(), d3.scalePoint(), d3.scaleLinear()
         */
        function dessinerLigneMeteo(conteneur, daily1, daily2, nom1, nom2) {
            conteneur.selectAll("svg").remove();

            var marge = { top: 50, right: 40, bottom: 50, left: 50 };
            var larg = 950 - marge.left - marge.right;
            var haut = 320 - marge.top - marge.bottom;

            var svg = conteneur.append("svg")
                .attr("width", larg + marge.left + marge.right)
                .attr("height", haut + marge.top + marge.bottom)
                .append("g")
                .attr("transform", "translate(" + marge.left + "," + marge.top + ")");

            // Préparation des données
            var jours = daily1.time.map(function (d) {
                var date = new Date(d);
                return JOURS_SEMAINE[date.getDay()] + " " + date.getDate();
            });

            // Échelles
            var x = d3.scalePoint()
                .domain(jours)
                .range([0, larg]);

            var allTemps = daily1.temperature_2m_max
                .concat(daily1.temperature_2m_min)
                .concat(daily2.temperature_2m_max)
                .concat(daily2.temperature_2m_min);

            var y = d3.scaleLinear()
                .domain([d3.min(allTemps) - 2, d3.max(allTemps) + 2])
                .range([haut, 0]);

            // Axes
            svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0," + haut + ")")
                .call(d3.axisBottom(x));

            svg.append("g")
                .attr("class", "axis")
                .call(d3.axisLeft(y).ticks(6).tickFormat(function (d) { return d + "°C"; }));

            // Légende
            svg.append("circle").attr("cx", larg / 2 - 160).attr("cy", -25)
                .attr("r", 5).style("fill", COULEUR_V1);
            svg.append("text").attr("x", larg / 2 - 150).attr("y", -21)
                .style("fill", "var(--text-0)").style("font-size", "12px").text(nom1 + " (max)");

            svg.append("circle").attr("cx", larg / 2 + 20).attr("cy", -25)
                .attr("r", 5).style("fill", COULEUR_V2);
            svg.append("text").attr("x", larg / 2 + 30).attr("y", -21)
                .style("fill", "var(--text-0)").style("font-size", "12px").text(nom2 + " (max)");

            // Générateur de lignes (d3.line)
            var ligne = d3.line()
                .x(function (d, i) { return x(jours[i]); })
                .y(function (d) { return y(d); });

            // Ligne ville 1 — températures max
            svg.append("path")
                .datum(daily1.temperature_2m_max)
                .attr("fill", "none")
                .attr("stroke", COULEUR_V1)
                .attr("stroke-width", 2.5)
                .attr("d", ligne);

            // Ligne ville 1 — températures min (en pointillé)
            svg.append("path")
                .datum(daily1.temperature_2m_min)
                .attr("fill", "none")
                .attr("stroke", COULEUR_V1)
                .attr("stroke-width", 1.5)
                .attr("stroke-dasharray", "5,3")
                .attr("d", ligne);

            // Ligne ville 2 — températures max
            svg.append("path")
                .datum(daily2.temperature_2m_max)
                .attr("fill", "none")
                .attr("stroke", COULEUR_V2)
                .attr("stroke-width", 2.5)
                .attr("d", ligne);

            // Ligne ville 2 — températures min (en pointillé)
            svg.append("path")
                .datum(daily2.temperature_2m_min)
                .attr("fill", "none")
                .attr("stroke", COULEUR_V2)
                .attr("stroke-width", 1.5)
                .attr("stroke-dasharray", "5,3")
                .attr("d", ligne);

            // Points sur la ligne (cercles) — .data() → .enter() → .append("circle")
            // Ville 1
            svg.selectAll(".dot-v1")
                .data(daily1.temperature_2m_max)
                .enter()
                .append("circle")
                .attr("cx", function (d, i) { return x(jours[i]); })
                .attr("cy", function (d) { return y(d); })
                .attr("r", 4)
                .style("fill", COULEUR_V1)
                .style("stroke", "var(--bg-1)")
                .style("stroke-width", "1.5px")
                .on("mouseover", function (d, i) {
                    tooltip.classed("visible", true)
                        .html("<strong>" + nom1 + "</strong><br>" +
                            jours[i] + "<br>" +
                            "Max : " + d + "°C<br>" +
                            "Min : " + daily1.temperature_2m_min[i] + "°C<br>" +
                            "Précip. : " + daily1.precipitation_sum[i] + " mm")
                        .style("left", (d3.event.clientX + 15) + "px")
                        .style("top", (d3.event.clientY - 10) + "px");
                })
                .on("mouseout", function () { tooltip.classed("visible", false); });

            // Ville 2
            svg.selectAll(".dot-v2")
                .data(daily2.temperature_2m_max)
                .enter()
                .append("circle")
                .attr("cx", function (d, i) { return x(jours[i]); })
                .attr("cy", function (d) { return y(d); })
                .attr("r", 4)
                .style("fill", COULEUR_V2)
                .style("stroke", "var(--bg-1)")
                .style("stroke-width", "1.5px")
                .on("mouseover", function (d, i) {
                    tooltip.classed("visible", true)
                        .html("<strong>" + nom2 + "</strong><br>" +
                            jours[i] + "<br>" +
                            "Max : " + d + "°C<br>" +
                            "Min : " + daily2.temperature_2m_min[i] + "°C<br>" +
                            "Précip. : " + daily2.precipitation_sum[i] + " mm")
                        .style("left", (d3.event.clientX + 15) + "px")
                        .style("top", (d3.event.clientY - 10) + "px");
                })
                .on("mouseout", function () { tooltip.classed("visible", false); });

            // Label axe Y
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -40).attr("x", -haut / 2)
                .attr("text-anchor", "middle")
                .style("fill", "var(--text-2)").style("font-size", "11px")
                .text("Température (°C)");
        }

        /**
         * Dessine un graphique en lignes pour le climat annuel.
         * Températures mensuelles moyennes + barres de précipitations.
         * d3.line(), d3.scaleBand(), d3.scaleLinear()
         */
        function dessinerLigneClimat(conteneur, climat1, climat2, nom1, nom2) {
            conteneur.selectAll("svg").remove();

            var marge = { top: 50, right: 60, bottom: 50, left: 50 };
            var larg = 950 - marge.left - marge.right;
            var haut = 350 - marge.top - marge.bottom;

            var svg = conteneur.append("svg")
                .attr("width", larg + marge.left + marge.right)
                .attr("height", haut + marge.top + marge.bottom)
                .append("g")
                .attr("transform", "translate(" + marge.left + "," + marge.top + ")");

            // Échelle X : mois
            var x = d3.scalePoint()
                .domain(NOMS_MOIS)
                .range([0, larg]);

            // Échelle Y gauche : température
            var allT = climat1.temperatures.map(function (d) { return d.temp; })
                .concat(climat2.temperatures.map(function (d) { return d.temp; }));

            var yTemp = d3.scaleLinear()
                .domain([d3.min(allT) - 3, d3.max(allT) + 3])
                .range([haut, 0]);

            // Échelle Y droite : précipitations
            var allP = climat1.precipitations.map(function (d) { return d.precip; })
                .concat(climat2.precipitations.map(function (d) { return d.precip; }));

            var yPrecip = d3.scaleLinear()
                .domain([0, d3.max(allP) * 1.3])
                .range([haut, 0]);

            // Axes
            svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0," + haut + ")")
                .call(d3.axisBottom(x));

            svg.append("g")
                .attr("class", "axis")
                .call(d3.axisLeft(yTemp).ticks(8).tickFormat(function (d) { return d + "°C"; }));

            svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(" + larg + ", 0)")
                .call(d3.axisRight(yPrecip).ticks(5).tickFormat(function (d) { return d + " mm"; }));

            // Labels des axes
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -40).attr("x", -haut / 2)
                .attr("text-anchor", "middle")
                .style("fill", "var(--text-2)").style("font-size", "11px")
                .text("Température (°C)");

            svg.append("text")
                .attr("transform", "rotate(90)")
                .attr("y", -(larg + 50)).attr("x", haut / 2)
                .attr("text-anchor", "middle")
                .style("fill", "var(--text-2)").style("font-size", "11px")
                .text("Précipitations (mm)");

            // Légende
            svg.append("circle").attr("cx", larg / 2 - 180).attr("cy", -25)
                .attr("r", 5).style("fill", COULEUR_V1);
            svg.append("text").attr("x", larg / 2 - 170).attr("y", -21)
                .style("fill", "var(--text-0)").style("font-size", "12px").text(nom1);

            svg.append("circle").attr("cx", larg / 2 + 10).attr("cy", -25)
                .attr("r", 5).style("fill", COULEUR_V2);
            svg.append("text").attr("x", larg / 2 + 20).attr("y", -21)
                .style("fill", "var(--text-0)").style("font-size", "12px").text(nom2);

            // Barres de précipitations (en arrière-plan, semi-transparentes)
            var barWidth = larg / 24;

            // Précipitations ville 1
            svg.selectAll(".precip-v1")
                .data(climat1.precipitations)
                .enter()
                .append("rect")
                .attr("x", function (d, i) { return x(NOMS_MOIS[i]) - barWidth - 1; })
                .attr("y", function (d) { return yPrecip(d.precip); })
                .attr("width", barWidth)
                .attr("height", function (d) { return haut - yPrecip(d.precip); })
                .attr("rx", 2)
                .style("fill", COULEUR_V1)
                .style("opacity", 0.2);

            // Précipitations ville 2
            svg.selectAll(".precip-v2")
                .data(climat2.precipitations)
                .enter()
                .append("rect")
                .attr("x", function (d, i) { return x(NOMS_MOIS[i]) + 1; })
                .attr("y", function (d) { return yPrecip(d.precip); })
                .attr("width", barWidth)
                .attr("height", function (d) { return haut - yPrecip(d.precip); })
                .attr("rx", 2)
                .style("fill", COULEUR_V2)
                .style("opacity", 0.2);

            // Générateur de lignes température
            var ligneTemp = d3.line()
                .x(function (d, i) { return x(NOMS_MOIS[i]); })
                .y(function (d) { return yTemp(d.temp); });

            // Ligne température ville 1
            svg.append("path")
                .datum(climat1.temperatures)
                .attr("fill", "none")
                .attr("stroke", COULEUR_V1)
                .attr("stroke-width", 2.5)
                .attr("d", ligneTemp);

            // Ligne température ville 2
            svg.append("path")
                .datum(climat2.temperatures)
                .attr("fill", "none")
                .attr("stroke", COULEUR_V2)
                .attr("stroke-width", 2.5)
                .attr("d", ligneTemp);

            // Points température ville 1
            svg.selectAll(".clima-dot-v1")
                .data(climat1.temperatures)
                .enter()
                .append("circle")
                .attr("cx", function (d, i) { return x(NOMS_MOIS[i]); })
                .attr("cy", function (d) { return yTemp(d.temp); })
                .attr("r", 4)
                .style("fill", COULEUR_V1)
                .style("stroke", "var(--bg-1)")
                .style("stroke-width", "1.5px")
                .on("mouseover", function (d, i) {
                    tooltip.classed("visible", true)
                        .html("<strong>" + nom1 + "</strong><br>" +
                            NOMS_MOIS[i] + " : " + d.temp + "°C<br>" +
                            "Précip. : " + climat1.precipitations[i].precip + " mm")
                        .style("left", (d3.event.clientX + 15) + "px")
                        .style("top", (d3.event.clientY - 10) + "px");
                })
                .on("mouseout", function () { tooltip.classed("visible", false); });

            // Points température ville 2
            svg.selectAll(".clima-dot-v2")
                .data(climat2.temperatures)
                .enter()
                .append("circle")
                .attr("cx", function (d, i) { return x(NOMS_MOIS[i]); })
                .attr("cy", function (d) { return yTemp(d.temp); })
                .attr("r", 4)
                .style("fill", COULEUR_V2)
                .style("stroke", "var(--bg-1)")
                .style("stroke-width", "1.5px")
                .on("mouseover", function (d, i) {
                    tooltip.classed("visible", true)
                        .html("<strong>" + nom2 + "</strong><br>" +
                            NOMS_MOIS[i] + " : " + d.temp + "°C<br>" +
                            "Précip. : " + climat2.precipitations[i].precip + " mm")
                        .style("left", (d3.event.clientX + 15) + "px")
                        .style("top", (d3.event.clientY - 10) + "px");
                })
                .on("mouseout", function () { tooltip.classed("visible", false); });
        }


        // =============================================================
        // 25. REMPLISSAGE DU SÉLECTEUR DE RÉGION
        //     .data() → .enter() → .append("option")
        // =============================================================

        selectRegion.selectAll("option.region-option")
            .data(regions)
            .enter()
            .append("option")
            .attr("class", "region-option")
            .attr("value", function (d, i) { return d; })
            .text(function (d, i) { return d; });

        // Événement change sur le sélecteur
        selectRegion.on("change", function () {
            var regionChoisie = d3.select(this).property("value");
            if (!regionChoisie) return;

            var villesRegion = villesFiltrees.filter(function (d) {
                return d[colRegion] === regionChoisie;
            });
            mettreAJourBarChart(villesRegion);
        });


        // =============================================================
        // =============================================================
        // 26. NOUVELLES SECTIONS (DEMOGRAPHIE, EDUCATION, TRANSPORTS, QUALITE)
        // =============================================================

        // ---- Générateurs de données déterministes ----

        function genererDonneesDemographie(ville) {
            var h = hashCode(ville.COM);
            var pop = ville.PMUN;
            var densite = Math.round(pop / (5 + h % 150));
            var ageGrp = [
                { label: "0–14 ans",  pct: Math.round((15 + h % 7)  * 10) / 10 },
                { label: "15–29 ans", pct: Math.round((17 + h % 8)  * 10) / 10 },
                { label: "30–44 ans", pct: Math.round((19 + h % 6)  * 10) / 10 },
                { label: "45–59 ans", pct: Math.round((20 + h % 5)  * 10) / 10 },
                { label: "60–74 ans", pct: Math.round((14 + h % 6)  * 10) / 10 },
                { label: "75 ans +",  pct: Math.round((8  + h % 4)  * 10) / 10 }
            ];
            var sum = ageGrp.reduce(function(a, b) { return a + b.pct; }, 0);
            ageGrp[2].pct = Math.max(1, Math.round((ageGrp[2].pct + (100 - sum)) * 10) / 10);
            var croissance = Math.round(((h % 16) - 6) * 10) / 10;
            var ageMed = Math.round((36 + (h % 14)) * 10) / 10;
            var pctMoins30 = Math.round((ageGrp[0].pct + ageGrp[1].pct) * 10) / 10;
            var pctPlus60  = Math.round((ageGrp[4].pct + ageGrp[5].pct) * 10) / 10;
            var evolution = [];
            var base = pop;
            for (var yr = 2013; yr <= 2023; yr++) {
                base = Math.round(base * (1 + ((h * yr) % 30 - 12) / 1000));
                evolution.push({ annee: String(yr), pop: base });
            }
            return { densite: densite, ageMed: ageMed, croissance: croissance,
                     pctMoins30: pctMoins30, pctPlus60: pctPlus60,
                     ageGrp: ageGrp, evolution: evolution };
        }

        function genererDonneesEducation(ville) {
            var h = hashCode(ville.COM);
            var pop = ville.PMUN;
            var sup    = pop > 100000 ? 35 + h % 20 : 22 + h % 18;
            var bac    = 15 + h % 10;
            var cap    = 20 + h % 10;
            var brevet = 10 + h % 8;
            var sans   = Math.max(1, 100 - sup - bac - cap - brevet);
            var scolarisation  = Math.round((88 + h % 10) * 10) / 10;
            var etablissements = Math.round(pop / 3500 + 2 + h % 12);
            var lycees         = Math.max(1, Math.round(pop / 30000 + h % 4));
            var universite     = pop > 50000 ? 1 + h % 3 : 0;
            return {
                scolarisation: scolarisation, etablissements: etablissements,
                lycees: lycees, universite: universite,
                pctSup: Math.round(sup * 10) / 10,
                diplomes: [
                    { nom: "BAC+3 et +",   pct: Math.round(sup    * 10) / 10 },
                    { nom: "BAC / BAC+2",  pct: Math.round(bac    * 10) / 10 },
                    { nom: "CAP / BEP",    pct: Math.round(cap    * 10) / 10 },
                    { nom: "Brevet",       pct: Math.round(brevet * 10) / 10 },
                    { nom: "Sans diplôme", pct: Math.round(sans   * 10) / 10 }
                ]
            };
        }

        function genererDonneesTransports(ville) {
            var h = hashCode(ville.COM);
            var pop = ville.PMUN;
            var voiture = pop > 200000 ? 40 + h % 20 : 60 + h % 20;
            var tc      = pop > 200000 ? 25 + h % 15 : 10 + h % 15;
            var velo    = 3 + h % 9;
            var marche  = 8 + h % 10;
            var autres  = Math.max(1, 100 - voiture - tc - velo - marche);
            var scoreTGV  = Math.round((40 + h % 60) * 10) / 10;
            var scoreTC   = Math.round((30 + h % 60) * 10) / 10;
            var scoreVelo = Math.round((20 + h % 60) * 10) / 10;
            var tempsMoyenTrajet = 20 + h % 25;
            return {
                tempsMoyenTrajet: tempsMoyenTrajet,
                scoreTGV: scoreTGV, scoreTC: scoreTC, scoreVelo: scoreVelo,
                modes: [
                    { nom: "Voiture",            pct: Math.round(voiture * 10) / 10 },
                    { nom: "Transports en comm.", pct: Math.round(tc      * 10) / 10 },
                    { nom: "Vélo / trottinette", pct: Math.round(velo    * 10) / 10 },
                    { nom: "À pied",             pct: Math.round(marche  * 10) / 10 },
                    { nom: "Autres",             pct: Math.round(autres  * 10) / 10 }
                ]
            };
        }

        function genererDonneesQualite(ville) {
            var h = hashCode(ville.COM);
            var qualiteAir   = 40 + h % 55;
            var espacesVerts = Math.round((8  + h % 30) * 10) / 10;
            var medecins     = Math.round((6  + h % 8)  * 10) / 10;
            var delinquance  = Math.round((15 + h % 30) * 10) / 10;
            var culture      = Math.round((40 + h % 55) * 10) / 10;
            var sport        = Math.round((30 + h % 65) * 10) / 10;
            return {
                qualiteAir: qualiteAir, espacesVerts: espacesVerts,
                medecins: medecins, delinquance: delinquance,
                culture: culture, sport: sport,
                axes: [
                    { label: "Qualité air",  score: qualiteAir },
                    { label: "Espaces verts",score: Math.min(100, Math.round(espacesVerts * 3)) },
                    { label: "Santé",        score: Math.min(100, Math.round(medecins * 9)) },
                    { label: "Sécurité",     score: Math.max(10, 100 - Math.round(delinquance)) },
                    { label: "Culture",      score: Math.round(culture) },
                    { label: "Sport",        score: Math.round(sport) }
                ]
            };
        }

        // ---- Fonctions de mise à jour ----

        function mettreAJourDemographie() {
            var v1 = selection[0], v2 = selection[1];
            if (!v1 || !v2) return;
            var d1 = genererDonneesDemographie(v1);
            var d2 = genererDonneesDemographie(v2);
            var nom1 = v1[colCommune], nom2 = v2[colCommune];

            d3.select("#demographie-placeholder").style("display", "none");
            d3.select("#demographie-pyramide-section").style("display", "block");
            d3.select("#demographie-evolution-section").style("display", "block");
            d3.select("#demographie-tableau-section").style("display", "block");

            // KPI
            afficherKPI(d3.select("#demographie-kpi"), [
                { icon: "👤", label: "Densité (hab/km²)",     val1: fmt(d1.densite),    val2: fmt(d2.densite) },
                { icon: "📅", label: "Âge médian",             val1: d1.ageMed + " ans", val2: d2.ageMed + " ans" },
                { icon: "🧒", label: "Part des – de 30 ans",  val1: d1.pctMoins30 + " %", val2: d2.pctMoins30 + " %" },
                { icon: "🧓", label: "Part des + de 60 ans",  val1: d1.pctPlus60  + " %", val2: d2.pctPlus60  + " %" }
            ], nom1, nom2);

            // --- Pyramide des âges (barres horizontales groupées) ---
            var pDiv = d3.select("#demographie-pyramide");
            pDiv.selectAll("*").remove();
            var pm = { top: 30, right: 30, bottom: 40, left: 110 };
            var pw = 900 - pm.left - pm.right, ph = 300 - pm.top - pm.bottom;

            var svgP = pDiv.append("svg")
                .attr("width", pw + pm.left + pm.right)
                .attr("height", ph + pm.top + pm.bottom)
                .append("g").attr("transform", "translate(" + pm.left + "," + pm.top + ")");

            var yP = d3.scaleBand()
                .domain(d1.ageGrp.map(function(d) { return d.label; }))
                .range([0, ph]).padding(0.3);
            var xP = d3.scaleLinear()
                .domain([0, d3.max(d1.ageGrp.concat(d2.ageGrp), function(d) { return d.pct; }) * 1.2])
                .range([0, pw]);

            svgP.append("g").attr("class", "axis").call(d3.axisLeft(yP));
            svgP.append("g").attr("class", "axis")
                .attr("transform", "translate(0," + ph + ")")
                .call(d3.axisBottom(xP).ticks(5).tickFormat(function(d) { return d + "%"; }));

            // Légende
            svgP.append("circle").attr("cx", pw / 2 - 100).attr("cy", -15).attr("r", 5).style("fill", COULEUR_V1);
            svgP.append("text").attr("x", pw / 2 - 90).attr("y", -11).style("fill", "var(--text-0)").style("font-size", "12px").text(nom1);
            svgP.append("circle").attr("cx", pw / 2 + 40).attr("cy", -15).attr("r", 5).style("fill", COULEUR_V2);
            svgP.append("text").attr("x", pw / 2 + 50).attr("y", -11).style("fill", "var(--text-0)").style("font-size", "12px").text(nom2);

            // Barres ville 1
            svgP.selectAll(".bar-pyr-v1")
                .data(d1.ageGrp).enter().append("rect")
                .attr("class", "chart-interactive bar-pyr-v1")
                .attr("y", function(d) { return yP(d.label); })
                .attr("height", yP.bandwidth() / 2 - 1)
                .attr("x", 0).attr("width", 0).attr("rx", 3)
                .style("fill", COULEUR_V1).style("opacity", 0.85)
                .on("mouseover", function(d) { if (tooltipPinned) return; tooltip.classed("visible", true).html("<strong>" + nom1 + "</strong><br>" + d.label + " : " + d.pct + "%").style("left", (d3.event.clientX + 15) + "px").style("top", (d3.event.clientY - 10) + "px"); })
                .on("mouseout",  function()  { if (tooltipPinned) return; tooltip.classed("visible", false); })
                .on("click", function(d) { d3.event.stopPropagation(); if (d3.select(this).classed("chart-selected")) { clearPinnedTooltip(); return; } applyChartSelection(this); showPinnedTooltip("<strong>" + nom1 + "</strong><br>" + d.label + " : " + d.pct + "%", d3.event.clientX, d3.event.clientY); })
                .transition().duration(600)
                .attr("width", function(d) { return xP(d.pct); });

            // Barres ville 2
            svgP.selectAll(".bar-pyr-v2")
                .data(d2.ageGrp).enter().append("rect")
                .attr("class", "chart-interactive bar-pyr-v2")
                .attr("y", function(d) { return yP(d.label) + yP.bandwidth() / 2 + 1; })
                .attr("height", yP.bandwidth() / 2 - 1)
                .attr("x", 0).attr("width", 0).attr("rx", 3)
                .style("fill", COULEUR_V2).style("opacity", 0.85)
                .on("mouseover", function(d) { if (tooltipPinned) return; tooltip.classed("visible", true).html("<strong>" + nom2 + "</strong><br>" + d.label + " : " + d.pct + "%").style("left", (d3.event.clientX + 15) + "px").style("top", (d3.event.clientY - 10) + "px"); })
                .on("mouseout",  function()  { if (tooltipPinned) return; tooltip.classed("visible", false); })
                .on("click", function(d) { d3.event.stopPropagation(); if (d3.select(this).classed("chart-selected")) { clearPinnedTooltip(); return; } applyChartSelection(this); showPinnedTooltip("<strong>" + nom2 + "</strong><br>" + d.label + " : " + d.pct + "%", d3.event.clientX, d3.event.clientY); })
                .transition().duration(600)
                .attr("width", function(d) { return xP(d.pct); });

            // --- Courbe d'évolution de population ---
            var eDiv = d3.select("#demographie-evolution");
            eDiv.selectAll("*").remove();
            var em = { top: 30, right: 30, bottom: 40, left: 80 };
            var ew = 900 - em.left - em.right, eh = 260 - em.top - em.bottom;

            var svgE = eDiv.append("svg")
                .attr("width", ew + em.left + em.right)
                .attr("height", eh + em.top + em.bottom)
                .append("g").attr("transform", "translate(" + em.left + "," + em.top + ")");

            var xE = d3.scalePoint()
                .domain(d1.evolution.map(function(d) { return d.annee; }))
                .range([0, ew]);
            var allPop = d1.evolution.map(function(d) { return d.pop; }).concat(d2.evolution.map(function(d) { return d.pop; }));
            var yE = d3.scaleLinear()
                .domain([d3.min(allPop) * 0.95, d3.max(allPop) * 1.05])
                .range([eh, 0]);

            svgE.append("g").attr("class", "axis").attr("transform", "translate(0," + eh + ")")
                .call(d3.axisBottom(xE).tickValues(d1.evolution.filter(function(d, i) { return i % 2 === 0; }).map(function(d) { return d.annee; })));
            svgE.append("g").attr("class", "axis")
                .call(d3.axisLeft(yE).ticks(5).tickFormat(function(d) { return (d / 1000).toFixed(0) + "k"; }));

            // Légende
            svgE.append("circle").attr("cx", ew / 2 - 100).attr("cy", -15).attr("r", 5).style("fill", COULEUR_V1);
            svgE.append("text").attr("x", ew / 2 - 90).attr("y", -11).style("fill", "var(--text-0)").style("font-size", "12px").text(nom1);
            svgE.append("circle").attr("cx", ew / 2 + 40).attr("cy", -15).attr("r", 5).style("fill", COULEUR_V2);
            svgE.append("text").attr("x", ew / 2 + 50).attr("y", -11).style("fill", "var(--text-0)").style("font-size", "12px").text(nom2);

            var lineGen = d3.line().x(function(d) { return xE(d.annee); }).y(function(d) { return yE(d.pop); }).curve(d3.curveCatmullRom);
            svgE.append("path").datum(d1.evolution).attr("fill", "none").attr("stroke", COULEUR_V1).attr("stroke-width", 2.5).attr("d", lineGen);
            svgE.append("path").datum(d2.evolution).attr("fill", "none").attr("stroke", COULEUR_V2).attr("stroke-width", 2.5).attr("d", lineGen);

            svgE.selectAll(".dot-ev1").data(d1.evolution).enter().append("circle")
                .attr("class", "chart-interactive dot-ev1")
                .attr("cx", function(d) { return xE(d.annee); }).attr("cy", function(d) { return yE(d.pop); }).attr("r", 4)
                .style("fill", COULEUR_V1)
                .on("mouseover", function(d) { if (tooltipPinned) return; tooltip.classed("visible", true).html("<strong>" + nom1 + "</strong><br>" + d.annee + " : " + fmt(d.pop) + " hab.").style("left", (d3.event.clientX + 15) + "px").style("top", (d3.event.clientY - 10) + "px"); })
                .on("mouseout",  function()  { if (tooltipPinned) return; tooltip.classed("visible", false); })
                .on("click", function(d) { d3.event.stopPropagation(); if (d3.select(this).classed("chart-selected")) { clearPinnedTooltip(); return; } applyChartSelection(this); showPinnedTooltip("<strong>" + nom1 + "</strong><br>" + d.annee + " : " + fmt(d.pop) + " hab.", d3.event.clientX, d3.event.clientY); });

            svgE.selectAll(".dot-ev2").data(d2.evolution).enter().append("circle")
                .attr("class", "chart-interactive dot-ev2")
                .attr("cx", function(d) { return xE(d.annee); }).attr("cy", function(d) { return yE(d.pop); }).attr("r", 4)
                .style("fill", COULEUR_V2)
                .on("mouseover", function(d) { if (tooltipPinned) return; tooltip.classed("visible", true).html("<strong>" + nom2 + "</strong><br>" + d.annee + " : " + fmt(d.pop) + " hab.").style("left", (d3.event.clientX + 15) + "px").style("top", (d3.event.clientY - 10) + "px"); })
                .on("mouseout",  function()  { if (tooltipPinned) return; tooltip.classed("visible", false); })
                .on("click", function(d) { d3.event.stopPropagation(); if (d3.select(this).classed("chart-selected")) { clearPinnedTooltip(); return; } applyChartSelection(this); showPinnedTooltip("<strong>" + nom2 + "</strong><br>" + d.annee + " : " + fmt(d.pop) + " hab.", d3.event.clientX, d3.event.clientY); });

            // --- Tableau comparatif ---
            var tDiv = d3.select("#demographie-tableau");
            tDiv.selectAll("*").remove();
            var lignes = [
                ["Population totale",           fmt(v1.PMUN) + " hab.",                             fmt(v2.PMUN) + " hab."],
                ["Densité",                      fmt(d1.densite) + " hab/km²",                       fmt(d2.densite) + " hab/km²"],
                ["Âge médian",                  d1.ageMed + " ans",                                  d2.ageMed + " ans"],
                ["Part des – 30 ans",            d1.pctMoins30 + " %",                               d2.pctMoins30 + " %"],
                ["Part des + 60 ans",            d1.pctPlus60  + " %",                               d2.pctPlus60  + " %"],
                ["Croissance estimée (10 ans)", (d1.croissance >= 0 ? "+" : "") + d1.croissance + " %", (d2.croissance >= 0 ? "+" : "") + d2.croissance + " %"]
            ];
            var tbl = tDiv.append("table").attr("class", "data-table").style("width", "100%");
            var thead = tbl.append("thead").append("tr");
            thead.append("th").text("Indicateur");
            thead.append("th").html('<span style="color:' + COULEUR_V1 + '">⬤</span> ' + nom1);
            thead.append("th").html('<span style="color:' + COULEUR_V2 + '">⬤</span> ' + nom2);
            var tbody = tbl.append("tbody");
            lignes.forEach(function(r) {
                var tr = tbody.append("tr");
                r.forEach(function(c) { tr.append("td").text(c); });
            });
        }

        function mettreAJourEducation() {
            var v1 = selection[0], v2 = selection[1];
            if (!v1 || !v2) return;
            var e1 = genererDonneesEducation(v1);
            var e2 = genererDonneesEducation(v2);
            var nom1 = v1[colCommune], nom2 = v2[colCommune];

            d3.select("#education-placeholder").style("display", "none");
            d3.select("#education-diplomes-section").style("display", "block");
            d3.select("#education-bar-section").style("display", "block");

            afficherKPI(d3.select("#education-kpi"), [
                { icon: "🎓", label: "Part enseignement supérieur", val1: e1.pctSup + " %",       val2: e2.pctSup + " %" },
                { icon: "📚", label: "Taux de scolarisation",       val1: e1.scolarisation + " %", val2: e2.scolarisation + " %" },
                { icon: "🏫", label: "Établissements scolaires",    val1: fmt(e1.etablissements),  val2: fmt(e2.etablissements) },
                { icon: "🏛️", label: "Sites universitaires",        val1: e1.universite === 0 ? "Aucun" : String(e1.universite), val2: e2.universite === 0 ? "Aucun" : String(e2.universite) }
            ], nom1, nom2);

            // Donuts répartition des diplômes
            var diplDiv = d3.select("#education-diplomes");
            diplDiv.selectAll("*").remove();
            dessinerDonut(diplDiv.append("div"), e1.diplomes, 450, 320, nom1);
            dessinerDonut(diplDiv.append("div"), e2.diplomes, 450, 320, nom2);

            // Bar chart comparatif indicateurs éducatifs
            dessinerBarChartComparatif(
                d3.select("#education-bar"),
                [
                    { label: "Supérieur (%)",    v1: e1.pctSup,         v2: e2.pctSup },
                    { label: "Scolarisation (%)", v1: e1.scolarisation,  v2: e2.scolarisation },
                    { label: "Établissements",    v1: e1.etablissements, v2: e2.etablissements },
                    { label: "Lycées",            v1: e1.lycees,         v2: e2.lycees }
                ],
                nom1, nom2
            );
        }

        function mettreAJourTransports() {
            var v1 = selection[0], v2 = selection[1];
            if (!v1 || !v2) return;
            var t1 = genererDonneesTransports(v1);
            var t2 = genererDonneesTransports(v2);
            var nom1 = v1[colCommune], nom2 = v2[colCommune];

            d3.select("#transports-placeholder").style("display", "none");
            d3.select("#transports-modes-section").style("display", "block");
            d3.select("#transports-bar-section").style("display", "block");

            afficherKPI(d3.select("#transports-kpi"), [
                { icon: "🚗", label: "Usage voiture (%)",        val1: t1.modes[0].pct + " %",     val2: t2.modes[0].pct + " %" },
                { icon: "🚌", label: "Transports en comm. (%)",  val1: t1.modes[1].pct + " %",     val2: t2.modes[1].pct + " %" },
                { icon: "⏱️", label: "Trajet moyen (min)",       val1: t1.tempsMoyenTrajet + " min", val2: t2.tempsMoyenTrajet + " min" },
                { icon: "🚅", label: "Score accès TGV / Train",  val1: t1.scoreTGV + " /100",      val2: t2.scoreTGV + " /100" }
            ], nom1, nom2);

            // Donuts modes de déplacement
            var modesDiv = d3.select("#transports-modes");
            modesDiv.selectAll("*").remove();
            dessinerDonut(modesDiv.append("div"), t1.modes, 450, 320, nom1);
            dessinerDonut(modesDiv.append("div"), t2.modes, 450, 320, nom2);

            // Bar chart scores d'accessibilité
            dessinerBarChartComparatif(
                d3.select("#transports-bar"),
                [
                    { label: "Score TGV",   v1: t1.scoreTGV,  v2: t2.scoreTGV },
                    { label: "Score TC",    v1: t1.scoreTC,   v2: t2.scoreTC },
                    { label: "Score Vélo",  v1: t1.scoreVelo, v2: t2.scoreVelo }
                ],
                nom1, nom2
            );
        }

        function mettreAJourQualite() {
            var v1 = selection[0], v2 = selection[1];
            if (!v1 || !v2) return;
            var q1 = genererDonneesQualite(v1);
            var q2 = genererDonneesQualite(v2);
            var nom1 = v1[colCommune], nom2 = v2[colCommune];

            d3.select("#qualite-placeholder").style("display", "none");
            d3.select("#qualite-radar-section").style("display", "block");
            d3.select("#qualite-bar-section").style("display", "block");

            afficherKPI(d3.select("#qualite-kpi"), [
                { icon: "🌬️", label: "Qualité de l'air (0–100)",   val1: q1.qualiteAir + " /100",   val2: q2.qualiteAir + " /100" },
                { icon: "🌳", label: "Espaces verts (m²/hab)",     val1: q1.espacesVerts + " m²",   val2: q2.espacesVerts + " m²" },
                { icon: "⚕️",  label: "Médecins (/ 1 000 hab)",    val1: String(q1.medecins),        val2: String(q2.medecins) },
                { icon: "🛡️", label: "Indice délinquance (/100)",  val1: String(q1.delinquance),     val2: String(q2.delinquance) }
            ], nom1, nom2);

            // --- Radar chart toile d'araignée ---
            var rDiv = d3.select("#qualite-radar");
            rDiv.selectAll("*").remove();

            var W = 900, H = 420;
            var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 70;
            var axes = q1.axes;
            var n = axes.length;
            var angleSlice = Math.PI * 2 / n;
            var rMax = 100;
            var rScale = d3.scaleLinear().domain([0, rMax]).range([0, R]);

            var svgR = rDiv.append("svg").attr("width", W).attr("height", H);
            var g = svgR.append("g").attr("transform", "translate(" + cx + "," + cy + ")");

            // Grilles concentriques
            var levels = 5;
            for (var lv = 1; lv <= levels; lv++) {
                var rLv = R * lv / levels;
                g.append("circle").attr("cx", 0).attr("cy", 0).attr("r", rLv)
                    .style("fill", "none").style("stroke", "var(--border)").style("stroke-width", "0.8").style("opacity", "0.6");
                if (lv < levels) {
                    g.append("text").attr("x", 4).attr("y", -rLv + 4)
                        .style("fill", "var(--text-2)").style("font-size", "9px")
                        .text(Math.round(rMax * lv / levels));
                }
            }

            // Axes radiaux + étiquettes
            axes.forEach(function(ax, i) {
                var angle = angleSlice * i - Math.PI / 2;
                var xEnd = R * Math.cos(angle);
                var yEnd = R * Math.sin(angle);
                g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", xEnd).attr("y2", yEnd)
                    .style("stroke", "var(--border)").style("stroke-width", "1");
                var labelR = R + 24;
                g.append("text")
                    .attr("x", labelR * Math.cos(angle))
                    .attr("y", labelR * Math.sin(angle))
                    .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
                    .style("fill", "var(--text-1)").style("font-size", "11px")
                    .text(ax.label);
            });

            function toPolygon(donnees) {
                return donnees.map(function(d, i) {
                    var angle = angleSlice * i - Math.PI / 2;
                    return [rScale(d.score) * Math.cos(angle), rScale(d.score) * Math.sin(angle)];
                });
            }

            function coordsPath(coords) {
                return coords.map(function(c, i) { return (i === 0 ? "M" : "L") + c[0] + "," + c[1]; }).join(" ") + " Z";
            }

            var coords1 = toPolygon(q1.axes);
            var coords2 = toPolygon(q2.axes);

            g.append("path").attr("d", coordsPath(coords1))
                .style("fill", COULEUR_V1).style("fill-opacity", "0.25")
                .style("stroke", COULEUR_V1).style("stroke-width", "2");
            g.append("path").attr("d", coordsPath(coords2))
                .style("fill", COULEUR_V2).style("fill-opacity", "0.25")
                .style("stroke", COULEUR_V2).style("stroke-width", "2");

            // Points interactifs ville 1
            coords1.forEach(function(c, i) {
                g.append("circle").attr("cx", c[0]).attr("cy", c[1]).attr("r", 5)
                    .attr("class", "chart-interactive").style("fill", COULEUR_V1)
                    .on("mouseover", function() { if (tooltipPinned) return; tooltip.classed("visible", true).html("<strong>" + nom1 + "</strong><br>" + q1.axes[i].label + " : " + q1.axes[i].score + " /100").style("left", (d3.event.clientX + 15) + "px").style("top", (d3.event.clientY - 10) + "px"); })
                    .on("mouseout",  function() { if (tooltipPinned) return; tooltip.classed("visible", false); })
                    .on("click", function() { d3.event.stopPropagation(); if (d3.select(this).classed("chart-selected")) { clearPinnedTooltip(); return; } applyChartSelection(this); showPinnedTooltip("<strong>" + nom1 + "</strong><br>" + q1.axes[i].label + " : " + q1.axes[i].score + " /100", d3.event.clientX, d3.event.clientY); });
            });

            // Points interactifs ville 2
            coords2.forEach(function(c, i) {
                g.append("circle").attr("cx", c[0]).attr("cy", c[1]).attr("r", 5)
                    .attr("class", "chart-interactive").style("fill", COULEUR_V2)
                    .on("mouseover", function() { if (tooltipPinned) return; tooltip.classed("visible", true).html("<strong>" + nom2 + "</strong><br>" + q2.axes[i].label + " : " + q2.axes[i].score + " /100").style("left", (d3.event.clientX + 15) + "px").style("top", (d3.event.clientY - 10) + "px"); })
                    .on("mouseout",  function() { if (tooltipPinned) return; tooltip.classed("visible", false); })
                    .on("click", function() { d3.event.stopPropagation(); if (d3.select(this).classed("chart-selected")) { clearPinnedTooltip(); return; } applyChartSelection(this); showPinnedTooltip("<strong>" + nom2 + "</strong><br>" + q2.axes[i].label + " : " + q2.axes[i].score + " /100", d3.event.clientX, d3.event.clientY); });
            });

            // Légende radar
            g.append("circle").attr("cx", -R + 10).attr("cy", R + 28).attr("r", 5).style("fill", COULEUR_V1);
            g.append("text").attr("x", -R + 20).attr("y", R + 32).style("fill", "var(--text-0)").style("font-size", "12px").text(nom1);
            g.append("circle").attr("cx", -R + 10).attr("cy", R + 46).attr("r", 5).style("fill", COULEUR_V2);
            g.append("text").attr("x", -R + 20).attr("y", R + 50).style("fill", "var(--text-0)").style("font-size", "12px").text(nom2);

            // Bar chart indicateurs qualité de vie
            dessinerBarChartComparatif(
                d3.select("#qualite-bar"),
                [
                    { label: "Qualité air",    v1: q1.qualiteAir,   v2: q2.qualiteAir },
                    { label: "Espaces verts",  v1: q1.espacesVerts, v2: q2.espacesVerts },
                    { label: "Culture",        v1: q1.culture,      v2: q2.culture },
                    { label: "Sport",          v1: q1.sport,        v2: q2.sport }
                ],
                nom1, nom2
            );
        }

        // =============================================================
        // 26. INITIALISATION — AFFICHAGE PAR DÉFAUT
        // =============================================================

        if (regions.length > 0) {
            selectRegion.property("value", regions[0]);
            var villesInitiales = villesFiltrees.filter(function (d) {
                return d[colRegion] === regions[0];
            });
            mettreAJourBarChart(villesInitiales);
        }

        console.log("🚀 GeoVilles Explorer initialisé avec succès !");

    }); // Fin du callback d3.queue().await()
