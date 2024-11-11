const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./db.js")
const sessionMiddleware = require("./middleware/session"); 
const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs"); 

app.use(express.static('public'));

app.use(sessionMiddleware);

// Importar as rotas
const gestorRoutes = require("./routes/gestor");
const usuarioRoutes = require("./routes/usuario");

// Usar as rotas
app.use("/gestor", gestorRoutes);
app.use("/usuario", usuarioRoutes);



app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000!!!");
});
