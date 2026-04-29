// ═══════════════════════════════════════════════════════
//  COMMUNESERVICE — script.js v3.0
//  ✅ Fonctionne en LOCAL et en LIGNE (Render)
// ═══════════════════════════════════════════════════════

// ✅ URL API automatique — local ou Render
const API = (window.location.hostname === "localhost" ||
             window.location.hostname === "127.0.0.1")
    ? "http://localhost:3000"
    : "https://institution-public-site-production.up.railway.app";

const PAR_PAGE = 5;

let toutesLesDemandes     = [];
let demandesFiltrees      = [];
let pageActuelle          = 1;
let demandeDetailCourante = null;
let toutesDemandesAdmin   = [];

// ═══════════════════════════════════════════════════════
//  INITIALISATION
// ═══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    const page    = window.location.pathname;
    const userId  = localStorage.getItem("userId");
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    const publiques = ["index.html", "login.html", "register.html"];
    const estPublique = publiques.some(p => page.includes(p)) || page === "/" || page.endsWith("/");

    if (!estPublique && !userId) {
        window.location.href = "login.html";
        return;
    }

    if (page.includes("dashboard.html") && isAdmin) {
        window.location.href = "admin.html";
        return;
    }

    if (page.includes("admin.html") && !isAdmin) {
        afficherToast("Accès refusé — Réservé aux administrateurs", "danger");
        setTimeout(() => window.location.href = "dashboard.html", 2000);
        return;
    }

    initTopbar();

    if (page.includes("dashboard.html")) chargerDemandes();
    if (page.includes("admin.html"))     { chargerToutesLesDemandes(); chargerStatsAdmin(); }
    if (page.includes("profil.html"))    chargerProfil();
    if (page.includes("demande.html"))   initDemandePage();
});

// ═══════════════════════════════════════════════════════
//  INSCRIPTION
// ═══════════════════════════════════════════════════════
function registerUser(event) {
    event.preventDefault();
    const nom      = document.getElementById("nom")?.value.trim();
    const email    = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!nom || !email || !password) {
        afficherMessage("msgRegister", "Veuillez remplir tous les champs", "erreur");
        return;
    }
    if (password.length < 4) {
        afficherMessage("msgRegister", "Le mot de passe doit avoir au moins 4 caractères", "erreur");
        return;
    }

    const btn = event.target.querySelector("button[type='submit']");
    setBtnLoading(btn, true, "Inscription...");

    fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, password })
    })
    .then(res => res.json())
    .then(data => {
        setBtnLoading(btn, false, "Créer mon compte");
        if (data.message === "Inscription réussie !") {
            afficherMessage("msgRegister", "✅ Inscription réussie ! Redirection...", "succes");
            setTimeout(() => window.location.href = "login.html", 1500);
        } else {
            afficherMessage("msgRegister", data.message, "erreur");
        }
    })
    .catch(() => {
        setBtnLoading(btn, false, "Créer mon compte");
        afficherMessage("msgRegister", "Impossible de contacter le serveur", "erreur");
    });
}

// ═══════════════════════════════════════════════════════
//  CONNEXION
// ═══════════════════════════════════════════════════════
function loginUser(event) {
    event.preventDefault();
    const email    = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
        afficherMessage("msgLogin", "Veuillez remplir tous les champs", "erreur");
        return;
    }

    const btn = event.target.querySelector("button[type='submit']");
    setBtnLoading(btn, true, "Connexion...");

    fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        setBtnLoading(btn, false, "Se connecter");
        if (data.userId) {
            localStorage.setItem("userId",  data.userId);
            localStorage.setItem("nom",     data.nom);
            localStorage.setItem("email",   data.email);
            localStorage.setItem("isAdmin", data.isAdmin);
            if (data.isAdmin) {
                window.location.href = "admin.html";
            } else {
                window.location.href = "dashboard.html";
            }
        } else {
            afficherMessage("msgLogin", data.message || "Identifiants incorrects", "erreur");
        }
    })
    .catch(() => {
        setBtnLoading(btn, false, "Se connecter");
        afficherMessage("msgLogin", "Impossible de contacter le serveur.", "erreur");
    });
}

