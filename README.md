# 🏛️ Système de Gestion des Demandes Administratives

> Application web complète pour la gestion des demandes administratives d'une commune.  
> Projet académique — Master 1 EII 2026 — Antananarivo, Madagascar

---

## 📋 Description

Ce projet est une plateforme web permettant aux citoyens de soumettre leurs demandes administratives en ligne (certificat de résidence, acte de naissance, légalisation de documents, etc.) et aux administrateurs de les gérer efficacement.

---

## ✨ Fonctionnalités

### Côté citoyen (utilisateur)
- ✅ Inscription et connexion sécurisée
- ✅ Création de demandes administratives
- ✅ Suivi du statut des demandes en temps réel
- ✅ Modification et suppression de ses demandes
- ✅ Recherche et filtrage par type ou statut
- ✅ Impression d'une demande en PDF
- ✅ Gestion du profil (modifier nom, changer mot de passe)
- ✅ Tableau de bord avec statistiques personnelles

### Côté administrateur
- ✅ Vue de toutes les demandes de tous les utilisateurs
- ✅ Changement de statut (En attente → En cours → Terminée → Refusée)
- ✅ Recherche et filtrage global
- ✅ Statistiques globales du système

---

## 🛠️ Technologies utilisées

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML5 · CSS3 · JavaScript vanilla |
| Backend | Node.js · Express.js |
| Base de données | MySQL (via phpMyAdmin / XAMPP) |
| Communication | API REST · Fetch API |
| Authentification | localStorage (session côté client) |
| Versioning | Git · GitHub |

---

## 📁 Structure du projet

```
institution-public-site/
│
├── frontend/
│   ├── index.html        → Page d'accueil
│   ├── login.html        → Connexion
│   ├── register.html     → Inscription
│   ├── dashboard.html    → Tableau de bord utilisateur
│   ├── demande.html      → Formulaire nouvelle demande
│   ├── profil.html       → Gestion du profil
│   ├── admin.html        → Interface administrateur
│   ├── script.js         → Logique JavaScript (toutes les pages)
│   └── style.css         → Styles CSS communs
│
├── backend/
│   └── server.js         → Serveur Express + toutes les routes API
│
├── database/
│   └── schema.sql        → Structure de la base de données MySQL
│
└── package.json          → Dépendances Node.js
```

---

## 🗄️ Base de données

### Table `users`
| Champ | Type | Description |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identifiant unique |
| nom | VARCHAR(100) | Nom complet |
| email | VARCHAR(100) UNIQUE | Adresse email |
| password | VARCHAR(255) | Mot de passe |
| is_admin | TINYINT(1) | 0 = citoyen, 1 = admin |

### Table `demandes`
| Champ | Type | Description |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identifiant unique |
| user_id | INT | Référence utilisateur (FK) |
| titre | VARCHAR(255) | Type de demande |
| description | TEXT | Description détaillée |
| statut | VARCHAR(50) | En attente / En cours / Terminée / Refusée |
| created_at | TIMESTAMP | Date de création |

---

## 🚀 Installation et lancement

### Prérequis
- [Node.js](https://nodejs.org/) v18+
- [XAMPP](https://www.apachefriends.org/) (Apache + MySQL)
- Navigateur web moderne

### Étapes

**1. Cloner le projet**
```bash
git clone https://github.com/Andrianasolofacrino-ops/institution-public-site.git
cd institution-public-site
```

**2. Installer les dépendances**
```bash
npm install
```

**3. Créer la base de données**
- Démarrer XAMPP (Apache + MySQL)
- Ouvrir `http://localhost:8080/phpmyadmin`
- Importer le fichier `database/schema.sql`

**4. Lancer le serveur**
```bash
cd backend
node server.js
```

**5. Ouvrir le site**
```
Ouvrir frontend/index.html dans le navigateur
```

---

## 🔌 Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/register` | Inscription utilisateur |
| POST | `/login` | Connexion utilisateur |
| GET | `/users/:id` | Voir profil |
| PUT | `/users/:id` | Modifier nom |
| PUT | `/users/:id/password` | Changer mot de passe |
| GET | `/demandes?userId=X` | Demandes d'un utilisateur |
| POST | `/demandes` | Créer une demande |
| PUT | `/demandes/:id` | Modifier une demande |
| DELETE | `/demandes/:id` | Supprimer une demande |
| GET | `/admin/demandes` | Toutes les demandes (admin) |
| PUT | `/admin/demandes/:id/statut` | Changer statut (admin) |

---

## 👤 Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Administrateur | andrianasolo.facrino@gmail.com | votre_mdp |
| Citoyen | créer via /register | au choix |

---

## 📸 Aperçu

| Page | Description |
|------|-------------|
| Accueil | Portail avec boutons connexion/inscription |
| Dashboard | Statistiques + liste demandes + filtres |
| Admin | Tableau complet de toutes les demandes |
| Profil | Modifier nom et mot de passe |

---

## 📚 Livrables académiques

- **Phase 1** : Cahier des charges · User Stories · User Flow
- **Phase 2** : MCD · Diagramme relationnel · Wireframe · Maquette UI
- **Phase 3** : Code complet (ce repository)
- **Phase 4** : Tests manuels · Déploiement

---

## 👨‍💻 Auteur

**Théogène Facrino — MAKA GR**  
Étudiant Master 1 — Génie Informatique et Intelligence Artificielle  
Antananarivo, Madagascar · 2026

---

## 📄 Licence

Projet académique — usage éducatif uniquement.
