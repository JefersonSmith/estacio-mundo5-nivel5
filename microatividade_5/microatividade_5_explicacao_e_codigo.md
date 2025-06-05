# Microatividade 5: Tratamento de CRLF Injection em Códigos-Fonte

## Contexto

A quinta microatividade foca na vulnerabilidade de Injeção de CRLF (Carriage Return Line Feed), também conhecida como HTTP Response Splitting. O exemplo fornecido utiliza um script PHP que realiza um redirecionamento baseado em uma URL passada como parâmetro GET:

```php
// Código Original Vulnerável (PHP)
<?php
$redirectUrl = $_GET["url"]; // Obtém URL do parâmetro GET
header("Location: " . $redirectUrl); // Usa a URL diretamente no cabeçalho Location
?>
```

A vulnerabilidade ocorre porque o script insere diretamente a entrada do usuário (`$redirectUrl`) no cabeçalho HTTP `Location` sem qualquer validação ou sanitização. Os caracteres CRLF (`\r\n`, codificados na URL como `%0D%0A`) são usados para separar cabeçalhos e o corpo da resposta em HTTP. Se um atacante conseguir injetar esses caracteres através do parâmetro `url`, ele pode "quebrar" o cabeçalho `Location` e injetar cabeçalhos HTTP adicionais ou até mesmo conteúdo no corpo da resposta.

O exemplo de ataque demonstra isso:
`http://dominio.com/index.php?url=http://sitefake-malicioso.com/%0D%0AContent-Length:%200%0D%0A%0D%0AHTTP/1.1%20200%20OK%0D%0A%0D%0Aevilcontent`

Neste ataque, o valor injetado para `url` contém:

1.  `http://sitefake-malicioso.com/`: Uma URL maliciosa inicial.
2.  `%0D%0A` (CRLF): Termina o cabeçalho `Location` prematuramente.
3.  `Content-Length: 0`: Injeta um novo cabeçalho.
4.  `%0D%0A%0D%0A`: Dois CRLFs, indicando o fim dos cabeçalhos e o início do corpo da resposta.
5.  `HTTP/1.1 200 OK%0D%0A%0D%0Aevilcontent`: Injeta uma resposta HTTP falsa no corpo da resposta original.

Isso pode levar a ataques como Cross-Site Scripting (XSS), envenenamento de cache, sequestro de página, entre outros.

## Objetivo

O objetivo é criar uma funcionalidade semelhante de redirecionamento em uma linguagem de programação à escolha (usaremos Node.js/Express) e implementar as seguintes medidas de segurança:

1.  **Prevenir CRLF Injection:** Tratar a URL recebida para remover ou rejeitar quaisquer caracteres CRLF (`\r` ou `\n`) antes de usá-la no cabeçalho de redirecionamento.
2.  **Impedir Redirecionamentos Abertos (Opcional, mas recomendado):** Validar a URL de redirecionamento para garantir que ela aponte para um domínio confiável ou, preferencialmente, apenas para URLs dentro do próprio domínio da aplicação. Isso previne que a funcionalidade seja usada para redirecionar usuários para sites maliciosos (Open Redirect).

## Solução Proposta (Node.js/Express)

Implementaremos um endpoint em Node.js usando o framework Express que recebe uma URL via query parameter e realiza um redirecionamento seguro.

1.  **Obtenção do Parâmetro:** Obter a URL do `req.query.url`.
2.  **Validação de CRLF:** Verificar se a URL contém `\r` ou `\n`. Se contiver, rejeitar a requisição com um erro (ex: 400 Bad Request) ou remover os caracteres ofensivos.
3.  **Validação de Domínio (Prevenção de Open Redirect):**
    *   Parsear a URL fornecida usando a classe `URL` nativa do Node.js.
    *   Comparar o `origin` (protocolo + hostname + porta) da URL fornecida com o `origin` esperado da aplicação. Permitir apenas redirecionamentos para o mesmo `origin` ou para uma lista pré-aprovada de domínios seguros.
    *   Alternativamente, permitir apenas URLs relativas (que começam com `/`), garantindo que o redirecionamento permaneça dentro do mesmo domínio.
