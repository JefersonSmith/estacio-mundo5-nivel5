// Missão Prática: Código Refatorado (Node.js/Express)
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken"); // Necessário instalar: npm install jsonwebtoken

const app = express();
app.use(bodyParser.json());

// --- Configurações de Segurança ---
// Em produção, usar variáveis de ambiente para segredos!
const JWT_SECRET = process.env.JWT_SECRET || "uma-chave-secreta-muito-forte-e-dificil-de-adivinhar-987654321"; 
const TOKEN_EXPIRATION = "2h"; // Tempo de expiração do token (ex: 2 horas)

// --- Mock de Dados (mesmo do original) ---
const users = [
    { "username": "user", "password": "123456", "id": 123, "email": "user@dominio.com", "perfil": "user" },
    { "username": "admin", "password": "123456789", "id": 124, "email": "admin@dominio.com", "perfil": "admin" },
    { "username": "colab", "password": "123", "id": 125, "email": "colab@dominio.com", "perfil": "user" },
];

// --- Serviços da Aplicação (Refatorados) ---

// Função de Login: Valida credenciais e gera JWT
function doLogin(credentials) {
    const user = users.find(item => 
        item.username === credentials?.username && item.password === credentials?.password
    );

    if (user) {
        // Usuário encontrado, gerar JWT
        const payload = {
            userId: user.id,
            username: user.username,
            perfil: user.perfil // Inclui o perfil no token para verificações de autorização
        };

        try {
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
            console.log(`Login bem-sucedido para ${user.username}. Token gerado.`);
            return { token: token }; // Retorna apenas o token
        } catch (error) {
            console.error("Erro ao gerar token JWT:", error);
            return null;
        }
    } else {
        console.log(`Tentativa de login falhou para usuário: ${credentials?.username}`);
        return null; // Login falhou
    }
}

// Classe Fake de Repositório (Modificada para simular parametrização)
class Repository {
    // Simula a execução de uma query parametrizada
    execute(queryText, queryParams) {
        console.log("\n--- Simulação de Query Parametrizada ---");
        console.log("Query Template:", queryText);
        console.log("Parâmetros:", queryParams);
        
        // Simulação básica: retorna dados mockados se os parâmetros corresponderem a algo
        // Em um cenário real, o driver do banco de dados faria a substituição segura.
        if (queryText.includes("contracts") && queryParams[0] === "EmpresaX" && queryParams[1] === "2024-01-01") {
            console.log("Simulando retorno de contratos para EmpresaX a partir de 2024-01-01");
            return [{ id: 1, nome: "Contrato Alpha", empresa: "EmpresaX", data_inicio: "2024-01-15" }, { id: 2, nome: "Contrato Beta", empresa: "EmpresaX", data_inicio: "2024-02-20" }];
        } else if (queryText.includes("contracts")) {
             console.log("Simulando retorno vazio para outros parâmetros de contrato.");
             return []; // Retorna vazio para outros casos
        }
        
        console.log("Simulando retorno vazio para query não reconhecida.");
        return [];
    }
}

// Função para recuperar contratos (Refatorada para usar query parametrizada)
function getContracts(empresa, inicio) {
    const repository = new Repository();
    
    // Query com placeholders ($1, $2 para pg; ? para mysql)
    const query = `SELECT * FROM contracts WHERE empresa = $1 AND data_inicio = $2`;
    const params = [empresa, inicio];

    try {
        // Executa a query passando os parâmetros separadamente
        const result = repository.execute(query, params);
        console.log("Resultado simulado da busca de contratos:", result);
        return result;
    } catch (error) {
        console.error("Erro simulado ao buscar contratos:", error);
        return null; // Ou lançar erro
    }
}

