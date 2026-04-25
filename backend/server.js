const express = require("express");
const cors    = require("cors");
const mysql   = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ─── Connexion MySQL avec reconnexion automatique ──────
// ✅ Fonctionne en LOCAL et sur RENDER (Railway)

function creerConnexion() {
    const connexion = mysql.createConnection({
        host     : process.env.DB_HOST     || "localhost",
        port     : parseInt(process.env.DB_PORT) || 3306,
        user     : process.env.DB_USER     || "root",
        password : process.env.DB_PASSWORD || "",
        database : process.env.DB_NAME     || "institution_db",
        connectTimeout : 60000
    });

    connexion.connect(err => {
        if (err) {
            console.error("❌ Erreur MySQL :", err.message);
            console.log("🔄 Nouvelle tentative dans 5 secondes...");
            setTimeout(creerConnexion, 5000);
        } else {
            console.log("✅ Connexion MySQL réussie");
        }
    });

    connexion.on("error", err => {
        console.error("❌ Erreur MySQL :", err.message);
        if (err.code === "PROTOCOL_CONNECTION_LOST" ||
            err.code === "ECONNRESET" ||
            err.code === "ETIMEDOUT") {
            console.log("🔄 Reconnexion automatique...");
            creerConnexion();
        }
    });

    return connexion;
}

let db = creerConnexion();

// ─── Route test ────────────────────────────────────────
app.get("/", (req, res) => {
    res.json({ message: "Serveur CommuneService OK", version: "2.0" });
});

// ══════════════════════════════════════════════════════
//  AUTHENTIFICATION
// ══════════════════════════════════════════════════════

app.post("/register", (req, res) => {
    const { nom, email, password } = req.body;
    if (!nom || !email || !password) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
    }
    db.query("SELECT id FROM users WHERE email = ?", [email], (err, existing) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        if (existing.length > 0) {
            return res.status(400).json({ message: "Cet email est déjà utilisé" });
        }
        db.query(
            "INSERT INTO users (nom, email, password, is_admin) VALUES (?, ?, ?, 0)",
            [nom, email, password],
            (err) => {
                if (err) return res.status(500).json({ message: "Erreur lors de l'inscription" });
                res.json({ message: "Inscription réussie !" });
            }
        );
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
    }
    db.query(
        "SELECT id, nom, email, is_admin FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });
            if (result.length === 0) {
                return res.status(401).json({ message: "Email ou mot de passe incorrect" });
            }
            const user = result[0];
            res.json({
                message : "Connexion réussie",
                userId  : user.id,
                nom     : user.nom,
                email   : user.email,
                isAdmin : user.is_admin === 1
            });
        }
    );
});

// ══════════════════════════════════════════════════════
//  PROFIL UTILISATEUR
// ══════════════════════════════════════════════════════

app.get("/users/:id", (req, res) => {
    db.query(
        "SELECT id, nom, email, is_admin FROM users WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });
            if (result.length === 0) return res.status(404).json({ message: "Utilisateur non trouvé" });
            res.json(result[0]);
        }
    );
});

app.put("/users/:id", (req, res) => {
    const { nom } = req.body;
    if (!nom) return res.status(400).json({ message: "Nom requis" });
    db.query("UPDATE users SET nom = ? WHERE id = ?", [nom, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        res.json({ message: "Nom modifié avec succès" });
    });
});

app.put("/users/:id/password", (req, res) => {
    const { ancienPassword, nouveauPassword } = req.body;
    db.query(
        "SELECT id FROM users WHERE id = ? AND password = ?",
        [req.params.id, ancienPassword],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });
            if (result.length === 0) {
                return res.json({ success: false, message: "Ancien mot de passe incorrect" });
            }
            db.query(
                "UPDATE users SET password = ? WHERE id = ?",
                [nouveauPassword, req.params.id],
                (err) => {
                    if (err) return res.status(500).json({ message: "Erreur serveur" });
                    res.json({ success: true, message: "Mot de passe changé avec succès" });
                }
            );
        }
    );
});

// ══════════════════════════════════════════════════════
//  DEMANDES — CÔTÉ CITOYEN
// ══════════════════════════════════════════════════════

app.post("/demandes", (req, res) => {
    const { user_id, titre, description } = req.body;
    if (!user_id) return res.status(400).json({ message: "Utilisateur non identifié" });
    if (!titre)   return res.status(400).json({ message: "Type de demande requis" });
    if (!description) return res.status(400).json({ message: "Description requise" });
    db.query(
        "INSERT INTO demandes (user_id, titre, description, statut) VALUES (?, ?, ?, 'En attente')",
        [user_id, titre, description],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur lors de la création" });
            res.json({ message: "Demande soumise avec succès", demandeId: result.insertId });
        }
    );
});

