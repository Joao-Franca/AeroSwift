const express = require("express");
const router = express.Router();
const pool = require("../db.js")
const bcrypt = require('bcrypt')   //Serve para colocar um hash quando cadastra a senha

//Rota para exibir nosso formulário de login
router.get("/login", (req, res) => {
    res.render("login_u");
  });

//Rota para exibir tela inicial
router.get("/home", (req, res) => {
  res.render("home_u");
});

//Rota para exibir tela de fazendas
router.get("/farm", (req, res) => {
  res.render("farm_u");
});


//Rota para processar formulário de login
router.post('/login', async (req, res) => {
    const { usuario, password } = req.body;
  
    try{
      const query = 'SELECT * FROM users WHERE email = $1'
      const result = await pool.query(query, [usuario])
  
      if(result.rows.length > 0 ){
        const user = result.rows[0]
  
        //Verficica a senha fornecida corresponde a criptografada
        const isMatch = await bcrypt.compare(password, user.password)
  
        if(isMatch){
          res.redirect('/clientes/clientes')
        }else{
          res.status(400).send('Senha Incorreta')
        }
      }else{
        res.status(400).send('Usuário não encontrado')
      }
    }catch(err){
      console.error('Erro ao realizar o login', err);
      res.status(500).send("Erro ao processar o login.");
    }
  })



module.exports = router