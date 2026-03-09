#!/bin/bash
# GeoVilles-Explorer — Branche collaborative (Mathieu)

## Installation

### Prérequis
- Python 3.7+ (pour serveur local)
- Git
- Navigateur moderne (Chrome, Firefox, Safari, Edge)

### Setup local

```bash
git clone https://github.com/jeremypiton/GeoVilles-Explorer.git
cd GeoVilles-Explorer/mathieu
python -m http.server 8080
```

Ouvrir : **http://localhost:8080**

---

## 📊 Fonctionnalités

- **Cartographie interactive** — Sélectionnez des villes, comparaison visuelle
- **Comparaison de population** — Bar charts, classements régionaux
- **Données emploi** — KPI, répartition sectorielle (donut charts)
- **Parc logement** — Types, statut d'occupation
- **Météo en temps réel** — Prévisions 7 jours, climat mensuel (Open-Meteo)
- **Design Bento UI** — Dark mode premium, responsive mobile

---

## 🎨 Design & Stack

- **D3.js v4.1.1** — Visualisations données
- **Vanilla JS/CSS** — Pas de frameworks
- **CSS Variables** — Thème zinc personnalisable
- **Google Fonts** — Inter + JetBrains Mono

---

## 📈 Sources Données

| Source | Données | Format |
|--------|---------|--------|
| **INSEE** | Communes 20k+ habitants, population | CSV semicolon |
| **API Géo** | Coordonnées géographiques | JSON REST |
| **Open-Meteo** | Météo actuelle, prévisions | JSON API libre |
| **GeoJSON** | Contours France métropolitaine | GitHub |

---

## 🏗️ Structure

```
.
├── index.html           # Page principale (Bento UI)
├── style.css            # Design system zinc
├── script.js            # D3.js app (1850+ lignes)
├── donnees_communes.csv # INSEE data (~34k communes)
├── README.md            # Doc projet
├── .gitignore
└── vercel.json          # Config Vercel
```

---

## ⌨️ Raccourcis

| Raccourci | Action |
|-----------|--------|
| `Ctrl+K` / `⌘K` | Focus recherche ville |
| Clic carte | Sélectionner ville 1 / 2 |
| Menu mobile | Clic hamburger (≤1024px) |

---

## 👥 Collaborateurs

- **Jeremy Piton** — Architecture, données
- **Mathieu** — Design UI/UX, intégration

---

## 📝 Licence

Projet académique — BUT Science des Données S4

---

## 🚀 Déploiement

### Vercel

```bash
npm i -g vercel
vercel
```

Lien auto : https://geovilles-explorer-mathieu.vercel.app

### Alternative: GitHub Pages

Repo settings → Pages → Deploy from branch `main` / `/root`

---

*Dernière mise à jour : 12 février 2026*
