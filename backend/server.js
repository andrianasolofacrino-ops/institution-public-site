const express = require("express");
const cors    = require("cors");
const mysql   = require("mysql2/promise");

const app  = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ─── Pool MySQL avec mysql2/promise ───────────────────
let pool;

async function initDB() {
    try {
        pool = mysql.createPool({
            host           : process.env.DB_HOST     || "localhost",
            port           : parseInt(process.env.DB_PORT || "3306"),
            user           : process.env.DB_USER     || "root",
            password       : process.env.DB_PASSWORD || "",
            database       : process.env.DB_NAME     || "institution_db",
            connectionLimit: 5,
            waitForConnections: true,
            queueLimit     : 0
        });

        // Test connexion
        const conn = await pool.getConnection();
        console.log("✅ MySQL Pool connecté");
        console.log("   HOST:", process.env.DB_HOST || "localhost");
        console.log("   PORT:", process.env.DB_PORT || "3306");
        conn.release();
    } catch (err) {
        console.error("❌ MySQL erreur:", err.message);
        console.error("   HOST:", process.env.DB_HOST || "localhost");
        console.error("   PORT:", process.env.DB_PORT || "3306");
        console.error("   USER:", process.env.DB_USER || "root");
        console.error("   DB  :", process.env.DB_NAME || "institution_db");
    }
}

initDB();

// Helper pour exécuter les requêtes
async function query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// ─── Routes ────────────────────────────────────────────
app.get("/", (req, res) => {
    res.json({ message: "Serveur CommuneService OK", version: "3.0" });
});

app.get("/diagnostic", async (req, res) => {
    try {
        const rows = await query("DESCRIBE demandes", []);
        const colonnes = rows.map(c => c.Field);
        res.json({
            status: "OK",
            colonnes,
            has_commentaire_admin: colonnes.includes("commentaire_admin"),
            message: "✅ MySQL connecté et fonctionnel"
        });
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// ─── INSCRIPTION ───────────────────────────────────────
app.post("/register", async (req, res) => {
    const { nom, email, password } = req.body;
    if (!nom || !email || !password) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
    }
    try {
        const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Cet email est déjà utilisé" });
        }
        await query(
            "INSERT INTO users (nom, email, password, is_admin) VALUES (?, ?, ?, 0)",
            [nom, email, password]
        );
        res.json({ message: "Inscription réussie !" });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
});

// ─── CONNEXION ─────────────────────────────────────────
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
    }
    try {
        const rows = await query(
            "SELECT id, nom, email, is_admin FROM users WHERE email = ? AND password = ?",
            [email, password]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }
        const user = rows[0];
        res.json({
            message : "Connexion réussie",
            userId  : user.id,
            nom     : user.nom,
            email   : user.email,
            isAdmin : user.is_admin === 1
        });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
});

// ─── PROFIL ────────────────────────────────────────────
app.get("/users/:id", async (req, res) => {
    try {
        const rows = await query(
            "SELECT id, nom, email, is_admin FROM users WHERE id = ?",
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: "Utilisateur non trouvé" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.put("/users/:id", async (req, res) => {
    const { nom } = req.body;
    if (!nom) return res.status(400).json({ message: "Nom requis" });
    try {
        await query("UPDATE users SET nom = ? WHERE id = ?", [nom, req.params.id]);
        res.json({ message: "Nom modifié avec succès" });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.put("/users/:id/password", async (req, res) => {
    const { ancienPassword, nouveauPassword } = req.body;
    try {
        const rows = await query(
            "SELECT id FROM users WHERE id = ? AND password = ?",
            [req.params.id, ancienPassword]
        );
        if (rows.length === 0) {
            return res.json({ success: false, message: "Ancien mot de passe incorrect" });
        }
        await query("UPDATE users SET password = ? WHERE id = ?", [nouveauPassword, req.params.id]);
        res.json({ success: true, message: "Mot de passe changé avec succès" });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// ─── DEMANDES CITOYEN ──────────────────────────────────
app.post("/demandes", async (req, res) => {
    const { user_id, titre, description } = req.body;
    if (!user_id || !titre || !description) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
    }
    try {
        const result = await query(
            "INSERT INTO demandes (user_id, titre, description, statut) VALUES (?, ?, ?, 'En attente')",
            [user_id, titre, description]
        );
        res.json({ message: "Demande soumise avec succès", demandeId: result.insertId });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
});

app.get("/demandes", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId manquant" });
    try {
        const rows = await query(
            "SELECT id, titre, description, statut, commentaire_admin, created_at, updated_at FROM demandes WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
});

app.put("/demandes/:id", async (req, res) => {
    const { titre, description } = req.body;
    try {
        const rows = await query("SELECT statut FROM demandes WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Demande introuvable" });
        if (rows[0].statut !== "En attente") {
            return res.status(403).json({ message: "Impossible de modifier : demande en cours de traitement" });
        }
        await query("UPDATE demandes SET titre = ?, description = ? WHERE id = ?", [titre, description, req.params.id]);
        res.json({ message: "Demande modifiée avec succès" });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.delete("/demandes/:id", async (req, res) => {
    try {
        const rows = await query("SELECT statut FROM demandes WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Demande introuvable" });
        if (rows[0].statut !== "En attente") {
            return res.status(403).json({ message: "Impossible de supprimer : demande en cours de traitement" });
        }
        await query("DELETE FROM demandes WHERE id = ?", [req.params.id]);
        res.json({ message: "Demande supprimée" });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// ─── ADMIN ─────────────────────────────────────────────
app.get("/admin/demandes", async (req, res) => {
    try {
        const rows = await query(
            `SELECT d.id, d.titre, d.description, d.statut, d.created_at,
                    COALESCE(d.commentaire_admin, '') AS commentaire_admin,
                    d.updated_at, u.id AS user_id, u.nom AS user_nom, u.email AS user_email
             FROM demandes d
             JOIN users u ON d.user_id = u.id
             ORDER BY CASE d.statut
                 WHEN 'En attente' THEN 1
                 WHEN 'En cours'   THEN 2
                 WHEN 'Terminée'   THEN 3
                 WHEN 'Refusée'    THEN 4
             END, d.created_at DESC`, []
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
});

app.put("/admin/demandes/:id/statut", async (req, res) => {
    const { statut, commentaire_admin } = req.body;
    const statutsValides = ["En attente", "En cours", "Terminée", "Refusée"];
    if (!statutsValides.includes(statut)) {
        return res.status(400).json({ message: "Statut invalide" });
    }
    try {
        await query(
            "UPDATE demandes SET statut = ?, commentaire_admin = ? WHERE id = ?",
            [statut, commentaire_admin || null, req.params.id]
        );
        res.json({ message: "Demande mise à jour avec succès" });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.delete("/admin/demandes/:id", async (req, res) => {
    try {
        await query("DELETE FROM demandes WHERE id = ?", [req.params.id]);
        res.json({ message: "Demande supprimée" });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.get("/admin/stats", async (req, res) => {
    try {
        const rows = await query(
            `SELECT COUNT(*) AS total,
                SUM(statut = 'En attente') AS en_attente,
                SUM(statut = 'En cours')   AS en_cours,
                SUM(statut = 'Terminée')   AS terminees,
                SUM(statut = 'Refusée')    AS refusees,
                COUNT(DISTINCT user_id)    AS total_citoyens
             FROM demandes`, []
        );
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// ─── Lancer serveur ────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Serveur CommuneService démarré`);
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`\nRoutes : /register /login /demandes /admin/demandes /admin/stats\n`);
});