// ═══════════════════════════════════════════════════════
//  DÉCONNEXION
// ═══════════════════════════════════════════════════════
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

// ═══════════════════════════════════════════════════════
//  DEMANDES — CITOYEN
// ═══════════════════════════════════════════════════════
function chargerDemandes() {
    const userId    = localStorage.getItem("userId");
    const container = document.getElementById("listeDemandes");
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <p class="mt-3 text-muted">Chargement de vos demandes...</p>
        </div>`;

    fetch(`${API}/demandes?userId=${userId}`)
    .then(res => {
        if (!res.ok) throw new Error("Erreur serveur " + res.status);
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
                <i class="bi bi-exclamation-triangle-fill text-danger icone-erreur" aria-hidden="true"></i>
                <p class="mt-2"><strong>Impossible de contacter le serveur</strong></p>
                <p class="text-muted">Vérifiez que le serveur est lancé.</p>
                <button class="btn btn-gov mt-3" onclick="chargerDemandes()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Réessayer
                </button>
            </div>`;
    });
}

function mettreAJourStats(demandes) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("statTotal",   demandes.length);
    set("statAttente", demandes.filter(d => d.statut === "En attente").length);
    set("statEncours", demandes.filter(d => d.statut === "En cours").length);
    set("statTermine", demandes.filter(d => d.statut === "Terminée").length);
}

function afficherPage() {
    const container = document.getElementById("listeDemandes");
    if (!container) return;
    container.innerHTML = "";

    if (demandesFiltrees.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="bi bi-folder2-open"></i></div>
                <div class="empty-state-title">Aucune demande trouvée</div>
                <div class="empty-state-desc">Vous n'avez pas encore soumis de demande administrative.</div>
                <a href="demande.html" class="btn btn-gov mt-2">
                    <i class="bi bi-plus-circle-fill me-1"></i>Créer ma première demande
                </a>
            </div>`;
        const pag = document.getElementById("pagination");
        if (pag) pag.innerHTML = "";
        return;
    }

    const debut = (pageActuelle - 1) * PAR_PAGE;
    const page  = demandesFiltrees.slice(debut, debut + PAR_PAGE);

    page.forEach(d => {
        const peutModifier = d.statut === "En attente";
        const div = document.createElement("div");
        div.className = "demande-card";

        const repAdmin = d.commentaire_admin
            ? `<div class="reponse-admin">
                   <i class="bi bi-chat-left-text-fill me-1"></i>
                   <strong>Réponse de l'administration :</strong>
                   <span>${echapper(d.commentaire_admin)}</span>
               </div>`
            : "";

        const dateTraitement = d.updated_at
            ? `<span class="ms-2">· Traité le ${formaterDate(d.updated_at)}</span>`
            : "";

        div.innerHTML = `
            <div class="demande-card-header">
                <h3 class="demande-card-title">
                    <i class="bi bi-file-earmark-text me-1"></i>
                    ${echapper(d.titre)}
                </h3>
                <span class="badge-statut ${badgeClass(d.statut)}">${d.statut}</span>
            </div>
            <p class="demande-card-desc">${echapper(d.description)}</p>
            ${repAdmin}
            <p class="demande-card-meta">
                <i class="bi bi-calendar3 me-1"></i>Déposée le ${formaterDate(d.created_at)}
                ${dateTraitement}
                &nbsp;·&nbsp;N° ${d.id}
            </p>
            <div class="demande-card-actions">
                <button class="btn-voir-dem" onclick="ouvrirDetail(${d.id})">
                    <i class="bi bi-eye-fill me-1"></i>Voir détail
                </button>
                ${peutModifier ? `
                <button class="btn-modif-dem" onclick="ouvrirModification(${d.id}, '${echapperAttr(d.titre)}', '${echapperAttr(d.description)}')">
                    <i class="bi bi-pencil-fill me-1"></i>Modifier
                </button>
                <button class="btn-suppr-dem" onclick="supprimerDemande(${d.id})">
                    <i class="bi bi-trash3-fill me-1"></i>Supprimer
                </button>
                ` : `
                <span class="badge-statut-info">
                    <i class="bi bi-lock-fill me-1"></i>En cours de traitement
                </span>
                `}
                <button class="btn-print-dem" onclick="imprimerDemandeDirecte(${d.id})">
                    <i class="bi bi-printer-fill me-1"></i>Imprimer
                </button>
            </div>`;
        container.appendChild(div);
    });

    afficherPagination();
}

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
    ["searchInput","filtreStatut","filtreType"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    demandesFiltrees = toutesLesDemandes;
    pageActuelle     = 1;
    afficherPage();
}

function afficherPagination() {
    const total = Math.ceil(demandesFiltrees.length / PAR_PAGE);
    const pag   = document.getElementById("pagination");
    if (!pag || total <= 1) { if (pag) pag.innerHTML = ""; return; }
    let html = `<button class="btn-page" onclick="allerPage(${pageActuelle-1})" ${pageActuelle===1?"disabled":""}>← Précédent</button>`;
    for (let i = 1; i <= total; i++) {
        html += `<button class="btn-page ${i===pageActuelle?"active":""}" onclick="allerPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-page" onclick="allerPage(${pageActuelle+1})" ${pageActuelle===total?"disabled":""}>Suivant →</button>`;
    pag.innerHTML = html;
}

function allerPage(n) {
    const total = Math.ceil(demandesFiltrees.length / PAR_PAGE);
    if (n < 1 || n > total) return;
    pageActuelle = n;
    afficherPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function supprimerDemande(id) {
    if (!confirm("Supprimer cette demande définitivement ?")) return;
    fetch(`${API}/demandes/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
        if (data.message && data.message.includes("Impossible")) {
            afficherToast(data.message, "warning");
        } else {
            toutesLesDemandes = toutesLesDemandes.filter(d => d.id !== id);
            demandesFiltrees  = demandesFiltrees.filter(d => d.id !== id);
            mettreAJourStats(toutesLesDemandes);
            afficherPage();
            afficherToast("Demande supprimée", "success");
        }
    })
    .catch(() => afficherToast("Erreur lors de la suppression", "danger"));
}

