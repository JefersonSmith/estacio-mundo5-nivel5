# Missão Prática: Código Refatorado

Este arquivo contém o código Node.js/Express da aplicação legada, refatorado para corrigir as vulnerabilidades de segurança identificadas (session-id inseguro, falta de validação de entrada, SQL Injection) conforme o plano de refatoração.

**Principais Alterações:**

1.  **Autenticação/Sessão:** O sistema de `session-id` baseado em criptografia fraca foi substituído por JSON Web Tokens (JWT) com tempo de expiração e assinatura segura.
2.  **Middleware de Autenticação:** Um middleware (`authenticateJWT`) foi implementado para verificar o JWT em todas as rotas protegidas.
3.  **Prevenção de SQL Injection:** A função `getContracts` foi modificada para demonstrar o uso de consultas parametrizadas, prevenindo a injeção de SQL.
4.  **Limpeza:** Código inseguro e não utilizado (funções `encrypt`/`decrypt`, endpoint de decriptografia) foi removido.
5.  **Rotas Atualizadas:** As rotas protegidas agora esperam o JWT no cabeçalho `Authorization: Bearer <token>` e não mais o `session-id` como parâmetro de URL.
