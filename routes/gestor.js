const express = require("express");
const router = express.Router();
const pool = require("../db.js");
const bcrypt = require('bcrypt');
const isAuthenticated = require('../middleware/auth'); // Middleware de autenticação
const multer = require("multer");

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Define a pasta onde os arquivos serão salvos
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`); // Define o nome do arquivo
    }
});
const upload = multer({ storage: storage });

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

// Rota para exibir a tela de fazendas com a listagem das fazendas (protegida)
router.get("/farm", isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fazendas');
        const fazendas = result.rows.map(fazenda => ({
            ...fazenda,
            imagem: fazenda.imagem ? `/uploads/${fazenda.imagem}` : null,
            mapa: fazenda.mapa ? `/uploads/${fazenda.mapa}` : null, // Caminho para o PDF
        }));
        
        // Renderiza a página 'farm.ejs' e passa a variável 'fazendas' para o template
        res.render('farm', { fazendas });
    } catch (err) {
        console.error('Erro ao buscar fazendas:', err);
        res.status(500).send('Erro ao buscar fazendas');
    }
});

// Rota para inserir uma nova fazenda no banco de dados (protegida)
router.post('/farm/add', upload.fields([{ name: 'imagemFazenda' }, { name: 'pdfFazenda' }]), async (req, res) => {
    const { nomeFazenda } = req.body;
    const imagemFazenda = req.files['imagemFazenda'] ? req.files['imagemFazenda'][0].filename : null;
    const pdfFazenda = req.files['pdfFazenda'] ? req.files['pdfFazenda'][0].filename : null;

    try {
        const query = `
            INSERT INTO fazendas (nome, imagem, mapa)
            VALUES ($1, $2, $3)
        `;
        await pool.query(query, [nomeFazenda, imagemFazenda, pdfFazenda]);

        // Redirecionar após o cadastro bem-sucedido
        res.redirect('/gestor/farm');
    } catch (err) {
        console.error('Erro ao inserir a fazenda:', err);
        res.status(500).send('Erro ao cadastrar a fazenda.');
    }
});

// Rota para editar uma fazenda no banco de dados (protegida)
router.put('/farm/edit/:id', upload.fields([{ name: 'imagem' }, { name: 'pdf' }]), async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    const imagem = req.files['imagem'] ? req.files['imagem'][0].filename : null;
    const pdf = req.files['pdf'] ? req.files['pdf'][0].filename : null;

    try {
        let query = 'UPDATE fazendas SET nome = $1';
        let params = [nome];

        // Adiciona imagem ao query se for enviada
        if (imagem) {
            query += ', imagem = $2';
            params.push(imagem);
        }

        // Adiciona PDF ao query se for enviado
        if (pdf) {
            query += imagem ? ', mapa = $3' : ', mapa = $2';
            params.push(pdf);
        }

        // Determina a posição do ID dependendo do número de parâmetros adicionados
        const idPosition = imagem && pdf ? 4 : (imagem || pdf) ? 3 : 2;
        query += ` WHERE id = $${idPosition}`;
        params.push(id);

        await pool.query(query, params);

        res.sendStatus(200); // Responde com sucesso
    } catch (err) {
        console.error('Erro ao atualizar fazenda:', err);
        res.status(500).send('Erro ao atualizar fazenda.');
    }
});

// Rota para deletar uma fazenda
router.delete('/farm/delete/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM fazendas WHERE id = $1', [id]);
        res.sendStatus(200); // Resposta de sucesso
    } catch (err) {
        console.error('Erro ao deletar fazenda:', err);
        res.status(500).send('Erro ao deletar fazenda');
    }
});

// Rota para exibir a tela de cadastrar usuários (protegida)
router.get("/user", isAuthenticated, (req, res) => {
    res.render("user");
});

// Rota para inserir um novo usuário no banco de dados (protegida)
router.post('/user', isAuthenticated, async (req, res) => {
    try {
        const { nome, telefone, usuario, senha } = req.body;

        // Hash da senha antes de salvar no banco de dados
        const hashedPassword = await bcrypt.hash(senha, 10);

        const query = `
            INSERT INTO usuario (nome, telefone, usuario, senha)
            VALUES ($1, $2, $3, $4)
        `;
        await pool.query(query, [nome, telefone, usuario, hashedPassword]);

        // Redirecionar após o cadastro bem-sucedido
        res.redirect('/gestor/users');
    } catch (err) {
        console.error('Erro ao inserir o usuário:', err);
        res.status(500).render('user', { errorMessage: 'Erro ao cadastrar o usuário. Por favor, tente novamente.' });
    }
});

// Rota para listar todos os usuários (protegida)
router.get('/users', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuario');
        const usuarios = result.rows;

        // Renderiza a página de usuários e passa a variável `usuarios`
        res.render('users', { usuarios });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).send('Erro ao buscar usuários');
    }
});

// Rota para atualizar um usuário (protegida)
router.put('/user/edit/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { nome, telefone, usuario, senha } = req.body;

    try {
        // Criptografar a nova senha se ela for fornecida
        let hashedPassword;
        if (senha && senha.trim() !== "") {
            hashedPassword = await bcrypt.hash(senha, 10);
        }

        // Montar a query e parâmetros dependendo da senha
        let query = 'UPDATE usuario SET nome = $1, telefone = $2, usuario = $3';
        let params = [nome, telefone, usuario];

        if (hashedPassword) {
            query += ', senha = $4 WHERE id = $5';
            params.push(hashedPassword, id);
        } else {
            query += ' WHERE id = $4';
            params.push(id);
        }

        // Executar a query de atualização
        await pool.query(query, params);

        res.sendStatus(200); // Responde com sucesso
    } catch (err) {
        console.error('Erro ao atualizar usuário:', err);
        res.status(500).send('Erro ao atualizar usuário');
    }
});

// Rota para deletar usuário
router.delete('/user/delete/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM usuario WHERE id = $1', [id]);
        res.sendStatus(200); // Resposta de sucesso
    } catch (err) {
        console.error('Erro ao deletar usuário:', err);
        res.status(500).send('Erro ao deletar usuário');
    }
});

module.exports = router;