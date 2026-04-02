// controllers/userController.js
const db = require('../db'); // On va créer ce fichier séparé (voir ci-dessous)

exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    // On cherche l'utilisateur par email ET password
    db.query(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });

            if (results.length === 0) {
                return res.status(401).json({ message: "Email ou mot de passe incorrect" });
            }

            const user = results[0];
            res.json({
                message: "Connexion réussie",
                userId: user.id,
                nom: user.nom
            });
        }
    );
};