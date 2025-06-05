# Missão Prática: Análise do Cenário e Plano de Refatoração

## Contexto da Aplicação Legada

A Missão Prática apresenta um cenário realista de uma aplicação web legada (frontend + backend API REST em Node.js/Express) com sérias falhas de segurança identificadas pelo time de segurança da Software House.

**Arquitetura e Fluxo:**

*   **Backend:** API REST em Node.js/Express.
*   **Autenticação/Sessão:** Após o login (`/api/auth/login`), a aplicação gera um `session-id`.
*   **Uso do `session-id`:** Este `session-id` é anexado às URLs dos endpoints protegidos (ex: `/api/users/:sessionid`, `/api/contracts/:empresa/:inicio/:sessionid`).
*   **Código Fornecido:** O arquivo `pasted_content.txt` inclui o código-fonte do backend Node.js/Express, incluindo endpoints, funções auxiliares e dados mockados.

**Vulnerabilidades Identificadas:**

1.  **Mecanismo de `session-id` Inseguro:**
    *   O `session-id` é gerado criptografando o `id` do usuário (`{"usuario_id": ID}`) usando `crypto.createCipher('aes-256-cbc', secretKey)`.
    *   A chave secreta (`secretKey`) é previsível e fraca: `'nomedaempresa'`. Isso torna a criptografia suscetível a ataques de força bruta ou engenharia reversa, especialmente se o algoritmo e a chave forem descobertos.
    *   Um atacante, ao obter um `session-id` válido (mesmo de um usuário comum), pode tentar decifrá-lo (usando o endpoint de decrypt fornecido para estudo ou offline) e descobrir o padrão (`{"usuario_id": ID}`).
    *   Com o padrão e a chave fraca, o atacante pode gerar `session-id`s para outros `usuario_id`s (ex: tentar IDs sequenciais ou comuns como 1, 100, 124 - que é o admin) e acessar recursos indevidamente, escalando privilégios (como acessar `/api/users/:sessionid` com um ID de admin forjado).
    *   O endpoint `/api/auth/decrypt/:sessionid` (presente apenas para fins de estudo) expõe diretamente a fraqueza, permitindo a qualquer um decifrar um `session-id` válido.

2.  **Falta de Validação e Sanitização de Entradas:**
    *   O endpoint `/api/contracts/:empresa/:inicio/:sessionid` recebe parâmetros (`empresa`, `inicio`) diretamente da URL.
    *   A função `getContracts` constrói uma query SQL concatenando diretamente esses parâmetros: `` `Select * from contracts Where empresa = '${empresa}' And data_inicio = '${inicio}'` ``.
    *   Isso cria uma vulnerabilidade clássica de **SQL Injection**. Um atacante pode manipular os parâmetros `empresa` ou `inicio` na URL para injetar código SQL malicioso, potencialmente lendo, modificando ou excluindo dados da tabela `contracts` ou até mesmo de outras tabelas.
    *   Outros endpoints que recebem parâmetros (como `:sessionid` ou dados no corpo da requisição) também podem estar vulneráveis se não houver validação adequada.

3.  **Controle de Acesso Insuficiente (Implícito):**
    *   Embora o endpoint `/api/users/:sessionid` verifique o perfil 'admin', o endpoint `/api/contracts/...` não realiza nenhuma verificação de perfil ou autorização específica, dependendo apenas da validade (frágil) do `session-id`.

## Plano de Refatoração

O objetivo é refatorar a aplicação para corrigir as vulnerabilidades identificadas, aplicando as boas práticas de segurança aprendidas nas microatividades.

**Passos da Refatoração:**

1.  **Substituir o Sistema de `session-id` por JWT:**
    *   Remover completamente a lógica de criptografia/decriptografia baseada em `crypto.createCipher` e a chave `'nomedaempresa'`. Isso inclui as funções `encrypt`, `decrypt` e o endpoint `/api/auth/decrypt/:sessionid`.
    *   Modificar o endpoint de login (`/api/auth/login`) para, em vez de gerar o `session-id` criptografado, gerar um **JSON Web Token (JWT)** seguro (usando a biblioteca `jsonwebtoken`).
    *   O JWT deve conter o `userId` e o `perfil` (role) no payload.
    *   O JWT deve ter um **tempo de expiração (`exp`)** definido (ex: 1 hora, 8 horas).
    *   O JWT deve ser assinado com uma **chave secreta forte e segura** (armazenada preferencialmente como variável de ambiente, não hardcoded).
    *   O endpoint de login deve retornar o JWT para o cliente.

2.  **Implementar Middleware de Autenticação e Autorização Baseado em JWT:**
    *   Criar um middleware Express (`authenticateJWT`) que:
        *   Extraia o JWT do cabeçalho `Authorization: Bearer <token>` das requisições.
        *   Verifique a validade do JWT usando `jwt.verify()` (valida assinatura e expiração).
        *   Se válido, anexe o payload decodificado (contendo `userId`, `perfil`, etc.) ao objeto `req` (ex: `req.user`).
        *   Se inválido (expirado, assinatura incorreta, ausente), retorne um erro HTTP apropriado (401 ou 403).
    *   Aplicar este middleware a todos os endpoints que requerem autenticação (ex: `/api/users`, `/api/contracts`).
    *   Modificar os endpoints protegidos para obter o `userId` e `perfil` de `req.user` em vez de decifrar um `session-id`.
    *   Ajustar a lógica de autorização: O endpoint `/api/users` deve verificar `req.user.perfil === 'admin'`. O endpoint `/api/contracts` pode requerer apenas autenticação (token válido) ou também alguma verificação de perfil, se aplicável.

3.  **Prevenir SQL Injection em `getContracts`:**
    *   Refatorar a função `getContracts` para usar **consultas parametrizadas**.
    *   A query SQL deve usar placeholders (ex: `$1`, `$2` ou `?`) em vez de concatenação direta: `` `SELECT * FROM contracts WHERE empresa = $1 AND data_inicio = $2` ``.
    *   Os valores dos parâmetros (`empresa`, `inicio`) devem ser passados separadamente para o método de execução da query da biblioteca do banco de dados (a classe `Repository` simulada precisará ser adaptada ou substituída por uma implementação real ou mock que suporte parametrização).

4.  **Validação Geral de Entradas (Sanitização):**
    *   Embora o foco principal seja SQL Injection em `getContracts`, é uma boa prática adicionar validação básica para outros parâmetros recebidos (ex: verificar se `:empresa` e `:inicio` não estão vazios, se `:inicio` tem formato de data esperado, etc.). Bibliotecas como `express-validator` podem ser úteis para isso em aplicações maiores.

5.  **Limpeza do Código:**
    *   Remover código não utilizado ou inseguro (funções `encrypt`/`decrypt`, endpoint de decrypt, lógica antiga de `session-id`).
    *   Adicionar comentários explicando as mudanças de segurança.

Este plano aborda as vulnerabilidades críticas de autenticação/sessão e injeção de SQL, tornando a aplicação significativamente mais segura.
