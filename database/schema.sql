CREATE DATABASE IF NOT EXISTS institution_db;

USE institution_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS demandes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    statut VARCHAR(50) DEFAULT 'En attente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

> Le rouge VS Code : installe l'extension `MySQL` de Weijan Chen dans VS Code — elle reconnaît bien la syntaxe MySQL et le rouge disparaîtra.

---

## 📁 Nouvelle structure recommandée
```
institution-public-site/
│
├── backend/
│   ├── config/
│   │   └── db.js          ← connexion MySQL centralisée
│   ├── controllers/
│   │   └── userController.js
│   ├── routes/
│   │   └── user.js
│   └── server.js          ← point d'entrée principal
│
├── frontend/
│   └── (tes fichiers HTML/JS)
│
└── database/
    └── schema.sql