// ═══════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════
const API = "http://localhost:3000";
const PAR_PAGE = 5;

// Variables globales
let toutesLesDemandes = [];
let demandesFiltrees  = [];
let pageActuelle      = 1;
let demandeDetailCourante = null;

// ═══════════════════════════════════════════════════════
//  INITIALISATION — détection de page
// ═══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    const page   = window.location.pathname;
    const userId = localStorage.getItem("userId");
    const nom    = localStorage.getItem("nom");

    // Protection : toutes les pages sauf login/register/index
    const pagesPubliques = ["login.html", "register.html", "index.html"];
    const estPublique    = pagesPubliques.some(p => page.includes(p));

    if (!estPublique && !userId) {
        window.location.href = "login.html";
        return;
    }

    // Afficher nom partout
    const nomEl = document.getElementById("nomUtilisateur");
    if (nomEl) nomEl.textContent = nom || "Utilisateur";

    // Initialiser selon la page
    if (page.includes("dashboard.html")) {
        chargerDemandes();
    }
    if (page.includes("admin.html")) {
        verifierAdmin();
        chargerToutesLesDemandes();
    }
    if (page.includes("profil.html")) {
        chargerProfil();
    }
});

// ═══════════════════════════════════════════════════════
//  INSCRIPTION
// ═══════════════════════════════════════════════════════
function registerUser(event) {
    event.preventDefault();

    const nom      = document.getElementById("nom").value.trim();
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!nom || !email || !password) {
        afficherMessage("msgRegister", "Veuillez remplir tous les champs", "erreur");
        return;
    }
    if (password.length < 4) {
        afficherMessage("msgRegister", "Le mot de passe doit avoir au moins 4 caractères", "erreur");
        return;
    }

    fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message === "Inscription réussie !") {
            afficherMessage("msgRegister", "Inscription réussie ! Redirection...", "succes");
            setTimeout(() => window.location.href = "login.html", 1500);
        } else {
            afficherMessage("msgRegister", data.message, "erreur");
        }
    })
    .catch(() => afficherMessage("msgRegister", "Erreur de connexion au serveur", "erreur"));
}

// ═══════════════════════════════════════════════════════
//  CONNEXION
// ═══════════════════════════════════════════════════════
function loginUser(event) {
    event.preventDefault();

    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        afficherMessage("msgLogin", "Veuillez remplir tous les champs", "erreur");
        return;
    }

    const btn = event.target.querySelector("button[type='submit']");
    btn.textContent = "Connexion...";
    btn.disabled    = true;

    fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        btn.textContent = "Se connecter";
        btn.disabled    = false;

        if (data.userId) {
            localStorage.setItem("userId",  data.userId);
            localStorage.setItem("nom",     data.nom);
            localStorage.setItem("isAdmin", data.isAdmin || false);
            window.location.href = "dashboard.html";
        } else {
            afficherMessage("msgLogin", data.message || "Identifiants incorrects", "erreur");
        }
    })
    .catch(() => {
        btn.textContent = "Se connecter";
        btn.disabled    = false;
        afficherMessage("msgLogin", "Impossible de contacter le serveur", "erreur");
    });
}