function ouvrirModification(id, titre, description) {
    document.getElementById("modifId").value          = id;
    document.getElementById("modifTitre").value       = titre;
    document.getElementById("modifDescription").value = description;
    const modal = document.getElementById("modaleModif");
    if (typeof bootstrap !== "undefined" && modal) {
        new bootstrap.Modal(modal).show();
    }
}

function fermerModification() {
    const modal = document.getElementById("modaleModif");
    if (typeof bootstrap !== "undefined" && modal) {
        bootstrap.Modal.getInstance(modal)?.hide();
    }
}

function sauvegarderModification(event) {
    event.preventDefault();
    const id          = document.getElementById("modifId").value;
    const titre       = document.getElementById("modifTitre").value.trim();
    const description = document.getElementById("modifDescription").value.trim();
    if (!titre || !description) { afficherToast("Veuillez remplir tous les champs", "warning"); return; }
    fetch(`${API}/demandes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, description })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message && data.message.includes("Impossible")) {
            afficherToast(data.message, "warning");
        } else {
            const idx  = toutesLesDemandes.findIndex(d => d.id == id);
            const idx2 = demandesFiltrees.findIndex(d => d.id == id);
            if (idx  !== -1) { toutesLesDemandes[idx].titre  = titre; toutesLesDemandes[idx].description = description; }
            if (idx2 !== -1) { demandesFiltrees[idx2].titre  = titre; demandesFiltrees[idx2].description = description; }
            fermerModification();
            afficherPage();
            afficherToast("Demande modifiée avec succès", "success");
        }
    })
    .catch(() => afficherToast("Erreur lors de la modification", "danger"));
}

function ouvrirDetail(id) {
    const d = toutesLesDemandes.find(dem => dem.id === id);
    if (!d) return;
    demandeDetailCourante = d;
    const repAdmin = d.commentaire_admin
        ? `<tr><td><strong>Réponse admin</strong></td><td class="text-primary">${echapper(d.commentaire_admin)}</td></tr>`
        : `<tr><td><strong>Réponse admin</strong></td><td class="text-muted">Pas encore de réponse</td></tr>`;
    document.getElementById("detailContenu").innerHTML = `
        <table class="detail-table">
            <tr><td>N° demande</td><td><strong>#${d.id}</strong></td></tr>
            <tr><td>Type</td><td>${echapper(d.titre)}</td></tr>
            <tr><td>Description</td><td>${echapper(d.description)}</td></tr>
            <tr><td>Statut</td><td><span class="badge-statut ${badgeClass(d.statut)}">${d.statut}</span></td></tr>
            <tr><td>Déposée le</td><td>${formaterDate(d.created_at)}</td></tr>
            ${d.updated_at ? `<tr><td>Traitée le</td><td>${formaterDate(d.updated_at)}</td></tr>` : ""}
            ${repAdmin}
        </table>`;
    const modal = document.getElementById("modaleDetail");
    if (typeof bootstrap !== "undefined" && modal) {
        new bootstrap.Modal(modal).show();
    }
}

function fermerDetail() {
    const modal = document.getElementById("modaleDetail");
    if (typeof bootstrap !== "undefined" && modal) {
        bootstrap.Modal.getInstance(modal)?.hide();
    }
}

function imprimerDemande() {
    if (demandeDetailCourante) imprimerDemandeDirecte(demandeDetailCourante.id);
}

function imprimerDemandeDirecte(id) {
    const d   = toutesLesDemandes.find(dem => dem.id === id);
    if (!d) return;
    const nom = localStorage.getItem("nom") || "Citoyen";
    const reponse = d.commentaire_admin
        ? `<div class="reponse"><strong>Réponse de l'administration :</strong><br>${d.commentaire_admin}</div>`
        : "";
    const contenu = `<html><head><title>Demande #${d.id}</title>
        <style>body{font-family:Arial,sans-serif;margin:40px;color:#333}
        .entete{display:flex;align-items:center;border-bottom:3px solid #003189;padding-bottom:16px;margin-bottom:24px}
        .logo{width:48px;height:48px;background:#003189;color:white;display:flex;align-items:center;justify-content:center;font-size:22px;border-radius:8px;margin-right:16px}
        h1{color:#003189;font-size:18px;margin:0}h2{font-size:14px;color:#555;margin:4px 0 0;font-weight:normal}
        table{width:100%;border-collapse:collapse;margin:16px 0}
        td{padding:10px 12px;border-bottom:1px solid #eee;font-size:14px}td:first-child{font-weight:bold;color:#555;width:180px}
        .statut{padding:4px 12px;border-radius:12px;background:#fff3cd;color:#856404;font-weight:bold}
        .reponse{background:#e8f4fd;border-left:4px solid #003189;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0}
        .pied{margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;text-align:center}</style>
        </head><body>
        <div class="entete"><div class="logo">🏛️</div>
        <div><h1>CommuneService — Portail Administratif</h1><h2>République de Madagascar · Reçu officiel</h2></div></div>
        <table>
            <tr><td>N° de demande</td><td><strong>#${d.id}</strong></td></tr>
            <tr><td>Nom du demandeur</td><td>${nom}</td></tr>
            <tr><td>Type de document</td><td>${d.titre}</td></tr>
            <tr><td>Description</td><td>${d.description}</td></tr>
            <tr><td>Statut actuel</td><td><span class="statut">${d.statut}</span></td></tr>
            <tr><td>Date de dépôt</td><td>${formaterDate(d.created_at)}</td></tr>
            ${d.updated_at ? `<tr><td>Date de traitement</td><td>${formaterDate(d.updated_at)}</td></tr>` : ""}
        </table>${reponse}
        <div class="pied">Document généré le ${new Date().toLocaleDateString("fr-FR")} — CommuneService</div>
        </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(contenu);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

function initDemandePage() {
    const userId = localStorage.getItem("userId");
    if (!userId) { window.location.href = "login.html"; return; }
}

function setType(valeur) {
    const el = document.getElementById("type");
    if (el) el.value = valeur;
    document.querySelectorAll(".type-option input").forEach(radio => {
        const content = radio.nextElementSibling;
        if (content) content.classList.toggle("selected", radio.value === valeur);
    });
}

function envoyerDemande(event) {
    event.preventDefault();
    const userId      = localStorage.getItem("userId");
    const titre       = document.getElementById("type")?.value.trim();
    const description = document.getElementById("description")?.value.trim();
    if (!titre) { afficherToast("Veuillez choisir un type de demande", "warning"); return; }
    if (!description || description.length < 10) {
        afficherToast("La description doit contenir au moins 10 caractères", "warning"); return;
    }
    const btn = event.target.querySelector("button[type='submit']");
    setBtnLoading(btn, true, "Envoi en cours...");
    fetch(`${API}/demandes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, titre, description })
    })
    .then(res => res.json())
    .then(() => {
        setBtnLoading(btn, false, "Envoyer la demande");
        afficherToast("✅ Demande soumise avec succès !", "success");
        setTimeout(() => window.location.href = "dashboard.html", 1800);
    })
    .catch(() => {
        setBtnLoading(btn, false, "Envoyer la demande");
        afficherToast("Erreur lors de l'envoi", "danger");
    });
}

