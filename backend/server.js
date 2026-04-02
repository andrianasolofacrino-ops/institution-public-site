const express = require("express");
const cors    = require("cors");
const mysql   = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// ─── Connexion MySQL ──────────────────────────────────
const db = mysql.createConnection({
    host: "localhost", user: "root", password: "", database: "institution_db"
});

db.connect(err => {
    if (err) { console.error("Erreur MySQL :", err); }
    else     { console.log("Connexion MySQL réussie"); }
});

// ─── Route test ───────────────────────────────────────
app.get("/", (req, res) => res.send("Serveur OK"));

// ─── INSCRIPTION ──────────────────────────────────────
app.post("/register", (req, res) => {
    const { nom, email, password } = req.body;

    db.query("SELECT id FROM users WHERE email = ?", [email], (err, existing) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        if (existing.length > 0) return res.status(400).json({ message: "Email déjà utilisé" });

        db.query(
            "INSERT INTO users (nom, email, password) VALUES (?, ?, ?)",
            [nom, email, password],
            (err) => {
                if (err) return res.status(500).json({ message: "Erreur inscription" });
                res.json({ message: "Inscription réussie !" });
            }
        );
    });
});

// ─── CONNEXION ────────────────────────────────────────
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });
            if (result.length === 0) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

            const user = result[0];
            res.json({
                message : "Connexion réussie",
                userId  : user.id,
                nom     : user.nom,
                isAdmin : user.is_admin === 1
            });
        }
    );
});

// ─── PROFIL — voir ────────────────────────────────────
app.get("/users/:id", (req, res) => {
    db.query(
        "SELECT id, nom, email FROM users WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur" });
            if (result.length === 0) return res.status(404).json({ message: "Utilisateur non trouvé" });
            res.json(result[0]);
        }
    );
});

// ─── PROFIL — modifier nom ────────────────────────────
app.put("/users/:id", (req, res) => {
    const { nom } = req.body;
    db.query(
        "UPDATE users SET nom = ? WHERE id = ?",
        [nom, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Erreur" });
            res.json({ message: "Nom modifié" });
        }
    );
});

// ─── PROFIL — changer mot de passe ───────────────────
app.put("/users/:id/password", (req, res) => {
    const { ancienPassword, nouveauPassword } = req.body;

    db.query(
        "SELECT * FROM users WHERE id = ? AND password = ?",
        [req.params.id, ancienPassword],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur" });
            if (result.length === 0) return res.json({ success: false, message: "Ancien mot de passe incorrect" });

            db.query(
                "UPDATE users SET password = ? WHERE id = ?",
                [nouveauPassword, req.params.id],
                (err) => {
                    if (err) return res.status(500).json({ message: "Erreur" });
                    res.json({ success: true, message: "Mot de passe changé" });
                }
            );
        }
    );
});

// ─── DEMANDES — ajouter ───────────────────────────────
app.post("/demandes", (req, res) => {
    const { user_id, titre, description } = req.body;
    if (!user_id) return res.status(400).json({ message: "Utilisateur non identifié" });

    db.query(
        "INSERT INTO demandes (user_id, titre, description, statut) VALUES (?, ?, ?, ?)",
        [user_id, titre, description, "En attente"],
        (err) => {
            if (err) return res.status(500).json({ message: "Erreur ajout" });
            res.json({ message: "Demande ajoutée avec succès" });
        }
    );
});

// ─── DEMANDES — récupérer (par utilisateur) ───────────
app.get("/demandes", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId manquant" });

    db.query(
        "SELECT * FROM demandes WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur" });
            res.json(result);
        }
    );
});

// ─── DEMANDES — modifier ──────────────────────────────
app.put("/demandes/:id", (req, res) => {
    const { titre, description } = req.body;
    db.query(
        "UPDATE demandes SET titre = ?, description = ? WHERE id = ?",
        [titre, description, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Erreur modification" });
            res.json({ message: "Demande modifiée" });
        }
    );
});

// ─── DEMANDES — supprimer ─────────────────────────────
app.delete("/demandes/:id", (req, res) => {
    db.query("DELETE FROM demandes WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Erreur suppression" });
        res.json({ message: "Demande supprimée" });
    });
});

// ─── ADMIN — toutes les demandes ──────────────────────
app.get("/admin/demandes", (req, res) => {
    const sql = `
        SELECT d.*, u.nom AS user_nom
        FROM demandes d
        JOIN users u ON d.user_id = u.id
        ORDER BY d.created_at DESC
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: "Erreur" });
        res.json(result);
    });
});

// ─── ADMIN — changer statut ───────────────────────────
app.put("/admin/demandes/:id/statut", (req, res) => {
    const { statut } = req.body;
    db.query(
        "UPDATE demandes SET statut = ? WHERE id = ?",
        [statut, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Erreur" });
            res.json({ message: "Statut mis à jour" });
        }
    );
});

// ─── Lancer serveur ───────────────────────────────────
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));

module.exports = db;