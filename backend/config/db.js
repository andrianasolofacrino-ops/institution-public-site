// config/db.js
const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "institution_db"
});

db.connect((err) => {
    if (err) {
        console.error("Erreur connexion MySQL :", err);
    } else {
        console.log("Connexion MySQL réussie");
    }
});

module.exports = db;