function chargerProfil() {
    const userId = localStorage.getItem("userId");
    if (!userId) { window.location.href = "login.html"; return; }
    fetch(`${API}/users/${userId}`)
    .then(res => res.json())
    .then(data => {
        const set    = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        set("profilNom",   data.nom);
        set("profilEmail", data.email);
        setVal("nouveauNom", data.nom);
        const av = document.getElementById("avatarInitiales");
        if (av) av.textContent = data.nom.charAt(0).toUpperCase();
    })
    .catch(() => {
        const nom = localStorage.getItem("nom") || "?";
        const el  = document.getElementById("profilNom");
        if (el) el.textContent = nom;
    });
}

function modifierNom(event) {
    event.preventDefault();
    const userId     = localStorage.getItem("userId");
    const nouveauNom = document.getElementById("nouveauNom")?.value.trim();
    if (!nouveauNom) { afficherToast("Veuillez entrer un nom", "warning"); return; }
    fetch(`${API}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nouveauNom })
    })
    .then(res => res.json())
    .then(() => {
        localStorage.setItem("nom", nouveauNom);
        initTopbar();
        const el = document.getElementById("profilNom");
        if (el) el.textContent = nouveauNom;
        afficherToast("Nom modifié avec succès !", "success");
    })
    .catch(() => afficherToast("Erreur lors de la modification", "danger"));
}

function changerMotDePasse(event) {
    event.preventDefault();
    const userId     = localStorage.getItem("userId");
    const ancienMdp  = document.getElementById("ancienMdp")?.value;
    const nouveauMdp = document.getElementById("nouveauMdp")?.value;
    const confirmMdp = document.getElementById("confirmMdp")?.value;
    if (nouveauMdp !== confirmMdp) { afficherToast("Les mots de passe ne correspondent pas", "warning"); return; }
    if (nouveauMdp.length < 4) { afficherToast("Minimum 4 caractères", "warning"); return; }
    fetch(`${API}/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ancienPassword: ancienMdp, nouveauPassword: nouveauMdp })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            afficherToast("Mot de passe changé avec succès !", "success");
            ["ancienMdp","nouveauMdp","confirmMdp"].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = "";
            });
        } else {
            afficherToast(data.message || "Erreur", "danger");
        }
    })
    .catch(() => afficherToast("Erreur serveur", "danger"));
}