// ═══════════════════════════════════════════════════════
//  ENVOYER UNE DEMANDE
// ═══════════════════════════════════════════════════════
function envoyerDemande(event) {
    event.preventDefault();

    const userId      = localStorage.getItem("userId");
    const titre       = document.getElementById("type").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!userId) { window.location.href = "login.html"; return; }
    if (!titre)  { afficherMessage("msgDemande", "Veuillez choisir un type", "erreur"); return; }
    if (!description) { afficherMessage("msgDemande", "Veuillez décrire votre demande", "erreur"); return; }

    const btn = event.target.querySelector("button[type='submit']");
    btn.textContent = "Envoi en cours...";
    btn.disabled    = true;

    fetch(`${API}/demandes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, titre, description })
    })
    .then(res => res.json())
    .then(data => {
        btn.textContent = "Envoyer la demande";
        btn.disabled    = false;
        afficherMessage("msgDemande", "Demande envoyée avec succès !", "succes");
        document.getElementById("type").value        = "";
        document.getElementById("description").value = "";
        setTimeout(() => window.location.href = "dashboard.html", 1800);
    })
    .catch(() => {
        btn.textContent = "Envoyer la demande";
        btn.disabled    = false;
        afficherMessage("msgDemande", "Erreur lors de l'envoi", "erreur");
    });
}

// ═══════════════════════════════════════════════════════
//  CHARGER LES DEMANDES (utilisateur connecté)
// ═══════════════════════════════════════════════════════
function chargerDemandes() {
    const userId    = localStorage.getItem("userId");
    const container = document.getElementById("listeDemandes");
    if (!container) return;

    container.innerHTML = "<p class='chargement-msg'>Chargement...</p>";

    fetch(`${API}/demandes?userId=${userId}`)
    .then(res => {
        if (!res.ok) throw new Error("Erreur serveur");
        return res.json();
    })
    .then(data => {
        toutesLesDemandes = data;
        demandesFiltrees  = data;
        mettreAJourStats(data);
        pageActuelle = 1;
        afficherPage();
    })
    .catch(() => {
        container.innerHTML = `
            <div class="erreur-connexion">
                <p>Impossible de contacter le serveur.</p>
                <p>Vérifiez que <strong>node server.js</strong> est lancé.</p>
                <button class="btn-modifier" onclick="chargerDemandes()">Réessayer</button>
            </div>`;
    });
}

// ═══════════════════════════════════════════════════════
//  STATISTIQUES
// ═══════════════════════════════════════════════════════
function mettreAJourStats(demandes) {
    const total   = demandes.length;
    const attente = demandes.filter(d => d.statut === "En attente").length;
    const encours = demandes.filter(d => d.statut === "En cours").length;
    const termine = demandes.filter(d => d.statut === "Terminée").length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("statTotal",   total);
    set("statAttente", attente);
    set("statEncours", encours);
    set("statTermine", termine);
}

// ═══════════════════════════════════════════════════════
//  FILTRES ET RECHERCHE
// ═══════════════════════════════════════════════════════
function filtrerDemandes() {
    const search = (document.getElementById("searchInput")?.value || "").toLowerCase();
    const statut = document.getElementById("filtreStatut")?.value || "";
    const type   = document.getElementById("filtreType")?.value   || "";

    demandesFiltrees = toutesLesDemandes.filter(d => {
        const matchSearch = d.titre.toLowerCase().includes(search) ||
                            d.description.toLowerCase().includes(search);
        const matchStatut = !statut || d.statut === statut;
        const matchType   = !type   || d.titre  === type;
        return matchSearch && matchStatut && matchType;
    });

    pageActuelle = 1;
    afficherPage();
}

function resetFiltres() {
    const s = document.getElementById("searchInput");
    const f = document.getElementById("filtreStatut");
    const t = document.getElementById("filtreType");
    if (s) s.value = "";
    if (f) f.value = "";
    if (t) t.value = "";
    demandesFiltrees = toutesLesDemandes;
    pageActuelle     = 1;
    afficherPage();
}

// ═══════════════════════════════════════════════════════
//  AFFICHAGE PAGINÉ
// ═══════════════════════════════════════════════════════
function afficherPage() {
    const container = document.getElementById("listeDemandes");
    if (!container) return;

    container.innerHTML = "";

    if (demandesFiltrees.length === 0) {
        container.innerHTML = `
            <div class="vide">
                <p>Aucune demande trouvée.</p>
                <a href="demande.html">Créer une demande</a>
            </div>`;
        document.getElementById("pagination").innerHTML = "";
        return;
    }

    const debut = (pageActuelle - 1) * PAR_PAGE;
    const fin   = debut + PAR_PAGE;
    const page  = demandesFiltrees.slice(debut, fin);

    page.forEach(d => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
            <div class="card-header">
                <h3>${echapper(d.titre)}</h3>
                <span class="badge ${badgeClass(d.statut)}">${d.statut}</span>
            </div>
            <p class="card-desc">${echapper(d.description)}</p>
            <small class="card-date">Créée le : ${formaterDate(d.created_at)}</small>
            <div class="card-actions">
                <button class="btn-voir"
                    onclick="ouvrirDetail(${d.id})">Voir</button>
                <button class="btn-modifier"
                    onclick="ouvrirModification(${d.id}, '${echapperAttr(d.titre)}', '${echapperAttr(d.description)}')">Modifier</button>
                <button class="btn-supprimer"
                    onclick="supprimerDemande(${d.id})">Supprimer</button>
                <button class="btn-imprimer-inline"
                    onclick="imprimerDemandeDirecte(${d.id})">Imprimer</button>
            </div>
        `;
        container.appendChild(div);
    });

    afficherPagination();
}

