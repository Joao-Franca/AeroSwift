const express = require("express");
const router = express.Router();
const pool = require("../db.js")
const bcrypt = require('bcrypt')   //Serve para colocar um hash quando cadastra a senha

// Rota para exibir o formulário de login
router.get("/login", (req, res) => {
  res.render("login", { errorMessage: '' });
});

//Rota para exibir a tela inicial
router.get("/home", (req, res) => {
  res.render("home");
});

//Rota para exibir a tela de serviços
router.get("/services", (req, res) => {
  res.render("services");
});

//Rota para exibir a tela de fazendas
router.get("/farm", (req, res) => {
  res.render("farm");
});

//Rota para exibir a tela de cadastrar usuários
router.get("/user", (req, res) => {
  res.render("user");
});


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






module.exports = router