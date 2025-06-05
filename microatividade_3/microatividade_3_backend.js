// Backend (Node.js + Express + jsonwebtoken)

const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Chave secreta para assinar e verificar JWTs (em produção, use uma variável de ambiente segura)
const JWT_SECRET = "sua-chave-secreta-super-segura-aqui"; 
const TOKEN_EXPIRATION = "1h"; // Token expira em 1 hora

// Simulação de banco de dados de usuários
const users = [
    { id: 1, username: "user", password: "password123" } 
];

// Função de Login: Gera um JWT com expiração
function do_Login(credentials) {
    const user = users.find(u => u.username === credentials.username && u.password === credentials.password);
    if (user) {
        // Usuário encontrado, gerar JWT
        const payload = {
            userId: user.id,
            username: user.username
            // NÃO inclua dados sensíveis no payload
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
        console.log(`Token gerado para ${user.username}, expira em ${TOKEN_EXPIRATION}`);
        
        // Calcula a data/hora de expiração em milissegundos (Unix timestamp * 1000)
        const decoded = jwt.decode(token);
        const expirationTimeMillis = decoded.exp * 1000;

        return { jwt_token: token, expiresAt: expirationTimeMillis }; // Retorna token e expiração
    } else {
        return null; // Login falhou
    }
}

// Middleware de Autenticação: Valida o JWT (incluindo expiração)
function authenticateTokenMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Formato: Bearer TOKEN

    if (token == null) {
        console.log("Middleware: Token não fornecido.");
        return res.status(401).json({ message: "Acesso não autorizado. Token não fornecido." }); // Se não há token
    }

    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.log("Middleware: Erro na verificação do token:", err.message);
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Acesso não autorizado. Token expirado." });
            } else {
                return res.status(403).json({ message: "Acesso não autorizado. Token inválido." }); // Token inválido (assinatura, etc.)
            }
        }
        
        // Token válido, anexa o payload do usuário à requisição
        console.log("Middleware: Token válido para usuário:", userPayload.username);
        req.user = userPayload; 
        next(); // Passa para o próximo handler
    });
}

// Endpoint de Login (Público)
app.post("/api/auth", (req, res) => {
    const loginResult = do_Login(req.body);
    if (loginResult) {
        res.json(loginResult);
    } else {
        res.status(401).json({ message: "Usuário ou senha inválidos." });
    }
});

// Endpoint Protegido: Requer autenticação via middleware
app.post("/api/do_SomeAction", authenticateTokenMiddleware, (req, res) => {
    // Se chegou aqui, o middleware authenticateTokenMiddleware validou o token
    console.log(`Ação executada para o usuário: ${req.user.username} (ID: ${req.user.userId})`);
    res.json({ success: true, message: `Ação realizada com sucesso para ${req.user.username}` });
});

// --- Para testar localmente (opcional) ---
/*
const port = 3001; // Usar porta diferente se o da microatividade 1 estiver rodando
app.listen(port, () => {
    console.log(`Servidor Backend (Microatividade 3) rodando em http://localhost:${port}`);
    console.log(`Use um cliente HTTP para POST em /api/auth com {"username": "user", "password": "password123"} para obter um token.`);
    console.log(`Depois, use o token obtido no cabeçalho "Authorization: Bearer <token>" para POST em /api/do_SomeAction.`);
});
*/