function afficherPagination() {
    const totalPages = Math.ceil(demandesFiltrees.length / PAR_PAGE);
    const pag        = document.getElementById("pagination");
    if (!pag || totalPages <= 1) { if (pag) pag.innerHTML = ""; return; }

    let html = "";

    html += `<button class="btn-page ${pageActuelle === 1 ? 'disabled' : ''}"
        onclick="allerPage(${pageActuelle - 1})" ${pageActuelle === 1 ? 'disabled' : ''}>← Précédent</button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-page ${i === pageActuelle ? 'active' : ''}"
            onclick="allerPage(${i})">${i}</button>`;
    }

    html += `<button class="btn-page ${pageActuelle === totalPages ? 'disabled' : ''}"
        onclick="allerPage(${pageActuelle + 1})" ${pageActuelle === totalPages ? 'disabled' : ''}>Suivant →</button>`;

    pag.innerHTML = html;
}

function allerPage(n) {
    const totalPages = Math.ceil(demandesFiltrees.length / PAR_PAGE);
    if (n < 1 || n > totalPages) return;
    pageActuelle = n;
    afficherPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ═══════════════════════════════════════════════════════
//  SUPPRIMER
// ═══════════════════════════════════════════════════════
function supprimerDemande(id) {
    if (!confirm("Supprimer cette demande définitivement ?")) return;

    fetch(`${API}/demandes/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(() => {
        toutesLesDemandes = toutesLesDemandes.filter(d => d.id !== id);
        demandesFiltrees  = demandesFiltrees.filter(d => d.id !== id);
        mettreAJourStats(toutesLesDemandes);
        afficherPage();
    })
    .catch(() => alert("Erreur lors de la suppression"));
}

// ═══════════════════════════════════════════════════════
//  MODIFIER
// ═══════════════════════════════════════════════════════
function ouvrirModification(id, titre, description) {
    document.getElementById("modifId").value          = id;
    document.getElementById("modifTitre").value       = titre;
    document.getElementById("modifDescription").value = description;
    document.getElementById("modaleModif").style.display = "flex";
}

function fermerModification() {
    document.getElementById("modaleModif").style.display = "none";
}

function sauvegarderModification(event) {
    event.preventDefault();
    const id          = document.getElementById("modifId").value;
    const titre       = document.getElementById("modifTitre").value.trim();
    const description = document.getElementById("modifDescription").value.trim();

    if (!titre || !description) { alert("Veuillez remplir tous les champs"); return; }

    fetch(`${API}/demandes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, description })
    })
    .then(res => res.json())
    .then(() => {
        const idx = toutesLesDemandes.findIndex(d => d.id == id);
        if (idx !== -1) {
            toutesLesDemandes[idx].titre       = titre;
            toutesLesDemandes[idx].description = description;
        }
        const idx2 = demandesFiltrees.findIndex(d => d.id == id);
        if (idx2 !== -1) {
            demandesFiltrees[idx2].titre       = titre;
            demandesFiltrees[idx2].description = description;
        }
        fermerModification();
        afficherPage();
    })
    .catch(() => alert("Erreur lors de la modification"));
}

// ═══════════════════════════════════════════════════════
//  VOIR DÉTAIL + IMPRESSION
// ═══════════════════════════════════════════════════════
function ouvrirDetail(id) {
    const d = toutesLesDemandes.find(dem => dem.id === id);
    if (!d) return;
    demandeDetailCourante = d;

    document.getElementById("detailContenu").innerHTML = `
        <table class="detail-table">
            <tr><td class="detail-label">Type</td><td>${echapper(d.titre)}</td></tr>
            <tr><td class="detail-label">Description</td><td>${echapper(d.description)}</td></tr>
            <tr><td class="detail-label">Statut</td><td><span class="badge ${badgeClass(d.statut)}">${d.statut}</span></td></tr>
            <tr><td class="detail-label">Date</td><td>${formaterDate(d.created_at)}</td></tr>
            <tr><td class="detail-label">N° demande</td><td>#${d.id}</td></tr>
        </table>
    `;
    document.getElementById("modaleDetail").style.display = "flex";
}

