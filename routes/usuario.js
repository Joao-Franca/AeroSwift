const express = require("express");
const router = express.Router();
const pool = require("../db.js");
const bcrypt = require("bcrypt"); // Serve para colocar um hash quando cadastra a senha
const isAuthenticated = require("../middleware/auth"); // Middleware de autenticação

// Rota para exibir o formulário de login
router.get("/login", (req, res) => {
  res.render("login_u", { errorMessage: "" });
});

// Rota para processar o login
router.post("/login", async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const query = "SELECT * FROM usuario WHERE usuario = $1";
    const result = await pool.query(query, [usuario]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Verifica se a senha fornecida corresponde à senha criptografada no banco de dados
      const isMatch = await bcrypt.compare(password, user.senha);

      if (isMatch) {
        // Salva o estado de login na sessão
        req.session.userId = user.id;
        req.session.isAuthenticated = true;
        res.redirect("/usuario/home"); // Redireciona para /usuario/home após login bem-sucedido
      } else {
        res.render("login_u", { errorMessage: "Usuário ou senha incorretos" });
      }
    } else {
      res.render("login_u", { errorMessage: "Usuário não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao realizar o login", err);
    res.render("login_u", { errorMessage: "Erro ao processar o login." });
  }
});

// Rota de logout para encerrar a sessão do usuário
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao encerrar a sessão:", err);
      return res.redirect("/usuario/home"); // Redireciona para home se houver um erro
    }
    res.clearCookie("connect.sid"); // Remove o cookie de sessão do navegador
    res.redirect("/usuario/login"); // Redireciona para a página de login do usuário
  });
});

// Rota para exibir a tela inicial (protegida)
// Rota para exibir a tela 'home_u' com a lista de serviços
router.get("/home", async (req, res) => {
  console.log("entrou");
  try {
    // Consulta SQL para buscar os serviços e fazendas
    const query = `
          SELECT 
              s.id AS servico_id,
              TO_CHAR(s.data, 'DD/MM/YYYY') AS data,
              s.status,
              s.servico,
              s.colaborador,
              s.drone,
              f.nome AS fazenda_nome,
              f.imagem AS imagem,
              f.mapa AS mapa
          FROM servico s
          INNER JOIN fazendas f ON s.fazenda::VARCHAR = f.nome::VARCHAR
      `;
    const result = await pool.query(query);
    const servicos = result.rows;
    console.log(servicos);
    // Renderiza a página 'home_u.ejs' e passa a variável 'servicos' para o template
    res.render("home_u", { servicos });
  } catch (err) {
    console.error("Erro ao buscar serviços:", err);
    res.status(500).send("Erro ao buscar serviços.");
  }
});

// Rota para exibir a tela de fazendas com a listagem das fazendas (protegida)
router.get("/farm", isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM fazendas");
    const fazendas = result.rows.map((fazenda) => ({
      ...fazenda,
      imagem: fazenda.imagem ? `/uploads/${fazenda.imagem}` : null,
      mapa: fazenda.mapa ? `/uploads/${fazenda.mapa}` : null, // Caminho para o PDF
    }));

    // Renderiza a página 'farm.ejs' e passa a variável 'fazendas' para o template
    console.log(fazendas);
    res.render("farm_u", { fazendas });
  } catch (err) {
    console.error("Erro ao buscar fazendas:", err);
    res.status(500).send("Erro ao buscar fazendas");
  }
});

module.exports = router;