// ═══════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════
function chargerToutesLesDemandes() {
    fetch(`${API}/admin/demandes`)
    .then(res => res.json())
    .then(data => {
        toutesDemandesAdmin = data;
        afficherTableAdmin(data);
    })
    .catch(() => {
        const tbody = document.getElementById("adminTableBody");
        if (tbody) tbody.innerHTML = `
            <tr><td colspan="8" class="text-center p-4 text-danger">
                ❌ Impossible de charger les demandes.
            </td></tr>`;
    });
}

function chargerStatsAdmin() {
    fetch(`${API}/admin/stats`)
    .then(res => res.json())
    .then(data => {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set("adminTotal",   data.total      || 0);
        set("adminAttente", data.en_attente || 0);
        set("adminEncours", data.en_cours   || 0);
        set("adminTermine", data.terminees  || 0);
    })
    .catch(() => {});
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
        tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-muted">Aucune demande trouvée</td></tr>`;
        return;
    }
    tbody.innerHTML = demandes.map(d => `
        <tr>
            <td><strong>#${d.id}</strong></td>
            <td>
                <div class="admin-citoyen-info">
                    <span class="admin-citoyen-nom">${echapper(d.user_nom || "—")}</span>
                    <span class="admin-citoyen-email">${echapper(d.user_email || "")}</span>
                </div>
            </td>
            <td>${echapper(d.titre)}</td>
            <td class="td-desc" title="${echapperAttr(d.description)}">${echapper(d.description)}</td>
            <td><span class="badge-statut ${badgeClass(d.statut)}">${d.statut}</span></td>
            <td>${d.commentaire_admin
                ? `<span class="reponse-admin-cell">${echapper(d.commentaire_admin.substring(0,40))}${d.commentaire_admin.length > 40 ? '...' : ''}</span>`
                : '<span class="pas-de-reponse">Pas encore</span>'
            }</td>
            <td>
                <div>${formaterDate(d.created_at)}</div>
                ${d.updated_at ? `<div class="admin-date-traitement">Traité ${formaterDate(d.updated_at)}</div>` : ""}
            </td>
            <td>
                <div class="admin-actions">
                    <button class="btn-admin-traiter" onclick="ouvrirChangementStatut(${d.id}, '${echapperAttr(d.titre)}', '${d.statut}', '${echapperAttr(d.commentaire_admin || "")}', '${echapperAttr(d.description || "")}', '${echapperAttr(d.user_nom || "")}')">
                        <i class="bi bi-pencil-fill me-1"></i>Traiter
                    </button>
                    <button class="btn-admin-suppr" onclick="supprimerAdmin(${d.id})">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </div>
            </td>
        </tr>`).join("");

    if (typeof initGraphiques === "function") {
        initGraphiques(toutesDemandesAdmin.length > 0 ? toutesDemandesAdmin : demandes);
    }
}

