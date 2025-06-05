// Código Refatorado (Exemplo com Node.js e biblioteca 'pg' para PostgreSQL)
// Nota: Este é um exemplo ilustrativo. A configuração real do cliente DB
// e o tratamento de erros podem variar.

// --- Simulação de Configuração do Banco de Dados (usando 'pg') ---
/*
const { Pool } = require("pg");

const pool = new Pool({
    user: "db_user",
    host: "localhost",
    database: "api_database",
    password: "secret_password",
    port: 5432,
});

// Função auxiliar para executar queries parametrizadas
async function executeQuery(queryText, queryValues) {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(queryText, queryValues);
        return result;
    } catch (error) {
        console.error("Erro na execução da query:", error);
        throw error; // Re-lança o erro para ser tratado no chamador
    } finally {
        if (client) {
            client.release(); // Libera o cliente de volta para o pool
        }
    }
}
*/

// --- Função Refatorada para Prevenir SQL Injection ---

async function doSecureDBAction(id) {
    // 1. Validar/Sanitizar a entrada 'id' (Opcional, mas recomendado)
    //    Exemplo: Verificar se 'id' é um número inteiro válido, se aplicável.
    //    Se a validação falhar, pode retornar um erro antes de consultar o DB.
    /*
    if (!Number.isInteger(parseInt(id))) {
        console.error("ID inválido fornecido:", id);
        throw new Error("Formato de ID inválido.");
    }
    */

    // 2. Definir a query SQL com um placeholder ($1 para pg)
    const queryText = "SELECT * FROM users WHERE userID = $1";

    // 3. Definir os valores dos parâmetros em um array
    const queryValues = [id];

    console.log(`Executando query segura: ${queryText} com valores: [${queryValues.join(", ")}]`);

    try {
        // 4. Executar a query usando a função auxiliar que lida com a conexão
        //    e passa os parâmetros de forma segura.
        // const result = await executeQuery(queryText, queryValues); // Descomente ao usar DB real

        // --- Simulação do resultado do banco de dados ---
        console.log("Simulando execução da query no banco de dados...");
        let simulatedRows = [];
        // Simula encontrar um usuário se o ID for '10' (como no exemplo original seguro)
        if (id === "10") {
            simulatedRows = [{ userID: "10", name: "Usuário Dez", email: "dez@example.com" }];
        }
        // Se o ID for a tentativa de injeção, não encontrará nada (simulação)
        else if (id === "' or '1'='1--") {
             simulatedRows = []; // A query parametrizada buscaria literalmente por este ID
        }
        const result = { rows: simulatedRows };
        // --- Fim da Simulação ---

        console.log("Usuários encontrados:", result.rows);
        return result.rows;

    } catch (error) {
        console.error("Erro ao executar a consulta segura:", error);
        // Tratar o erro apropriadamente (ex: log detalhado, retornar erro HTTP 500)
        throw new Error("Falha ao buscar dados do usuário.");
    }
}

// --- Exemplo de como chamar a função (simulando recebimento da requisição) ---

async function handleRequest(inputId) {
    console.log(`\n--- Testando com ID: ${inputId} ---`);
    try {
        const users = await doSecureDBAction(inputId);
        if (users.length > 0) {
            console.log("Resultado: Usuários encontrados.", users);
        } else {
            console.log("Resultado: Nenhum usuário encontrado com este ID.");
        }
    } catch (error) {
        console.log(`Resultado: Erro - ${error.message}`);
    }
}

// Simular chamadas com diferentes IDs
(async () => {
    await handleRequest("10"); // ID válido
    await handleRequest("99"); // ID válido, mas não existente (simulado)
    await handleRequest("' or '1'='1--"); // Tentativa de SQL Injection
})();