function fermerDetail() {
    document.getElementById("modaleDetail").style.display = "none";
}

function imprimerDemande() {
    if (!demandeDetailCourante) return;
    imprimerDemandeDirecte(demandeDetailCourante.id);
}

function imprimerDemandeDirecte(id) {
    const d = toutesLesDemandes.find(dem => dem.id === id);
    if (!d) return;
    const nom = localStorage.getItem("nom") || "Utilisateur";

    const contenu = `
        <html><head><title>Demande #${d.id}</title>
        <style>
            body { font-family: Arial; margin: 40px; color: #333; }
            h1 { color: #2c3e50; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
            .info { margin: 20px 0; }
            .label { font-weight: bold; color: #555; width: 150px; display: inline-block; }
            .statut { padding: 4px 12px; border-radius: 12px; background: #fff3cd; color: #856404; }
            .pied { margin-top: 40px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
        </style></head>
        <body>
            <h1>Demande administrative — Commune</h1>
            <div class="info"><span class="label">N° demande :</span> #${d.id}</div>
            <div class="info"><span class="label">Demandeur :</span> ${nom}</div>
            <div class="info"><span class="label">Type :</span> ${d.titre}</div>
            <div class="info"><span class="label">Description :</span> ${d.description}</div>
            <div class="info"><span class="label">Statut :</span> <span class="statut">${d.statut}</span></div>
            <div class="info"><span class="label">Date :</span> ${formaterDate(d.created_at)}</div>
            <div class="pied">Document généré le ${new Date().toLocaleDateString('fr-FR')} — Système de gestion des demandes administratives</div>
        </body></html>
    `;
    const win = window.open("", "_blank");
    win.document.write(contenu);
    win.document.close();
    win.print();
}

// ═══════════════════════════════════════════════════════
//  PROFIL UTILISATEUR
// ═══════════════════════════════════════════════════════
function chargerProfil() {
    const userId = localStorage.getItem("userId");
    const nom    = localStorage.getItem("nom");

    if (!userId) { window.location.href = "login.html"; return; }

    const profilNom   = document.getElementById("profilNom");
    const profilEmail = document.getElementById("profilEmail");
    const avatar      = document.getElementById("avatarInitiales");
    const champNom    = document.getElementById("nouveauNom");

    fetch(`${API}/users/${userId}`)
    .then(res => res.json())
    .then(data => {
        if (profilNom)   profilNom.textContent   = data.nom;
        if (profilEmail) profilEmail.textContent  = data.email;
        if (champNom)    champNom.value           = data.nom;
        if (avatar)      avatar.textContent       = data.nom.charAt(0).toUpperCase();
    })
    .catch(() => {
        if (profilNom) profilNom.textContent = nom || "Utilisateur";
    });
}