function ouvrirChangementStatut(id, titre, statutActuel, commentaireActuel, description, userNom) {
    document.getElementById("statutDemandeId").value  = id;
    document.getElementById("nouveauStatut").value    = statutActuel;
    document.getElementById("commentaireAdmin").value = commentaireActuel || "";
    const titrEl = document.getElementById("statutDemandeTitre");
    const descEl = document.getElementById("statutDemandeDesc");
    const citEl  = document.getElementById("statutDemandeCitoyen");
    if (titrEl) titrEl.textContent = titre || "";
    if (descEl) descEl.textContent = description || "";
    if (citEl)  citEl.textContent  = userNom ? "Citoyen : " + userNom : "";
    const modal = document.getElementById("modaleStatut");
    if (typeof bootstrap !== "undefined" && modal) {
        new bootstrap.Modal(modal).show();
    }
}

function fermerStatut() {
    const modal = document.getElementById("modaleStatut");
    if (typeof bootstrap !== "undefined" && modal) {
        bootstrap.Modal.getInstance(modal)?.hide();
    }
}

function sauvegarderStatut() {
    const id               = document.getElementById("statutDemandeId").value;
    const statut           = document.getElementById("nouveauStatut").value;
    const commentaireAdmin = document.getElementById("commentaireAdmin").value.trim();
    fetch(`${API}/admin/demandes/${id}/statut`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut, commentaire_admin: commentaireAdmin })
    })
    .then(res => res.json())
    .then(() => {
        const idx = toutesDemandesAdmin.findIndex(d => d.id == id);
        if (idx !== -1) {
            toutesDemandesAdmin[idx].statut            = statut;
            toutesDemandesAdmin[idx].commentaire_admin = commentaireAdmin;
        }
        fermerStatut();
        chargerStatsAdmin();
        filtrerAdmin();
        afficherToast(`Demande #${id} mise à jour — ${statut}`, "success");
    })
    .catch(() => afficherToast("Erreur lors de la mise à jour", "danger"));
}

