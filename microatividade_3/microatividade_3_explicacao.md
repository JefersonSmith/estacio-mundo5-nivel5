# Microatividade 3: Prevenção de Ataques com Tokens Desprotegidos/Desatualizados (JWT)

## Contexto

A terceira microatividade foca na segurança do uso de tokens de autenticação, especificamente JSON Web Tokens (JWT), em aplicações web com arquitetura frontend-backend. O código original (fragmentos de JS e pseudocódigo) demonstra um fluxo comum de autenticação onde o backend gera um JWT após o login, e o frontend o armazena (no `localStorage`) para enviá-lo em requisições subsequentes.

```javascript
// Backend Original (JS + pseudocódigo)
function do_Login(){
  // ... (lógica de login)
  jwt_token = BASE64URL(UTF8(JWS Protected Header)) + "." +
             BASE64URL(JWS Payload) + "." +
             BASE64URL(JWS Signature)
  return jwt_token
}

function do_SomeAction(jwt){
  //Executar alguma ação (sem validação de token explícita aqui)
}

// Frontend Original (JS + pseudocódigo)
function login(){
  // ... (fetch para /auth)
  .then(json => {
    localStorage.setItem("token", json.jwt_token) // Armazena token no localStorage
  });
}

function doAction(){
  const token = localStorage.getItem("token") // Recupera token
  fetch("https://dominio.com/do_SomeAction", {
    // ... (configurações do fetch)
    headers: {
      // ...
      "Authorization": `Bearer ${token}`, // Envia token no cabeçalho
    }
  })
  // ...
}
```

As principais vulnerabilidades neste fluxo simplificado são:

1.  **Falta de Expiração no Token (Backend):** O JWT gerado não inclui uma *claim* de expiração (`exp`). Isso significa que o token, uma vez emitido, é válido indefinidamente, a menos que seja explicitamente invalidado (o que é complexo de gerenciar sem um mecanismo de revogação).
2.  **Falta de Validação de Expiração (Backend):** A função `do_SomeAction` no backend não verifica se o token recebido está expirado antes de processar a ação.
3.  **Armazenamento Inseguro (Frontend):** O `localStorage` é vulnerável a ataques de Cross-Site Scripting (XSS). Se um script malicioso for injetado na página, ele pode ler o token do `localStorage` e roubá-lo.
4.  **Falta de Validação de Expiração (Frontend):** O frontend envia o token para o backend sem verificar previamente se ele já expirou. Isso causa requisições desnecessárias que serão rejeitadas pelo backend (se ele validar a expiração), ou pior, processadas indevidamente (se o backend não validar).

## Objetivo

O objetivo é refatorar o código do backend e do frontend para mitigar essas vulnerabilidades:

**Backend:**

1.  **Incluir Expiração no JWT:** Adicionar a *claim* `exp` (Expiration Time) ao payload do JWT durante sua geração, definindo um tempo de vida útil para o token.
2.  **Validar Token (Incluindo Expiração):** Implementar uma validação robusta do JWT em endpoints protegidos. Essa validação deve verificar a assinatura do token e se ele não está expirado. Usar bibliotecas de terceiros para JWT é a prática recomendada.
3.  **Retornar Erro Genérico:** Se a validação falhar (token inválido, expirado, etc.), retornar um erro HTTP apropriado (ex: 401 ou 403) com uma mensagem genérica.

**Frontend:**

1.  **Armazenar Expiração:** Além do JWT, armazenar também sua data/hora de expiração (ou o próprio token decodificado, se seguro) para permitir a verificação no lado do cliente.
2.  **Validar Expiração Antes de Enviar:** Antes de fazer uma requisição ao backend que necessite do token, verificar se ele ainda é válido (não expirado). Se estiver expirado, não realizar a requisição.
3.  **Gerenciar Token Expirado:** Implementar uma estratégia para lidar com tokens expirados:
    *   Redirecionar o usuário para a página de login para obter um novo token.
    *   (Opcional/Avançado) Implementar um fluxo de *refresh token* para obter um novo token de acesso sem exigir que o usuário faça login novamente.

## Solução Proposta

Implementaremos as melhorias usando Node.js/Express no backend com a biblioteca `jsonwebtoken` para manipulação de JWTs, e JavaScript puro no frontend.

**Backend (Node.js/Express):**

*   Usaremos `jsonwebtoken` para gerar JWTs com a *claim* `exp`.
*   Criaremos um middleware de autenticação que usa `jwt.verify()` para validar o token (assinatura e expiração) recebido no cabeçalho `Authorization`.

**Frontend (JavaScript):**

*   Após o login, armazenaremos o token JWT e sua data de expiração (calculada a partir do payload do token ou recebida do backend).
*   Criaremos uma função auxiliar para verificar a validade do token antes de cada requisição protegida.
*   Se o token estiver expirado, redirecionaremos para o login (implementação mais simples).
*   **Nota sobre Armazenamento:** Embora o exercício mencione `localStorage`, é importante notar que para maior segurança contra XSS, armazenar tokens em cookies `HttpOnly` e `Secure` é geralmente preferível. No entanto, seguiremos a instrução de usar `localStorage` para fins didáticos, mas com a ressalva de seus riscos.

Esta abordagem garante que os tokens tenham um tempo de vida limitado e que tanto o backend quanto o frontend validem sua expiração, prevenindo o acesso não autorizado com tokens antigos ou roubados.
