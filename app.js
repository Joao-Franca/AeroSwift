const express = require("express");
const methodOverride = require("method-override");
const path = require("path");
const sessionMiddleware = require("./middleware/session");

const app = express();

// Configurar a engine de visualização como EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, "public")));

// Middleware para analisar o corpo da requisição
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configurar a pasta 'uploads' como pública para servir arquivos como PDFs e imagens
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware para sessões (autenticação, controle de sessão)
app.use(sessionMiddleware);

// Middleware para sobrescrever métodos HTTP, permitindo uso de PUT e DELETE em formulários
app.use(methodOverride("_method"));

// Importar as rotas
const gestorRoutes = require("./routes/gestor");

// Usar as rotas
app.use("/gestor", gestorRoutes);

// Rotas de user
const userRoutes = require("./routes/usuario");

app.use("/usuario", userRoutes);

// Rota padrão para capturar erros de rotas inexistentes
app.use((req, res) => {
  res.status(404).render("404", { message: "Página não encontrada" });
});

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}!!!`);
});
