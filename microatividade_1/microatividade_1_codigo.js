const express = require('express');
const app = express();

// Simulação de um serviço que retorna dados confidenciais
const service = {
    call: (req) => {
        // Em um cenário real, aqui haveria lógica para buscar dados
        // baseados na requisição, possivelmente usando informações do usuário autenticado.
        console.log("Serviço chamado para buscar dados confidenciais.");
        return { data: "Estes são dados super secretos!", user: req.user }; // Exemplo: inclui dados do usuário autenticado
    }
};

// Token de autenticação esperado (em um app real, isso seria gerenciado de forma segura)
const EXPECTED_AUTH_TOKEN = "meu-token-secreto-123";

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    // Obtém o token do cabeçalho Authorization (formato: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrai o token

    console.log("Recebido cabeçalho Authorization:", authHeader);
    console.log("Token extraído:", token);

    if (token == null) {
        console.log("Token não fornecido. Acesso negado.");
        // Se não há token, retorna 401 Unauthorized
        return res.status(401).json({ message: "Acesso não autorizado. Token não fornecido." });
    }

    // Verifica se o token é o esperado
    if (token === EXPECTED_AUTH_TOKEN) {
        console.log("Token válido. Acesso permitido.");
        // Token válido. Adiciona informações do usuário à requisição (exemplo)
        // Em um cenário real, o token (ex: JWT) seria decodificado para obter dados do usuário.
        req.user = { id: 1, name: "Usuário Autorizado" }; 
        next(); // Passa para o próximo middleware ou handler da rota
    } else {
        console.log("Token inválido. Acesso negado.");
        // Token inválido, retorna 401 Unauthorized
        return res.status(401).json({ message: "Acesso não autorizado. Token inválido." });
    }
};

// Endpoint protegido que requer autenticação
// O middleware 'authenticateToken' é aplicado ANTES do handler da rota.
app.get('/confidential-data', authenticateToken, (req, res) => {
    console.log("Handler da rota /confidential-data executando após autenticação.");
    // Se chegou aqui, a autenticação foi bem-sucedida (o middleware chamou next())
    // Executa o serviço fictício para obter os dados
    const jsonData = service.call(req);

    // Retorna os dados
    res.json(jsonData);
});

// Endpoint público (exemplo, não requer autenticação)
app.get('/public-data', (req, res) => {
    res.json({ message: "Estes são dados públicos, acessíveis a todos." });
});

// --- Para testar localmente (opcional) ---
/*
const port = 3000;
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Para testar o endpoint protegido, use um cliente HTTP (como curl ou Postman) e envie um GET para http://localhost:${port}/confidential-data com o cabeçalho:`);
    console.log(`Authorization: Bearer ${EXPECTED_AUTH_TOKEN}`);
    console.log(`Para testar acesso não autorizado, envie sem o cabeçalho ou com um token inválido.`);
    console.log(`Para testar o endpoint público, acesse http://localhost:${port}/public-data`);
});
*/

// Exemplo de como testar com curl:
// 1. Acesso autorizado:
// curl -H "Authorization: Bearer meu-token-secreto-123" http://localhost:3000/confidential-data
// 2. Acesso não autorizado (token inválido):
// curl -H "Authorization: Bearer token-errado" http://localhost:3000/confidential-data
// 3. Acesso não autorizado (sem token):
// curl http://localhost:3000/confidential-data
// 4. Acesso público:
// curl http://localhost:3000/public-data

