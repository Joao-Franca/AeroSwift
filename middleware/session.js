// middleware/session.js

const session = require('express-session');

const sessionMiddleware = session({
    secret: 'seuSegredo', // Defina uma string secreta segura
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Coloque como 'true' se estiver usando HTTPS
});

module.exports = sessionMiddleware;