function modifierNom(event) {
    event.preventDefault();
    const userId     = localStorage.getItem("userId");
    const nouveauNom = document.getElementById("nouveauNom").value.trim();

    if (!nouveauNom) { afficherMessage("msgProfil", "Veuillez entrer un nom", "erreur"); return; }

    fetch(`${API}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nouveauNom })
    })
    .then(res => res.json())
    .then(data => {
        localStorage.setItem("nom", nouveauNom);
        const nomEl = document.getElementById("nomUtilisateur");
        const nomPr = document.getElementById("profilNom");
        const av    = document.getElementById("avatarInitiales");
        if (nomEl) nomEl.textContent = nouveauNom;
        if (nomPr) nomPr.textContent = nouveauNom;
        if (av)    av.textContent    = nouveauNom.charAt(0).toUpperCase();
        afficherMessage("msgProfil", "Nom modifié avec succès !", "succes");
    })
    .catch(() => afficherMessage("msgProfil", "Erreur lors de la modification", "erreur"));
}

function changerMotDePasse(event) {
    event.preventDefault();
    const userId    = localStorage.getItem("userId");
    const ancienMdp = document.getElementById("ancienMdp").value;
    const nouveauMdp = document.getElementById("nouveauMdp").value;
    const confirmMdp = document.getElementById("confirmMdp").value;

    if (nouveauMdp !== confirmMdp) {
        afficherMessage("msgProfil", "Les mots de passe ne correspondent pas", "erreur");
        return;
    }
    if (nouveauMdp.length < 4) {
        afficherMessage("msgProfil", "Le mot de passe doit avoir au moins 4 caractères", "erreur");
        return;
    }

    fetch(`${API}/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ancienPassword: ancienMdp, nouveauPassword: nouveauMdp })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            afficherMessage("msgProfil", "Mot de passe changé avec succès !", "succes");
            document.getElementById("ancienMdp").value  = "";
            document.getElementById("nouveauMdp").value = "";
            document.getElementById("confirmMdp").value = "";
        } else {
            afficherMessage("msgProfil", data.message || "Ancien mot de passe incorrect", "erreur");
        }
    })
    .catch(() => afficherMessage("msgProfil", "Erreur serveur", "erreur"));
}

// ═══════════════════════════════════════════════════════
//  ADMIN — toutes les demandes
// ═══════════════════════════════════════════════════════
let toutesDemandesAdmin = [];

function verifierAdmin() {
    const isAdmin = localStorage.getItem("isAdmin");
    if (isAdmin !== "true") {
        alert("Accès refusé — Réservé aux administrateurs");
        window.location.href = "dashboard.html";
    }
}

function chargerToutesLesDemandes() {
    fetch(`${API}/admin/demandes`, {
        headers: { "user-id": localStorage.getItem("userId") }
    })
    .then(res => res.json())
    .then(data => {
        toutesDemandesAdmin = data;
        mettreAJourStatsAdmin(data);
        afficherTableAdmin(data);
    })
    .catch(() => {
        document.getElementById("adminTableBody").innerHTML =
            "<tr><td colspan='7' style='text-align:center; color:#842029; padding:20px;'>Erreur de chargement</td></tr>";
    });
}

function mettreAJourStatsAdmin(demandes) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("adminTotal",   demandes.length);
    set("adminAttente", demandes.filter(d => d.statut === "En attente").length);
    set("adminEncours", demandes.filter(d => d.statut === "En cours").length);
    set("adminTermine", demandes.filter(d => d.statut === "Terminée").length);
}

function filtrerAdmin() {
    const search = (document.getElementById("adminSearch")?.value || "").toLowerCase();
    const statut = document.getElementById("adminFiltreStatut")?.value || "";

    const filtrees = toutesDemandesAdmin.filter(d => {
        const matchSearch = d.titre.toLowerCase().includes(search) ||
                            (d.user_nom || "").toLowerCase().includes(search);
        const matchStatut = !statut || d.statut === statut;
        return matchSearch && matchStatut;
    });
    afficherTableAdmin(filtrees);
}

function afficherTableAdmin(demandes) {
    const tbody = document.getElementById("adminTableBody");
    if (!tbody) return;

    if (demandes.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Aucune demande</td></tr>";
        return;
    }

    tbody.innerHTML = demandes.map(d => `
        <tr>
            <td>#${d.id}</td>
            <td>${echapper(d.user_nom || "—")}</td>
            <td>${echapper(d.titre)}</td>
            <td class="td-desc">${echapper(d.description)}</td>
            <td><span class="badge ${badgeClass(d.statut)}">${d.statut}</span></td>
            <td>${formaterDate(d.created_at)}</td>
            <td>
                <button class="btn-modifier btn-sm"
                    onclick="ouvrirChangementStatut(${d.id}, '${echapperAttr(d.titre)}', '${d.statut}')">
                    Statut
                </button>
                <button class="btn-supprimer btn-sm"
                    onclick="supprimerAdmin(${d.id})">
                    Suppr.
                </button>
            </td>
        </tr>
    `).join("");
}

function ouvrirChangementStatut(id, titre, statutActuel) {
    document.getElementById("statutDemandeId").value    = id;
    document.getElementById("statutDemandeTitre").textContent = titre;
    document.getElementById("nouveauStatut").value      = statutActuel;
    document.getElementById("modaleStatut").style.display = "flex";
}