// --- Middleware de Autenticação JWT ---
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(" ")[1]; // Espera formato "Bearer TOKEN"

        jwt.verify(token, JWT_SECRET, (err, userPayload) => {
            if (err) {
                console.warn("Falha na verificação do JWT:", err.message);
                if (err.name === "TokenExpiredError") {
                    return res.status(401).json({ message: "Token expirado." });
                } else {
                    return res.status(403).json({ message: "Token inválido." }); // Forbidden
                }
            }

            // Token válido, anexa payload à requisição
            req.user = userPayload;
            console.log(`Token validado para: ${req.user.username} (Perfil: ${req.user.perfil})`);
            next(); // Prossegue para a rota
        });
    } else {
        console.warn("Tentativa de acesso sem token de autenticação.");
        res.status(401).json({ message: "Acesso não autorizado. Token não fornecido." }); // Unauthorized
    }
}

// --- Endpoints da API (Refatorados) ---

// Endpoint de Login (Público)
app.post("/api/auth/login", (req, res) => {
    const credentials = req.body;
    const loginResult = doLogin(credentials);

    if (loginResult) {
        res.json(loginResult); // Retorna o { token: "..." }
    } else {
        res.status(401).json({ message: "Usuário ou senha inválidos." });
    }
});

// Endpoint para recuperação dos dados de todos os usuários (Protegido + Autorização Admin)
// Rota modificada: não precisa mais de :sessionid
app.get("/api/users", authenticateJWT, (req, res) => {
    // Verifica se o usuário autenticado tem perfil 'admin'
    if (req.user.perfil !== "admin") {
        console.warn(`Acesso negado a /api/users para usuário ${req.user.username} (Perfil: ${req.user.perfil})`);
        return res.status(403).json({ message: "Acesso proibido. Requer privilégios de administrador." }); // Forbidden
    }

    // Usuário é admin, retorna a lista de usuários (sem as senhas!)
    const usersSafe = users.map(({ password, ...user }) => user); // Remove a senha
    console.log(`Admin ${req.user.username} acessou /api/users.`);
    res.status(200).json({ data: usersSafe });
});

// Endpoint para recuperação dos contratos (Protegido)
// Rota modificada: não precisa mais de :sessionid
app.get("/api/contracts/:empresa/:inicio", authenticateJWT, (req, res) => {
    const { empresa, inicio } = req.params;
    
    // Validação básica dos parâmetros (pode ser mais robusta)
    if (!empresa || !inicio) {
         return res.status(400).json({ message: "Parâmetros 'empresa' e 'inicio' são obrigatórios." });
    }
    
    // Poderia haver validação de formato de data para 'inicio'
    // Poderia haver verificação se o usuário req.user tem permissão para ver dados desta 'empresa'

    console.log(`Usuário ${req.user.username} solicitando contratos para Empresa: ${empresa}, Início: ${inicio}`);
    const result = getContracts(empresa, inicio);

    if (result && result.length > 0) {
        res.status(200).json({ data: result });
    } else {
        // Retorna 200 com array vazio se a busca foi válida mas não encontrou nada,
        // ou 404 se a busca em si falhou (depende da semântica desejada)
        res.status(200).json({ data: [], message: "Nenhum contrato encontrado para os critérios fornecidos." });
    }
});

// --- REMOVIDO: Endpoint inseguro de decrypt ---
// app.post("/api/auth/decrypt/:sessionid", ...);

// --- REMOVIDO: Funções inseguras de encrypt/decrypt e getPerfil baseada em decrypt ---
// function encrypt(...) { ... }
// function decrypt(...) { ... }
// function getPerfil(...) { ... }

// --- Inicialização do Servidor ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor Refatorado rodando na porta ${port}`);
    console.log("JWT Secret (NÃO EXPOR EM PRODUÇÃO):", JWT_SECRET.substring(0, 10) + "...");
    console.log("Token Expiration:", TOKEN_EXPIRATION);
    console.log("\nEndpoints disponíveis:");
    console.log("  POST /api/auth/login (Body: {username, password})");
    console.log("  GET  /api/users (Requer Auth: Bearer <token>, Perfil: admin)");
    console.log("  GET  /api/contracts/:empresa/:inicio (Requer Auth: Bearer <token>)");
});

