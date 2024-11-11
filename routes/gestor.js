const express = require("express");
const router = express.Router();
const pool = require("../db.js");
const bcrypt = require('bcrypt');
const isAuthenticated = require('../middleware/auth'); // Middleware de autenticação

// Rota para exibir o formulário de login
router.get("/login", (req, res) => {
  res.render("login", { errorMessage: '' });
});

// Rota para processar o login
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const query = 'SELECT * FROM gestor WHERE usuario = $1';
    const result = await pool.query(query, [usuario]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Verifica se a senha fornecida corresponde à senha criptografada no banco de dados
      const isMatch = await bcrypt.compare(password, user.senha);

      if (isMatch) {
        // Salva o estado de login na sessão
        req.session.userId = user.id;
        req.session.isAuthenticated = true;
        res.redirect('/gestor/home'); // Redireciona para /gestor/home após login bem-sucedido
      } else {
        res.render('login', { errorMessage: 'Usuário ou senha incorretos' });
      }
    } else {
      res.render('login', { errorMessage: 'Usuário não encontrado' });
    }
  } catch (err) {
    console.error('Erro ao realizar o login', err);
    res.render('login', { errorMessage: 'Erro ao processar o login.' });
  }
});

// Rota de logout para encerrar a sessão do gestor
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao encerrar a sessão:', err);
            return res.redirect('/gestor/home'); // Redireciona para home se houver um erro
        }
        res.clearCookie('connect.sid'); // Remove o cookie de sessão do navegador
        res.redirect('/gestor/login'); // Redireciona para a página de login do gestor
    });
});

// Rota para exibir a tela inicial (protegida)
router.get("/home", isAuthenticated, (req, res) => {
  res.render("home");
});

// Rota para exibir a tela de serviços (protegida)
router.get("/services", isAuthenticated, (req, res) => {
  res.render("services");
});

// Rota para exibir a tela de fazendas (protegida)
router.get("/farm", isAuthenticated, (req, res) => {
  res.render("farm");
});

// Rota para exibir a tela de cadastrar usuários (protegida)
router.get("/user", isAuthenticated, (req, res) => {
  res.render("user");
});

module.exports = router;
