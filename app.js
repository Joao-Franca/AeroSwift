const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const path = require("path"); // Adicionado para manipulação de caminhos
const pool = require("./db.js");
const sessionMiddleware = require("./middleware/session"); 

const app = express();

// Configurações do body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Middleware para processar requisições JSON

// Configurar a engine de visualização como EJS
app.set("view engine", "ejs");

// Middleware para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, "public")));

// Configurar a pasta 'uploads' como pública para servir arquivos como PDFs e imagens
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware para sessões (autenticação, controle de sessão)
app.use(sessionMiddleware);

// Middleware para sobrescrever métodos HTTP, permitindo uso de PUT e DELETE em formulários
app.use(methodOverride('_method'));

// Importar as rotas
const gestorRoutes = require("./routes/gestor");
const usuarioRoutes = require("./routes/usuario");

// Usar as rotas
app.use("/gestor", gestorRoutes);
app.use("/usuario", usuarioRoutes);

// Rota padrão para capturar erros de rotas inexistentes
app.use((req, res, next) => {
  res.status(404).render("404", { message: "Página não encontrada" });
});

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}!!!`);
});
