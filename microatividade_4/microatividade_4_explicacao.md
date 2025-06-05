# Microatividade 4: Tratamento de SQL Injection em Códigos-Fonte

## Contexto

A quarta microatividade aborda uma das vulnerabilidades web mais conhecidas e perigosas: a Injeção de SQL (SQL Injection). O cenário apresentado descreve uma função que constrói uma consulta SQL concatenando diretamente um parâmetro (`id`) recebido de uma requisição HTTP na string da query.

```javascript
// Código Original Vulnerável (Exemplo em JS)
function doDBAction(id) {
  // O parâmetro 'id' vem diretamente da URL, ex: /app/usuario?id=10
  var query = "SELECT * FROM users WHERE userID='" + id + "'";
  
  // ... (execução da query no banco de dados)
}
```

Neste código, o valor do parâmetro `id`, que vem da URL (ex: `https://dominio.com/app/usuario?id=10`), é diretamente inserido na string da consulta SQL. A vulnerabilidade reside no fato de que um atacante pode manipular o valor de `id` na URL para injetar código SQL malicioso.

O exemplo de ataque fornecido é:
`http://example.com/app/userView?id=' or '1'='1--`

Quando esse valor de `id` (`' or '1'='1--`) é concatenado na query, a consulta resultante se torna:
`SELECT * FROM users WHERE userID='' or '1'='1--'`

Análise da Query Maliciosa:

*   `userID=''` : Compara `userID` com uma string vazia (provavelmente falso).
*   `or '1'='1'` : A condição `'1'='1'` é sempre verdadeira.
*   `--` : Comenta o resto da linha na maioria dos dialetos SQL, ignorando a apóstrofe final original da query (`'`).

A condição `WHERE` se torna efetivamente `WHERE '' or TRUE`, o que faz com que a consulta retorne **todos** os registros da tabela `users`, expondo dados indevidamente.

## Objetivo

O objetivo é refatorar o código para eliminar a vulnerabilidade de SQL Injection. Isso deve ser feito tratando adequadamente o parâmetro de entrada (`id`) antes de usá-lo na consulta SQL, impedindo que código SQL arbitrário seja executado.

## Solução Proposta

A principal técnica para prevenir SQL Injection é **nunca concatenar diretamente a entrada do usuário na string da query SQL**. Em vez disso, deve-se usar **consultas parametrizadas** (parameterized queries) ou **declarações preparadas** (prepared statements).

**Consultas Parametrizadas / Declarações Preparadas:**

1.  **Definição da Query:** A estrutura da consulta SQL é definida com *placeholders* (marcadores de posição, como `?`, `$1`, `:id`) no lugar onde os valores de entrada seriam inseridos.
2.  **Separação de Código e Dados:** O driver do banco de dados recebe a estrutura da query e os valores dos parâmetros separadamente.
3.  **Tratamento Seguro:** O driver trata os valores dos parâmetros como dados literais, e não como código SQL executável. Ele garante que os valores sejam corretamente escapados ou tratados de forma a não alterar a lógica da consulta original, mesmo que contenham caracteres especiais de SQL.

**Exemplo de Refatoração (Usando Node.js com uma biblioteca de banco de dados genérica como `pg` para PostgreSQL ou `mysql2` para MySQL):**

O código refatorado usará um placeholder na query e passará o valor do `id` como um parâmetro separado para a função de execução da query.

```javascript
// Código Refatorado (Exemplo com Node.js e placeholders tipo $1 ou ?)

// Assumindo uma biblioteca de banco de dados como 'pg' (PostgreSQL) ou 'mysql2' (MySQL)
// const dbClient = require('sua-biblioteca-db'); 

async function doSecureDBAction(id) {
  // 1. Definir a query com um placeholder ($1 para pg, ? para mysql2)
  const queryText = "SELECT * FROM users WHERE userID = $1"; // Ou: "SELECT * FROM users WHERE userID = ?"

  // 2. Definir os valores dos parâmetros em um array
  const queryValues = [id];

  try {
    // 3. Executar a query passando o texto e os valores separadamente
    // A biblioteca do DB cuidará de tratar 'id' de forma segura.
    const result = await dbClient.query(queryText, queryValues);
    
    console.log("Usuários encontrados:", result.rows); // Exemplo com 'pg'
    return result.rows;
  } catch (error) {
    console.error("Erro ao executar a consulta:", error);
    // Tratar o erro apropriadamente (ex: log, retornar erro HTTP)
    throw new Error("Falha ao buscar dados do usuário.");
  }
}

// Exemplo de como chamar a função (o 'id' viria da requisição HTTP)
// const userIdFromRequest = req.query.id; // Ou req.params.id dependendo da rota
// doSecureDBAction(userIdFromRequest)
//   .then(users => { /* ... fazer algo com os usuários ... */ })
//   .catch(err => { /* ... tratar erro ... */ });
```

Esta abordagem garante que, mesmo se um atacante tentar injetar SQL através do parâmetro `id` (ex: `' or '1'='1--`), o valor será tratado como uma string literal a ser comparada com `userID`, e não como parte do comando SQL. A consulta buscaria literalmente por um usuário cujo ID é a string `' or '1'='1--`, o que provavelmente não retornaria nenhum resultado, prevenindo o ataque.