function fermerStatut() {
    document.getElementById("modaleStatut").style.display = "none";
}

function sauvegarderStatut() {
    const id     = document.getElementById("statutDemandeId").value;
    const statut = document.getElementById("nouveauStatut").value;

    fetch(`${API}/admin/demandes/${id}/statut`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "user-id": localStorage.getItem("userId")
        },
        body: JSON.stringify({ statut })
    })
    .then(res => res.json())
    .then(() => {
        const idx = toutesDemandesAdmin.findIndex(d => d.id == id);
        if (idx !== -1) toutesDemandesAdmin[idx].statut = statut;
        fermerStatut();
        mettreAJourStatsAdmin(toutesDemandesAdmin);
        filtrerAdmin();
    })
    .catch(() => alert("Erreur lors du changement de statut"));
}

function supprimerAdmin(id) {
    if (!confirm("Supprimer cette demande ?")) return;
    fetch(`${API}/demandes/${id}`, { method: "DELETE" })
    .then(() => {
        toutesDemandesAdmin = toutesDemandesAdmin.filter(d => d.id != id);
        mettreAJourStatsAdmin(toutesDemandesAdmin);
        filtrerAdmin();
    });
}

// ═══════════════════════════════════════════════════════
//  DÉCONNEXION
// ═══════════════════════════════════════════════════════
function logout() {
    localStorage.removeItem("userId");
    localStorage.removeItem("nom");
    localStorage.removeItem("isAdmin");
    window.location.href = "login.html";
}

// ═══════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════
function afficherMessage(elementId, texte, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent   = texte;
    el.className     = type === "succes" ? "msg-retour msg-succes" : "msg-retour msg-erreur";
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 4000);
}

function formaterDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}

function badgeClass(statut) {
    const map = {
        "En attente" : "badge-attente",
        "En cours"   : "badge-encours",
        "Terminée"   : "badge-termine",
        "Refusée"    : "badge-refuse"
    };
    return map[statut] || "badge-attente";
}

function echapper(texte) {
    if (!texte) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(texte));
    return div.innerHTML;
}

function echapperAttr(texte) {
    if (!texte) return "";
    return texte.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════
//  FONCTIONS UI SUPPLÉMENTAIRES
// ═══════════════════════════════════════════════════════

// Toggle sidebar mobile
function toggleSidebar() {
    document.getElementById("sidebar")?.classList.toggle("open");
}

// Toggle menu utilisateur
function toggleUserMenu() {
    document.getElementById("userMenu")?.classList.toggle("open");
}

// Fermer menu si clic ailleurs
document.addEventListener("click", function(e) {
    const userZone = document.querySelector(".topbar-user");
    const menu = document.getElementById("userMenu");
    if (menu && userZone && !userZone.contains(e.target)) {
        menu.classList.remove("open");
    }
});

// Afficher/masquer mot de passe
function togglePassword(fieldId, btn) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    if (field.type === "password") {
        field.type = "text";
        btn.innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
    } else {
        field.type = "password";
        btn.innerHTML = '<i class="bi bi-eye-fill"></i>';
    }
}

// Sélectionner type de demande via radio
function setType(valeur) {
    const el = document.getElementById("type");
    if (el) el.value = valeur;
}

// Initialiser avatar dans topbar
function initTopbar() {
    const nom = localStorage.getItem("nom") || "";
    const avatarEl = document.getElementById("topbarAvatar");
    const nomEl    = document.getElementById("topbarNom") || document.getElementById("nomUtilisateur");
    if (avatarEl) avatarEl.textContent = nom.charAt(0).toUpperCase() || "?";
    if (nomEl)    nomEl.textContent    = nom;
}

// Afficher message avec classes Bootstrap
function afficherMessage(elementId, texte, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = texte;
    el.className   = type === "succes"
        ? "alert alert-success"
        : "alert alert-danger";
    el.classList.remove("d-none");
    setTimeout(() => { el.classList.add("d-none"); }, 4500);
}