4.  **Redirecionamento Seguro:** Se ambas as validações passarem, usar `res.redirect(statusCode, validatedUrl)` para realizar o redirecionamento.

```javascript
// Código Refatorado (Node.js/Express)

const express = require("express");
const { URL } = require("url"); // Módulo nativo do Node.js

const app = express();

// Define o domínio/origem esperado da aplicação
// Em um app real, isso viria de configurações
const APP_ORIGIN = "http://meudominio.com"; 

app.get("/redirect", (req, res) => {
    let redirectUrl = req.query.url;

    // 1. Verificar se a URL foi fornecida
    if (!redirectUrl) {
        return res.status(400).send("Parâmetro 'url' é obrigatório.");
    }

    // 2. Validar e Sanitizar contra CRLF Injection
    if (redirectUrl.includes("\r") || redirectUrl.includes("\n")) {
        console.warn("Tentativa de CRLF Injection detectada na URL:", redirectUrl);
        // Opção 1: Rejeitar a requisição
        return res.status(400).send("URL inválida (contém caracteres de nova linha).");
        // Opção 2: Sanitizar (remover CRLF) - Menos seguro, pois pode mascarar intenções
        // redirectUrl = redirectUrl.replace(/[\r\n]/g, "); 
    }

    // 3. Validar contra Open Redirect
    try {
        const parsedUrl = new URL(redirectUrl, APP_ORIGIN); // O segundo argumento resolve URLs relativas

        // Permitir apenas URLs relativas (começam com /) ou URLs absolutas DENTRO do mesmo domínio
        const isRelative = redirectUrl.startsWith("/") && !redirectUrl.startsWith("//");
        const isSameOrigin = parsedUrl.origin === APP_ORIGIN;

        if (!isRelative && !isSameOrigin) {
            console.warn("Tentativa de Open Redirect bloqueada:", redirectUrl, "| Origin:", parsedUrl.origin);
            // Redireciona para uma página segura padrão ou retorna erro
            return res.status(400).send("Redirecionamento para domínios externos não permitido.");
            // Ou redirecionar para a home: res.redirect("/"); 
        }
        
        // Se chegou aqui, a URL é considerada segura (sem CRLF e mesmo domínio ou relativa)
        console.log("Redirecionando para URL validada:", redirectUrl);
        // Usa res.redirect() que define o cabeçalho Location corretamente
        res.redirect(302, redirectUrl); // 302 Found (redirecionamento temporário)

    } catch (error) {
        // Erro ao parsear a URL (URL mal formada)
        if (error instanceof TypeError && error.code === "ERR_INVALID_URL") {
            console.warn("URL inválida fornecida para redirecionamento:", redirectUrl);
            return res.status(400).send("Formato de URL inválido.");
        } else {
            // Outro erro inesperado
            console.error("Erro inesperado ao processar redirecionamento:", error);
            return res.status(500).send("Erro interno no servidor.");
        }
    }
});

// --- Para testar localmente (opcional) ---
/*
const port = 3002; // Use porta diferente
app.listen(port, () => {
    console.log(`Servidor (Microatividade 5) rodando em http://localhost:${port}`);
    console.log(`Teste redirecionamento válido (relativo): http://localhost:${port}/redirect?url=/pagina-segura`);
    console.log(`Teste redirecionamento válido (absoluto mesmo domínio): http://localhost:${port}/redirect?url=http://meudominio.com/outra-pagina`);
    console.log(`Teste Open Redirect (bloqueado): http://localhost:${port}/redirect?url=http://site-externo-malicioso.com`);
    console.log(`Teste CRLF Injection (bloqueado): http://localhost:${port}/redirect?url=http://meudominio.com/%0D%0AInjectedHeader:Value`);
});
*/
```

Esta solução implementa as defesas necessárias: verifica e rejeita caracteres CRLF e garante que o redirecionamento ocorra apenas para URLs relativas ou dentro do domínio da aplicação, mitigando tanto CRLF Injection quanto Open Redirect.