function supprimerAdmin(id) {
    if (!confirm(`Supprimer la demande #${id} ?`)) return;
    fetch(`${API}/admin/demandes/${id}`, { method: "DELETE" })
    .then(() => {
        toutesDemandesAdmin = toutesDemandesAdmin.filter(d => d.id != id);
        chargerStatsAdmin();
        filtrerAdmin();
        afficherToast("Demande supprimée", "success");
    })
    .catch(() => afficherToast("Erreur suppression", "danger"));
}

// ═══════════════════════════════════════════════════════
//  UI
// ═══════════════════════════════════════════════════════
function initTopbar() {
    const nom     = localStorage.getItem("nom") || "";
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    const avatarEl = document.getElementById("topbarAvatar");
    const nomEls   = document.querySelectorAll("#topbarNom, #nomUtilisateur");
    if (avatarEl) avatarEl.textContent = nom.charAt(0).toUpperCase() || "?";
    nomEls.forEach(el => el && (el.textContent = nom));
    if (isAdmin) {
        const badge = document.getElementById("adminBadge");
        if (badge) badge.style.display = "inline-block";
    }
}

function toggleSidebar() {
    document.getElementById("sidebar")?.classList.toggle("open");
}

function toggleUserMenu() {
    document.getElementById("userMenu")?.classList.toggle("open");
}

document.addEventListener("click", function(e) {
    const zone = document.querySelector(".topbar-user");
    const menu = document.getElementById("userMenu");
    if (menu && zone && !zone.contains(e.target)) {
        menu.classList.remove("open");
    }
});

function togglePassword(fieldId, btn) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    if (field.type === "password") {
        field.type = "text";
        btn.innerHTML = '<i class="bi bi-eye-slash-fill" aria-hidden="true"></i>';
    } else {
        field.type = "password";
        btn.innerHTML = '<i class="bi bi-eye-fill" aria-hidden="true"></i>';
    }
}

function afficherToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container position-fixed bottom-0 end-0 p-3";
        container.style.zIndex = "9999";
        document.body.appendChild(container);
    }
    const icones = { success:"bi-check-circle-fill", danger:"bi-exclamation-triangle-fill", warning:"bi-exclamation-circle-fill", info:"bi-info-circle-fill" };
    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute("role", "alert");
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"><i class="bi ${icones[type] || icones.info} me-2"></i>${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button>
        </div>`;
    container.appendChild(toast);
    if (typeof bootstrap !== "undefined") {
        const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
        bsToast.show();
        toast.addEventListener("hidden.bs.toast", () => toast.remove());
    } else {
        setTimeout(() => toast.remove(), 4000);
    }
}

function afficherMessage(elementId, texte, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = texte;
    el.className   = type === "succes" ? "alert alert-success" : "alert alert-danger";
    el.classList.remove("d-none");
    setTimeout(() => el.classList.add("d-none"), 5000);
}

function setBtnLoading(btn, loading, texteDefaut) {
    if (!btn) return;
    btn.disabled  = loading;
    btn.innerHTML = loading
        ? `<span class="spinner-border spinner-border-sm me-2" role="status"></span>${texteDefaut}`
        : texteDefaut;
}

function formaterDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" });
}

function badgeClass(statut) {
    const map = { "En attente":"badge-attente", "En cours":"badge-encours", "Terminée":"badge-termine", "Refusée":"badge-refuse" };
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