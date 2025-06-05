# Microatividade 1: Controle Básico de Acesso em API REST

## Contexto

A primeira microatividade do trabalho foca na implementação de um controle de acesso fundamental em um endpoint de API REST. O código original fornecido, escrito em Javascript com o framework Express, expõe uma vulnerabilidade crítica: ele processa a requisição e retorna dados confidenciais (`/confidential-data`) sem qualquer tipo de verificação de autenticação ou autorização.

```javascript
// Código Original Vulnerável
app.get('/confidential-data', (req, res) => {
  //executa um serviço fictício para obter os dados a serem retornados
  jsonData = service.call(req)

  //retorna os dados
  res.json(jsonData)
});
```

Qualquer cliente que conheça o endereço do endpoint pode acessá-lo livremente, o que representa um risco de segurança significativo, especialmente se os dados retornados forem sensíveis.

## Objetivo

O objetivo é modificar ou reescrever o código para incluir um mecanismo de autenticação simples. Antes de processar a requisição e chamar o serviço (`service.call(req)`), o código deve verificar se o requisitante está autorizado. Se a autenticação falhar, a API deve retornar um status HTTP 401 (Não Autorizado) e uma mensagem genérica. Se a autenticação for bem-sucedida, a API deve prosseguir com a execução normal e retornar os dados.

## Solução Proposta

Para atender aos requisitos, implementaremos uma verificação básica de autenticação. Neste exemplo, utilizaremos a verificação de um token simples passado através do cabeçalho `Authorization` da requisição HTTP. Em um cenário real, mecanismos mais robustos como JWT (JSON Web Tokens) ou OAuth seriam recomendados, mas para fins didáticos, um token estático é suficiente para ilustrar o conceito.

O código modificado incluirá:

1.  **Middleware de Autenticação:** Uma função que intercepta a requisição antes que ela chegue ao handler principal do endpoint.
2.  **Verificação do Token:** Dentro do middleware, o código verificará a presença e a validade do token no cabeçalho `Authorization`.
3.  **Resposta Condicional:**
    *   Se o token for inválido ou ausente, a resposta será `401 Unauthorized` com uma mensagem genérica.
    *   Se o token for válido, a execução continuará (`next()`), permitindo que o handler principal processe a requisição e retorne os dados.

Esta abordagem garante que apenas requisitantes autenticados possam acessar o recurso `/confidential-data`, mitigando a vulnerabilidade original.
