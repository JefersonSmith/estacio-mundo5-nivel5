# Microatividade 2: Tratamento de Dados Sensíveis e Log de Erros

## Contexto

A segunda microatividade aborda práticas essenciais de segurança no tratamento de dados sensíveis, especificamente durante o processo de login, e a importância de mensagens de erro seguras. O fragmento de pseudocódigo original apresenta várias vulnerabilidades:

```pseudocode
// Código Original Vulnerável (Pseudocódigo)
password = new_password
username = new_username

#Verifica se o nome de usuário já está em uso
IF USER_EXISTS(username) THEN
  RETURN Error("Já existe usuário com esse nome.")
ENDIF

#Limita a senha a apenas caracteres numéricos
IF  NOT IS_NUMERIC(password)  THEN
  RETURN Error("Senha inválida")
ENDIF

#Verifica as credenciais, sem limite de tentativas
#Verifica a senha e o usuário, informando qual deles, quando for o caso, não é válido
IS_VALID_PASSWORD=LOOKUP_CREDENTIALS_IN_DATABASE(username, password)
IF NOT IS_VALID_PASSWORD THEN
  RETURN Error("Senha Inválida!")
ENDIF

IS_VALID_USERNAME=LOOKUP_CREDENTIALS_IN_DATABASE(username, password)
IF NOT IS_VALID_USERNAME THEN
  RETURN Error("Usuário Inválido!")
ENDIF
```

As principais falhas são:

1.  **Restrição Inadequada de Senha:** Exige que a senha seja apenas numérica, o que enfraquece significativamente a segurança.
2.  **Falta de Complexidade Mínima:** Não exige um comprimento mínimo para a senha.
3.  **Mensagens de Erro Detalhadas:** Informa especificamente se o *usuário* ou a *senha* está inválido. Isso permite que atacantes usem técnicas de enumeração de usuários para descobrir nomes de usuário válidos no sistema.
4.  **Ausência de Limite de Tentativas:** Não há um mecanismo para bloquear ou retardar tentativas de login após falhas repetidas, tornando o sistema vulnerável a ataques de força bruta.

## Objetivo

O objetivo é refatorar o pseudocódigo para incorporar boas práticas de segurança:

1.  **Definir e Validar Comprimento Mínimo da Senha:** Estabelecer um requisito de comprimento mínimo (ex: 8 caracteres) e verificar se ele é atendido.
2.  **Permitir Caracteres Diversos na Senha:** Remover a restrição de senha apenas numérica.
3.  **Implementar Limite de Tentativas:** Introduzir um contador de tentativas falhas associado ao nome de usuário ou endereço IP, bloqueando temporariamente o acesso após um certo número de falhas.
4.  **Usar Mensagens de Erro Genéricas:** Substituir as mensagens específicas ("Usuário Inválido!", "Senha Inválida!") por uma mensagem genérica (ex: "Usuário ou senha incorretos") para evitar a enumeração de usuários.

## Solução Proposta (Pseudocódigo Refatorado)

O pseudocódigo a seguir incorpora as melhorias de segurança solicitadas. Ele introduz validações de senha mais robustas, um mecanismo (simplificado) de limite de tentativas e mensagens de erro genéricas.

```pseudocode
// Pseudocódigo Refatorado

// Constantes de Configuração de Segurança
DEFINE MIN_PASSWORD_LENGTH = 8
DEFINE MAX_LOGIN_ATTEMPTS = 5
DEFINE LOCKOUT_DURATION_MINUTES = 15

FUNCTION process_login(username, password)

  // 1. Verificar se o usuário está bloqueado por tentativas excessivas
  IF is_user_locked_out(username) THEN
    RETURN Error("Conta temporariamente bloqueada devido a múltiplas tentativas falhas.")
  ENDIF

  // 2. Validar comprimento mínimo da senha
  IF LENGTH(password) < MIN_PASSWORD_LENGTH THEN
    // Nota: Mesmo que a senha seja curta, não retornamos erro aqui ainda.
    // A validação final deve ser feita após a busca no banco, para evitar enumeração.
    // Apenas registramos a falha potencial internamente se necessário.
    // No entanto, para clareza didática, a validação está aqui, mas a mensagem de erro será genérica.
    increment_failed_login_attempt(username)
    RETURN Error("Usuário ou senha incorretos.") // Mensagem genérica
  ENDIF

  // 3. Remover restrição de senha numérica (implícito, não há mais verificação IS_NUMERIC)
  // A validação agora foca no comprimento e na correspondência no banco.

  // 4. Verificar credenciais no banco de dados
  user_data = LOOKUP_USER_IN_DATABASE(username)

  IF user_data IS NULL OR NOT verify_password(password, user_data.hashed_password) THEN
    // Credenciais inválidas (usuário não existe OU senha incorreta)
    increment_failed_login_attempt(username)

    // Verificar se o limite de tentativas foi atingido
    IF get_failed_login_attempts(username) >= MAX_LOGIN_ATTEMPTS THEN
      lock_user_account(username, LOCKOUT_DURATION_MINUTES)
      RETURN Error("Conta temporariamente bloqueada devido a múltiplas tentativas falhas.")
    ELSE
      // 5. Mensagem de erro genérica
      RETURN Error("Usuário ou senha incorretos.")
    ENDIF
  ELSE
    // Login bem-sucedido
    reset_failed_login_attempts(username)
    // Proceder com a criação da sessão do usuário, etc.
    RETURN Success("Login realizado com sucesso.", user_data)
  ENDIF

ENDFUNCTION

// --- Funções Auxiliares (Simuladas) ---

FUNCTION is_user_locked_out(username)
  // Verifica se o usuário está atualmente bloqueado (ex: consulta a uma tabela de bloqueios)
  // Retorna TRUE se bloqueado, FALSE caso contrário
ENDFUNCTION

FUNCTION increment_failed_login_attempt(username)
  // Incrementa o contador de tentativas falhas para o usuário (ex: no banco de dados)
ENDFUNCTION

FUNCTION get_failed_login_attempts(username)
  // Retorna o número atual de tentativas falhas para o usuário
ENDFUNCTION

FUNCTION lock_user_account(username, duration_minutes)
  // Marca a conta do usuário como bloqueada por um tempo determinado
ENDFUNCTION

FUNCTION reset_failed_login_attempts(username)
  // Zera o contador de tentativas falhas para o usuário
ENDFUNCTION

FUNCTION LOOKUP_USER_IN_DATABASE(username)
  // Busca o usuário no banco de dados pelo nome de usuário
  // Retorna os dados do usuário (incluindo hash da senha) ou NULL se não encontrado
ENDFUNCTION

FUNCTION verify_password(plain_password, hashed_password)
  // Compara a senha fornecida com o hash armazenado usando um algoritmo seguro (ex: bcrypt, Argon2)
  // Retorna TRUE se a senha corresponder, FALSE caso contrário
ENDFUNCTION
```

Este pseudocódigo refatorado demonstra como aplicar as práticas de segurança solicitadas, tornando o processo de login mais robusto contra ataques comuns e protegendo melhor as informações dos usuários.