app.get("/demandes", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId manquant" });
    db.query(
        `SELECT id, titre, description, statut, commentaire_admin, created_at, updated_at
         FROM demandes WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });
            res.json(result);
        }
    );
});

app.put("/demandes/:id", (req, res) => {
    const { titre, description } = req.body;
    db.query("SELECT statut FROM demandes WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        if (result.length === 0) return res.status(404).json({ message: "Demande introuvable" });
        if (result[0].statut !== "En attente") {
            return res.status(403).json({ message: "Impossible de modifier : cette demande est déjà en cours de traitement" });
        }
        db.query(
            "UPDATE demandes SET titre = ?, description = ? WHERE id = ?",
            [titre, description, req.params.id],
            (err) => {
                if (err) return res.status(500).json({ message: "Erreur modification" });
                res.json({ message: "Demande modifiée avec succès" });
            }
        );
    });
});

app.delete("/demandes/:id", (req, res) => {
    db.query("SELECT statut FROM demandes WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        if (result.length === 0) return res.status(404).json({ message: "Demande introuvable" });
        if (result[0].statut !== "En attente") {
            return res.status(403).json({ message: "Impossible de supprimer : cette demande est en cours de traitement" });
        }
        db.query("DELETE FROM demandes WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ message: "Erreur suppression" });
            res.json({ message: "Demande supprimée" });
        });
    });
});

// ══════════════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════════════

app.get("/admin/demandes", (req, res) => {
    const sql = `
        SELECT d.id, d.titre, d.description, d.statut, d.created_at,
               COALESCE(d.commentaire_admin, '') AS commentaire_admin,
               d.updated_at, u.id AS user_id, u.nom AS user_nom, u.email AS user_email
        FROM demandes d
        JOIN users u ON d.user_id = u.id
        ORDER BY CASE d.statut
            WHEN 'En attente' THEN 1
            WHEN 'En cours'   THEN 2
            WHEN 'Terminée'   THEN 3
            WHEN 'Refusée'    THEN 4
        END, d.created_at DESC`;
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Erreur /admin/demandes :", err.message);
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                const sqlSimple = `SELECT d.id, d.titre, d.description, d.statut, d.created_at,
                    '' AS commentaire_admin, NULL AS updated_at,
                    u.id AS user_id, u.nom AS user_nom, u.email AS user_email
                    FROM demandes d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC`;
                return db.query(sqlSimple, (err2, result2) => {
                    if (err2) return res.status(500).json({ message: "Erreur serveur" });
                    res.json(result2);
                });
            }
            return res.status(500).json({ message: "Erreur serveur", detail: err.message });
        }
        res.json(result);
    });
});

app.put("/admin/demandes/:id/statut", (req, res) => {
    const { statut, commentaire_admin } = req.body;
    const statutsValides = ["En attente", "En cours", "Terminée", "Refusée"];
    if (!statutsValides.includes(statut)) {
        return res.status(400).json({ message: "Statut invalide" });
    }
    db.query(
        "UPDATE demandes SET statut = ?, commentaire_admin = ? WHERE id = ?",
        [statut, commentaire_admin || null, req.params.id],
        (err) => {
            if (err && err.code === 'ER_BAD_FIELD_ERROR') {
                db.query("UPDATE demandes SET statut = ? WHERE id = ?", [statut, req.params.id], (err2) => {
                    if (err2) return res.status(500).json({ message: "Erreur serveur" });
                    res.json({ message: "Statut mis à jour" });
                });
            } else if (err) {
                return res.status(500).json({ message: "Erreur serveur" });
            } else {
                res.json({ message: "Demande mise à jour avec succès" });
            }
        }
    );
});

app.delete("/admin/demandes/:id", (req, res) => {
    db.query("DELETE FROM demandes WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Erreur suppression" });
        res.json({ message: "Demande supprimée" });
    });
});

app.get("/admin/stats", (req, res) => {
    db.query(
        `SELECT COUNT(*) AS total,
            SUM(statut = 'En attente') AS en_attente,
            SUM(statut = 'En cours')   AS en_cours,
            SUM(statut = 'Terminée')   AS terminees,
            SUM(statut = 'Refusée')    AS refusees,
            COUNT(DISTINCT user_id)    AS total_citoyens
         FROM demandes`,
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });
            res.json(result[0]);
        }
    );
});

app.get("/diagnostic", (req, res) => {
    db.query("DESCRIBE demandes", (err, cols) => {
        if (err) return res.status(500).json({ erreur: err.message });
        const colonnes = cols.map(c => c.Field);
        res.json({
            status: "OK",
            colonnes_demandes: colonnes,
            has_commentaire_admin: colonnes.includes("commentaire_admin"),
            has_updated_at: colonnes.includes("updated_at"),
            message: colonnes.includes("commentaire_admin")
                ? "✅ Base de données à jour"
                : "⚠️ Colonnes manquantes"
        });
    });
});

// ─── Lancer serveur ────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Serveur CommuneService démarré`);
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`\nRoutes : /register /login /demandes /admin/demandes /admin/stats\n`);
});

module.exports = db;