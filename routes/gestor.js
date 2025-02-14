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
router.get("/home", isAuthenticated, async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id AS servico_id,
                TO_CHAR(s.data, 'DD/MM/YYYY') AS data,
                s.status,
                s.servico,
                s.colaborador,
                s.drone,
                f.nome AS fazenda_nome,
                f.imagem AS imagem,  -- Alterado para imagem
                f.mapa AS mapa        -- Mapa mantido separado para o PDF
            FROM servico s
            INNER JOIN fazendas f ON s.fazenda::VARCHAR = f.nome::VARCHAR
        `;
        const result = await pool.query(query);
        const servicos = result.rows;

        // Renderiza a página 'home.ejs' e passa a variável 'servicos' para o template
        res.render('home', { servicos });
    } catch (err) {
        console.error('Erro ao buscar serviços:', err);
        res.status(500).send('Erro ao buscar serviços.');
    }
});

// Rota para deletar um serviço
router.delete('/servico/delete/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM servico WHERE id = $1', [id]);
        res.sendStatus(200); // Responde com sucesso
    } catch (err) {
        console.error('Erro ao deletar serviço:', err);
        res.status(500).send('Erro ao deletar serviço');
    }
});



// Rota para exibir a tela de serviços (protegida)
router.get("/services", isAuthenticated, async (req, res) => {
    try {
        const fazendasResult = await pool.query('SELECT * FROM fazendas');
        const dronesResult = await pool.query('SELECT * FROM drone');
        const operacoesResult = await pool.query('SELECT * FROM tipooperacao');

        const fazendas = fazendasResult.rows;
        const drones = dronesResult.rows;
        const operacoes = operacoesResult.rows;

        res.render('services', { fazendas, drones, operacoes });
    } catch (err) {
        console.error('Erro ao buscar dados:', err);
        res.status(500).send('Erro ao buscar dados.');
    }
});

// Rota para cadastrar um novo serviço na tabela "servico" (protegida)
router.post('/services/add', upload.none(), async (req, res) => {
    const { fazenda, servico, drone, colaborador, dataServico } = req.body;

    // Log para verificar se todos os dados estão sendo recebidos corretamente
    console.log('Dados Recebidos:', { fazenda, servico, drone, colaborador, dataServico });

    try {
        if (!dataServico) {
            throw new Error('A data do serviço é obrigatória.');
        }

        const query = `
            INSERT INTO servico (fazenda, servico, drone, colaborador, data)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await pool.query(query, [fazenda, servico, drone, colaborador, dataServico]);

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Erro ao cadastrar o serviço:', err);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar o serviço. Por favor, tente novamente.' });
    }
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
        if (err.code === '23505') { // Código de erro de violação de unicidade no Postgres
            console.error('Erro ao inserir a fazenda: fazenda já cadastrada.');
            res.status(400).send(`<script>alert('Fazenda já cadastrada no sistema'); window.location.href = '/gestor/farm';</script>`);
        } else {
            console.error('Erro ao inserir a fazenda:', err);
            res.status(500).send('Erro ao cadastrar a fazenda.');
        }
    }
});

// Rota para editar uma fazenda no banco de dados (protegida)
router.post('/farm/edit/:id', upload.fields([{ name: 'imagemFazenda' }, { name: 'pdfFazenda' }]), async (req, res) => {
    const { id } = req.params;
    const { nomeFazenda } = req.body;
    const imagem = req.files['imagemFazenda'] ? req.files['imagemFazenda'][0].filename : null;
    const mapa = req.files['pdfFazenda'] ? req.files['pdfFazenda'][0].filename : null;

    try {
        let query = 'UPDATE fazendas SET nome = $1';
        let params = [nomeFazenda];
        let currentIndex = 2;

        if (imagem) {
            query += `, imagem = $${currentIndex}`;
            params.push(imagem);
            currentIndex++;
        }

        if (mapa) {
            query += `, mapa = $${currentIndex}`;
            params.push(mapa);
            currentIndex++;
        }

        query += ` WHERE id = $${currentIndex}`;
        params.push(id);

        await pool.query(query, params);

        res.json({ success: true, message: 'Fazenda atualizada com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar fazenda:', err);
        res.status(500).json({ success: false, message: 'Erro ao atualizar fazenda.' });
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

        // Verifica se o erro é de duplicidade no PostgreSQL
        if (err.code === '23505') {
            // Renderiza a página com uma mensagem de erro específica para duplicidade
            res.status(400).render('user', {
                errorMessage: 'O nome de usuário já existe. Escolha outro.',
            });
        } else {
            // Renderiza uma mensagem genérica para outros erros
            res.status(500).render('user', {
                errorMessage: 'Erro ao cadastrar o usuário. Por favor, tente novamente.',
            });
        }
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

// Rota para atualizar telefone, usuário e senha (protegida)
router.put('/user/edit/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { telefone, usuario, senha } = req.body;

    try {
        // Validar se os campos obrigatórios foram enviados
        if (!telefone && !usuario && !senha) {
            return res.status(400).send('É necessário fornecer pelo menos um campo para atualizar.');
        }

        // Criptografar a nova senha se ela for fornecida
        let hashedPassword;
        if (senha && senha.trim() !== "") {
            hashedPassword = await bcrypt.hash(senha, 10);
        }

        // Montar a query dinamicamente para atualizar apenas os campos fornecidos
        let query = 'UPDATE usuario SET';
        const params = [];
        let index = 1;

        if (telefone) {
            query += ` telefone = $${index++},`;
            params.push(telefone);
        }
        if (usuario) {
            query += ` usuario = $${index++},`;
            params.push(usuario);
        }
        if (hashedPassword) {
            query += ` senha = $${index++},`;
            params.push(hashedPassword);
        }

        // Remover a última vírgula e adicionar a cláusula WHERE
        query = query.slice(0, -1) + ` WHERE id = $${index}`;
        params.push(id);

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