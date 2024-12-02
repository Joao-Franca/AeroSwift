// middleware/auth.js

function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
        return next(); // Se o usuário está autenticado, continue para a rota
    }

    // Verifica o caminho da rota e redireciona para a página de login correta
    if (req.path.startsWith('/usuario')) {
        return res.redirect('/usuario/login');
    } else if (req.path.startsWith('/gestor')) {
        return res.redirect('/gestor/login');
    }

    // Redireciona para a página de login padrão se nenhuma condição anterior for atendida
    return res.redirect('/gestor/login');
}

module.exports = isAuthenticated;