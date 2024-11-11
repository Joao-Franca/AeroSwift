const express = require("express");
const router = express.Router();
const pool = require("../db.js");
const bcrypt = require('bcrypt'); // Serve para colocar um hash quando cadastra a senha
const isAuthenticated = require('../middleware/auth'); // Middleware de autenticação

// Rota para exibir o formulário de login
router.get("/login", (req, res) => {
  res.render("login_u", { errorMessage: '' });
});

// Rota para processar o login
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const query = 'SELECT * FROM usuario WHERE usuario = $1';
    const result = await pool.query(query, [usuario]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Verifica se a senha fornecida corresponde à senha criptografada no banco de dados
      const isMatch = await bcrypt.compare(password, user.senha);

      if (isMatch) {
        // Salva o estado de login na sessão
        req.session.userId = user.id;
        req.session.isAuthenticated = true;
        res.redirect('/usuario/home'); // Redireciona para /usuario/home após login bem-sucedido
      } else {
        res.render('login_u', { errorMessage: 'Usuário ou senha incorretos' });
      }
    } else {
      res.render('login_u', { errorMessage: 'Usuário não encontrado' });
    }
  } catch (err) {
    console.error('Erro ao realizar o login', err);
    res.render('login_u', { errorMessage: 'Erro ao processar o login.' });
  }
});

// Rota de logout para encerrar a sessão do usuário
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          console.error('Erro ao encerrar a sessão:', err);
          return res.redirect('/usuario/home'); // Redireciona para home se houver um erro
      }
      res.clearCookie('connect.sid'); // Remove o cookie de sessão do navegador
      res.redirect('/usuario/login'); // Redireciona para a página de login do usuário
  });
});

// Rota para exibir tela inicial (protegida)
router.get("/home", isAuthenticated, (req, res) => {
  res.render("home_u");
});

// Rota para exibir tela de fazendas (protegida)
router.get("/farm", isAuthenticated, (req, res) => {
  res.render("farm_u");
});

module.exports = router;