// Afficher les demandes avec les nouvelles classes CSS
function afficherPage() {
    const container = document.getElementById("listeDemandes");
    if (!container) return;
    container.innerHTML = "";

    if (demandesFiltrees.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="bi bi-folder2-open"></i></div>
                <div class="empty-state-title">Aucune demande trouvée</div>
                <div class="empty-state-desc">Vous n'avez pas encore de demandes ou aucun résultat ne correspond à votre recherche.</div>
                <a href="demande.html" class="btn btn-gov">
                    <i class="bi bi-plus-circle-fill me-2"></i>Créer ma première demande
                </a>
            </div>`;
        document.getElementById("pagination").innerHTML = "";
        return;
    }

    const debut = (pageActuelle - 1) * PAR_PAGE;
    const page  = demandesFiltrees.slice(debut, debut + PAR_PAGE);

    page.forEach(d => {
        const div = document.createElement("div");
        div.className = "demande-card";
        div.innerHTML = `
            <div class="demande-card-header">
                <h3 class="demande-card-title">${echapper(d.titre)}</h3>
                <span class="badge-statut ${badgeClass(d.statut)}">${d.statut}</span>
            </div>
            <p class="demande-card-desc">${echapper(d.description)}</p>
            <p class="demande-card-meta">
                <i class="bi bi-calendar3"></i>Créée le ${formaterDate(d.created_at)}
                &nbsp;·&nbsp;
                <i class="bi bi-hash"></i>N° ${d.id}
            </p>
            <div class="demande-card-actions">
                <button class="btn-voir-dem" onclick="ouvrirDetail(${d.id})">
                    <i class="bi bi-eye-fill me-1"></i>Voir
                </button>
                <button class="btn-modif-dem" onclick="ouvrirModification(${d.id}, '${echapperAttr(d.titre)}', '${echapperAttr(d.description)}')">
                    <i class="bi bi-pencil-fill me-1"></i>Modifier
                </button>
                <button class="btn-suppr-dem" onclick="supprimerDemande(${d.id})">
                    <i class="bi bi-trash3-fill me-1"></i>Supprimer
                </button>
                <button class="btn-print-dem" onclick="imprimerDemandeDirecte(${d.id})">
                    <i class="bi bi-printer-fill me-1"></i>Imprimer
                </button>
            </div>
        `;
        container.appendChild(div);
    });
    afficherPagination();
}

// Remplacer ouvrirModification pour utiliser la modale Bootstrap
function ouvrirModification(id, titre, description) {
    document.getElementById("modifId").value          = id;
    document.getElementById("modifTitre").value       = titre;
    document.getElementById("modifDescription").value = description;
    // Utilise Bootstrap modal si disponible
    if (typeof bootstrap !== "undefined") {
        new bootstrap.Modal(document.getElementById("modaleModif")).show();
    } else {
        document.getElementById("modaleModif").style.display = "flex";
    }
}

function fermerModification() {
    if (typeof bootstrap !== "undefined") {
        bootstrap.Modal.getInstance(document.getElementById("modaleModif"))?.hide();
    } else {
        document.getElementById("modaleModif").style.display = "none";
    }
}

function ouvrirDetail(id) {
    const d = toutesLesDemandes.find(dem => dem.id === id);
    if (!d) return;
    demandeDetailCourante = d;
    document.getElementById("detailContenu").innerHTML = `
        <table class="detail-table">
            <tr><td>Type</td><td><strong>${echapper(d.titre)}</strong></td></tr>
            <tr><td>Description</td><td>${echapper(d.description)}</td></tr>
            <tr><td>Statut</td><td><span class="badge-statut ${badgeClass(d.statut)}">${d.statut}</span></td></tr>
            <tr><td>Date</td><td>${formaterDate(d.created_at)}</td></tr>
            <tr><td>N° demande</td><td>#${d.id}</td></tr>
        </table>`;
    if (typeof bootstrap !== "undefined") {
        new bootstrap.Modal(document.getElementById("modaleDetail")).show();
    }
}

function fermerDetail() {
    if (typeof bootstrap !== "undefined") {
        bootstrap.Modal.getInstance(document.getElementById("modaleDetail"))?.hide();
    }
}

// Ajouter initTopbar au DOMContentLoaded
document.addEventListener("DOMContentLoaded", function() {
    initTopbar();
});