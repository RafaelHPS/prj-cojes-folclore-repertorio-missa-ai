# Guia de Especificações Técnicas
## Boas Práticas e Segurança — Frontend + Backend

> **Versão 3.0 · Maio 2025**
> Baseado em: OWASP Top 10:2025 · OWASP ASVS · WCAG 2.2 AA · W3C · Postman API Guidelines · Conventional Commits · AWS Prescriptive Guidance

---

## Sumário

- [PARTE 1 — FRONTEND](#parte-1--frontend)
  - [1. TypeScript — Tipagem e Qualidade de Código](#1-typescript--tipagem-e-qualidade-de-código)
  - [2. Arquitetura e Organização de Código](#2-arquitetura-e-organização-de-código)
  - [3. Segurança Frontend](#3-segurança-frontend)
  - [4. Performance e Core Web Vitals](#4-performance-e-core-web-vitals)
  - [5. Acessibilidade — WCAG 2.2 AA](#5-acessibilidade--wcag-22-aa)
  - [6. Formulários e Validação](#6-formulários-e-validação)
  - [7. Testes Frontend](#7-testes-frontend)
  - [8. Qualidade de Código Frontend](#8-qualidade-de-código-frontend)
- [PARTE 2 — BACKEND](#parte-2--backend)
  - [9. Arquitetura e Organização Backend](#9-arquitetura-e-organização-backend)
  - [10. Autenticação e Autorização](#10-autenticação-e-autorização)
  - [11. Segurança da API](#11-segurança-da-api)
  - [12. Segurança e Boas Práticas de Banco de Dados](#12-segurança-e-boas-práticas-de-banco-de-dados)
  - [13. Design de API REST](#13-design-de-api-rest)
  - [14. Logging, Observabilidade e Monitoramento](#14-logging-observabilidade-e-monitoramento)
  - [15. Infraestrutura, CI/CD e Gestão de Segredos](#15-infraestrutura-cicd-e-gestão-de-segredos)
- [PARTE 3 — PADRÕES DE DESENVOLVIMENTO](#parte-3--padrões-de-desenvolvimento)
  - [16. Nomenclatura — Variáveis, Funções e Constantes](#16-nomenclatura--variáveis-funções-e-constantes)
  - [17. Nomenclatura de Arquivos](#17-nomenclatura-de-arquivos)
  - [18. Git — Branches e Commits](#18-git--branches-e-commits)
  - [19. Padrões de Código — Estrutura e Boas Práticas](#19-padrões-de-código--estrutura-e-boas-práticas)
  - [20. Nomenclatura de Banco de Dados](#20-nomenclatura-de-banco-de-dados)
- [Resumo Executivo — Regras Inegociáveis](#resumo-executivo--regras-inegociáveis)

---

# PARTE 1 — FRONTEND

---

## 1. TypeScript — Tipagem e Qualidade de Código

TypeScript é o padrão obrigatório em projetos frontend modernos. Em 2025, sua adoção ultrapassa 80% dos projetos React/Next.js de médio e grande porte por eliminar categorias inteiras de bugs em tempo de compilação.

> 📌 **Fonte:** Syncfusion Frontend Trends 2026 · Medium TypeScript Best Practices 2025

### 1.1 Configuração Obrigatória — `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 1.2 Regras de Tipagem

- **NUNCA usar o tipo `any`** — substituir por `unknown` com narrowing explícito
- Usar `satisfies` para verificar conformidade mantendo tipos literais
- Interfaces para objetos de domínio; `type` para unions e utilitários
- Nunca usar type assertion (`as X`) sem verificação prévia
- Retornos de função sempre com tipo explícito declarado
- Template Literal Types para padrões de URL, eventos e chaves de dicionário

> 📌 **Fonte:** Medium — TypeScript Best Practices 2025 · DEV.to TypeScript 2025

---

## 2. Arquitetura e Organização de Código

A separação clara de responsabilidades reduz acoplamento e facilita testes.

> 📌 **Fonte:** Jalasoft Frontend Best Practices 2025 · Pagepro Web Development Best Practices 2026

### 2.1 Estrutura de Pastas

```
src/
├── pages/          # rotas — apenas composição de componentes
├── components/
│   ├── ui/         # átomos: Button, Input, Modal
│   └── shared/     # moléculas: Header, Sidebar, DataTable
├── features/       # módulos de domínio (auth, orders, users…)
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── services/   # chamadas de API do domínio
│       ├── store/
│       └── types.ts
├── services/       # clientes HTTP globais (axios instance)
├── store/          # estado global
├── hooks/          # hooks reutilizáveis
├── utils/          # funções puras e formatadores
├── types/          # tipos e interfaces globais
└── constants/
```

### 2.2 Regras de Camadas

| Camada | Responsabilidade |
|---|---|
| `pages/` | Apenas compõe componentes. Sem lógica direta. |
| `components/` | Recebem dados via props. Nunca chamam API diretamente. |
| `services/` | Única camada que faz chamadas HTTP. Retorna dados tipados. |
| `hooks/` | Encapsulam lógica de estado e efeitos. Testáveis isoladamente. |
| `store/` | Estado compartilhado entre rotas. Nunca armazena dados sensíveis. |
| `utils/` | Funções puras sem efeitos colaterais. 100% testáveis. |

- **Componentes funcionais com TypeScript** — proibido class components
- Máximo recomendado: **250 linhas** por componente. Acima disso, dividir.
- Props sempre tipadas com interface nomeada explícita

---

## 3. Segurança Frontend

O OWASP Top 10:2025 e o OWASP Top 10 Client-Side definem as categorias de risco prioritárias. Security Misconfiguration subiu para a posição **#2** em 2025 e afeta **90%** das aplicações testadas.

> 📌 **Fonte:** OWASP Top 10:2025 · OWASP Top 10 Client-Side · Digiqt React Security 2026

### 3.1 XSS — Cross-Site Scripting (OWASP A03)

#### 🚫 Proibido — Vetores de XSS

- `dangerouslySetInnerHTML` sem sanitização prévia com DOMPurify
- Inserção de conteúdo de usuário em `href`, `src` ou event handlers
- Uso de `eval()`, `new Function()` ou `setTimeout` com string
- `innerHTML` direto no DOM via refs

#### ✅ Obrigatório — Proteção contra XSS

- DOMPurify para sanitizar qualquer HTML gerado pelo usuário antes de renderizar
- Validar URLs (`href`, `src`) com lista de esquemas permitidos (`https`, `mailto`)
- Implementar Trusted Types API em browsers compatíveis
- Content Security Policy (CSP) configurada — ver regras na seção 3.3

### 3.2 Armazenamento de Tokens

| Local | Regra |
|---|---|
| `localStorage` | ❌ PROIBIDO para tokens — vulnerável a XSS |
| `sessionStorage` | ⚠️ Evitar para tokens — acessível por scripts |
| Variáveis JS globais | ❌ PROIBIDO — expostas no escopo global |
| Cookie `HttpOnly` + `Secure` | ✅ OBRIGATÓRIO para tokens de sessão |
| Cookie `SameSite=Strict` | ✅ OBRIGATÓRIO — protege contra CSRF |
| Memória (React state) | ✅ PERMITIDO para dados temporários não sensíveis |

> 📌 **Fonte:** OWASP Client-Side Top 10 — C07: Insecure Storage · Digiqt Next.js Security 2026

### 3.3 Headers de Segurança Obrigatórios

```js
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  object-src 'none';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

// Headers adicionais obrigatórios:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Referrer-Policy: strict-origin-when-cross-origin
// Strict-Transport-Security: max-age=63072000; includeSubDomains
```

> 📌 **Fonte:** OWASP A02:2025 Security Misconfiguration · Duende OWASP 2025

### 3.4 Dependências e Variáveis de Ambiente

- **Commitar `package-lock.json` sempre** — garante builds reproduzíveis
- `npm audit` no CI/CD — bloquear merge se houver vulnerabilidade crítica
- **NUNCA expor chaves secretas em variáveis `NEXT_PUBLIC_` ou `VITE_`**
- Chaves de API privilegiadas devem existir **SOMENTE no backend**
- `.env*` sempre no `.gitignore` — sem exceções

> 📌 **Fonte:** Digiqt React Security 2026 · OWASP A06:2025 Vulnerable Components

---

## 4. Performance e Core Web Vitals

| Métrica | Meta |
|---|---|
| LCP (Largest Contentful Paint) | ≤ 2,5 s |
| INP (Interaction to Next Paint) | ≤ 200 ms p75 |
| CLS (Cumulative Layout Shift) | ≤ 0,1 |
| FCP (First Contentful Paint) | ≤ 1,8 s |

> 📌 **Fonte:** Pagepro Web Best Practices 2026 · web.dev Core Web Vitals

- **React Server Components (RSC)** — reduz bundle em 60–70%
- Lazy loading em todas as rotas e componentes pesados (`React.lazy` + `Suspense`)
- Imagens: usar `next/image` — nunca `<img>` sem `width`/`height`
- Bundle analysis obrigatório antes de cada release (`next build --analyze`)
- Memoização (`useMemo`, `useCallback`) apenas onde há gargalo medido

---

## 5. Acessibilidade — WCAG 2.2 AA

Com o European Accessibility Act em vigor desde **junho de 2025**, a conformidade WCAG 2.2 AA é obrigatória para produtos digitais comerciais. No Brasil, a **Lei Brasileira de Inclusão (LBI)** também exige acessibilidade digital.

> 📌 **Fonte:** W3C WCAG 2.2 · AllAccessible WCAG Checklist 2025 · EAA 2025

### Checklist Obrigatório

- **Contraste mínimo 4,5:1** para texto normal e 3:1 para texto grande
- Área de toque mínima **24×24 px** em todos os elementos interativos *(WCAG 2.2 novo)*
- Navegação completa por teclado — sem armadilhas de foco
- Indicadores de foco visíveis com contraste ≥ 3:1
- Hierarquia de headings lógica — nunca pular níveis
- `alt` descritivo em imagens informativas; `alt=""` em decorativas
- Formulários: `label` visível ou `aria-label` em todos os inputs
- Mensagens de erro conectadas via `aria-describedby` ao campo relacionado
- Estados de loading anunciados via `aria-live` regions
- Respeitar `prefers-reduced-motion` — desativar animações quando solicitado
- Informação nunca transmitida exclusivamente por cor

> ⚠️ *Ferramentas automatizadas detectam apenas 30–50% dos problemas. Testes com screen readers são obrigatórios.*

> 📌 **Fonte:** W3C WCAG 2.2 · DrCodes React WCAG 2025 · DHUX WCAG React Guide 2026

---

## 6. Formulários e Validação

- **React Hook Form + Zod** — stack recomendada para formulários
- Schema Zod compartilhado entre frontend e backend — única fonte de verdade
- **Toda validação do cliente DEVE ser replicada no servidor**
- Campos de senha nunca logados, cacheados ou enviados em URL
- Máscaras de input não substituem validação de formato

---

## 7. Testes Frontend

| Tipo | Ferramenta |
|---|---|
| Unitário (utils, hooks) | Vitest ou Jest |
| Componentes | React Testing Library |
| Acessibilidade | jest-axe ou @axe-core/playwright — integrado ao CI/CD |
| Integração / E2E | Playwright ou Cypress — fluxos críticos |
| Performance | Lighthouse CI — bloqueia deploy se score cair |

- **Testar comportamento visível ao usuário** — não testar detalhes de implementação
- Queries por `getByRole` e `getByText` — nunca por `data-testid` como padrão
- CI/CD bloqueia merge se qualquer teste falhar

---

## 8. Qualidade de Código Frontend

- ESLint com: `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-jsx-a11y`
- Prettier — formatação automática e consistente
- Husky + lint-staged — lint e formatação no pre-commit
- Commitlint — enforce Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Proibido commitar `console.log` em produção**
- Nomes em inglês: variáveis, funções, componentes, arquivos

---

# PARTE 2 — BACKEND

---

## 9. Arquitetura e Organização Backend

A arquitetura em camadas com separação clara de responsabilidades é o padrão de mercado para APIs escaláveis e testáveis. NestJS implementa nativamente esse padrão.

> 📌 **Fonte:** NestJS Official Docs · Medium Secure Backend APIs 2025–2026

### 9.1 Estrutura de Pastas — NestJS

```
src/
├── modules/            # um módulo por domínio de negócio
│   └── [dominio]/
│       ├── dto/        # Data Transfer Objects com validação
│       ├── entities/   # entidades do banco (Prisma/TypeORM)
│       ├── [dominio].controller.ts
│       ├── [dominio].service.ts
│       ├── [dominio].repository.ts
│       └── [dominio].module.ts
├── common/
│   ├── decorators/     # decorators customizados
│   ├── filters/        # exception filters globais
│   ├── guards/         # guards de autenticação e autorização
│   ├── interceptors/   # interceptors (logging, transform)
│   ├── middlewares/    # middlewares HTTP
│   └── pipes/          # pipes de validação e transformação
├── config/             # configuração de ambiente (ConfigModule)
├── database/           # configuração e migrations
└── main.ts             # bootstrap com todas as configs globais
```

### 9.2 Regras de Camadas Backend

| Camada | Responsabilidade |
|---|---|
| Controller | Recebe request, valida DTO, chama Service. Sem lógica de negócio. |
| Service | Orquestra a lógica de negócio. Chama Repository. Testável unitariamente. |
| Repository | Única camada que acessa o banco. Encapsula queries. |
| DTO | Valida e tipifica os dados de entrada. Usa class-validator. |
| Entity/Model | Representa a estrutura do banco. Sem lógica de negócio. |
| Guard | Verifica autenticação e autorização antes do Controller. |

---

## 10. Autenticação e Autorização

Autenticação (quem é o usuário) e autorização (o que ele pode fazer) são as bases da segurança de qualquer API. Em 2025, o padrão consolidado para APIs REST é JWT com refresh tokens rotativos.

> 📌 **Fonte:** DEV.to NestJS Security · Medium Node.js Auth Best Practices 2025 · OWASP A01:2025

### 10.1 JWT — Regras Obrigatórias

✅ **Configuração segura de JWT:**

- Access token com expiração curta: **15 minutos** (não mais que 1 hora)
- Refresh token com expiração longa (7–30 dias) armazenado em **cookie HttpOnly**
- Refresh token **rotativo** — novo refresh token a cada renovação (invalida o anterior)
- `JWT_SECRET` com mínimo 64 caracteres, gerado aleatoriamente, nunca hardcoded
- `JWT_SECRET` obrigatoriamente em variável de ambiente — nunca no código
- Algoritmo `HS256` no mínimo; `RS256` para ambientes multi-serviço

```ts
// Configuração segura de JWT no NestJS
JwtModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow('JWT_SECRET'),  // getOrThrow: falha se não existir
    signOptions: {
      expiresIn: '15m',      // access token: curto
      issuer: 'minha-api',   // identifica o emissor
      audience: 'meu-app',   // identifica o receptor
    },
  }),
  inject: [ConfigService],
})
```

### 10.2 Senhas — Hash Obrigatório

- **SEMPRE usar bcrypt** com cost factor mínimo **12** (nunca MD5, SHA1 ou SHA256)
- **Nunca armazenar senha em plain text** — nem em log, nem em banco, nem em cache
- Nunca retornar o hash da senha em nenhuma resposta da API
- Implementar rate limiting específico nas rotas de login (máx. **5 tentativas/minuto**)

> 📌 **Fonte:** Medium Node.js Auth 2025 · OWASP Password Cheat Sheet

### 10.3 Autorização — RBAC

- **Verificar autorização no servidor em CADA request** — nunca confiar no frontend
- Princípio do menor privilégio: usuário acessa apenas o que precisa
- Implementar RBAC (Role-Based Access Control) com guards no NestJS
- **Negar por padrão** — liberar explicitamente, nunca o contrário
- Verificar ownership: usuário só acessa recursos próprios

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles) return false; // negar por padrão
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

> 📌 **Fonte:** DEV.to NestJS Security Guide · NestJS Official Docs Authorization

---

## 11. Segurança da API

> 📌 **Fonte:** OWASP A05:2025 Injection · OWASP Database Security Cheat Sheet · Medium Backend Security 2025

### 11.1 Validação de Entrada (OWASP A05 — Injection)

#### 🚫 Proibido — Vetores de Injeção

- Queries SQL construídas por **concatenação de string** com dados do usuário
- Parâmetros de usuário inseridos diretamente em comandos do sistema (OS injection)
- Dados externos usados em operações de arquivo sem sanitização de path
- Deserialização de objetos não confiáveis sem validação de schema

#### ✅ Obrigatório — Prevenção de Injeção

- ORM/Query Builder (Prisma, TypeORM) com queries parametrizadas — nunca raw SQL com interpolação
- `class-validator` em todos os DTOs de entrada — validar tipo, formato e tamanho
- `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true`
- Princípio do menor privilégio na conexão com o banco (usuário sem DROP, sem CREATE)

```ts
// main.ts — ValidationPipe global obrigatório
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // remove campos não declarados no DTO
  forbidNonWhitelisted: true,  // erro se vier campo extra
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}));
```

> 📌 **Fonte:** OWASP A05:2025 Injection · OWASP SQL Injection Prevention Cheat Sheet

### 11.2 Rate Limiting e Proteção contra Abuso

- **Rate limiting global obrigatório** em todas as rotas (ex: 100 req/min por IP)
- Rate limiting mais restrito em rotas críticas: `/auth/login`, `/auth/register`

```ts
ThrottlerModule.forRoot([{
  name: 'global',
  ttl: 60000,
  limit: 100,
}, {
  name: 'auth',
  ttl: 60000,
  limit: 5,
}])
```

### 11.3 CORS — Configuração Obrigatória

- **NUNCA usar `origin: "*"` em produção** — especificar lista explícita de origens
- `credentials: true` apenas se necessário (cookies cross-origin)

```ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

### 11.4 Headers de Segurança no Backend

```ts
// main.ts
import helmet from 'helmet';
app.use(helmet());           // headers de segurança automáticos
app.use(helmet.hidePoweredBy()); // remove X-Powered-By
app.use(compression());      // compressão de resposta
```

> 📌 **Fonte:** Medium Secure Backend APIs 2025–2026 · OWASP A02:2025 Security Misconfiguration

---

## 12. Segurança e Boas Práticas de Banco de Dados

> 📌 **Fonte:** OWASP Database Security Cheat Sheet · OWASP SQL Injection Prevention Cheat Sheet

### 12.1 Conexão e Configuração

- Conexão com o banco **SOMENTE via TLS 1.2+** em todos os ambientes
- Usuário do banco com **permissões mínimas**: SELECT, INSERT, UPDATE, DELETE apenas
- **NUNCA conectar com usuário root ou admin** na aplicação
- Banco de dados isolado em rede privada — nunca exposto publicamente
- Credenciais do banco exclusivamente em variáveis de ambiente

### 12.2 Migrations e Versionamento

- Todas as alterações de schema via **migrations versionadas** — nunca alterar banco diretamente
- Migrations são **imutáveis** — nunca editar uma migration já executada
- Soft delete obrigatório em entidades críticas (campo `deletedAt`)
- Migrations testadas em staging antes de produção
- Backup automatizado antes de toda migration em produção

### 12.3 Queries — Prisma (SQL) e Mongoose (MongoDB)

```ts
// ✅ CORRETO — Query parametrizada com Prisma
const user = await prisma.user.findFirst({
  where: { email: userInput.email },
  select: { id: true, name: true, email: true }, // nunca expor senha
});

// ❌ ERRADO — Nunca usar raw SQL com interpolação
await prisma.$queryRaw`SELECT * FROM users WHERE email = '${userInput.email}'`;

// ✅ CORRETO — Se raw SQL for necessário, usar Prisma.sql (parametrizado)
await prisma.$queryRaw(
  Prisma.sql`SELECT id, name FROM users WHERE email = ${userInput.email}`
);
```

- Usar `select` explícito — nunca retornar todos os campos da entidade
- Implementar paginação em todas as queries de listagem
- Índices nas colunas usadas em `WHERE`, `JOIN` e `ORDER BY` frequentes

---

## 13. Design de API REST

> 📌 **Fonte:** Postman REST API Best Practices · RESTful API Best Practices · Group107 API Practices 2025

### 13.1 Padrões de URL e Verbos HTTP

| Endpoint | Ação |
|---|---|
| `GET /usuarios` | Listar recursos (com paginação) |
| `GET /usuarios/:id` | Buscar um recurso específico |
| `POST /usuarios` | Criar novo recurso |
| `PUT /usuarios/:id` | Substituir recurso completo |
| `PATCH /usuarios/:id` | Atualizar parcialmente |
| `DELETE /usuarios/:id` | Remover recurso |

- URLs sempre em **kebab-case** e no **plural**: `/pedidos`, `/categorias-produto`
- Substantivos nas URLs, nunca verbos: `/usuarios` ✅ vs `/obterUsuarios` ❌
- **Versionamento na URL desde o início**: `/api/v1/usuarios`
- Nunca expor IDs internos sequenciais — usar **UUID ou ULID**

### 13.2 Padrão de Resposta

```json
// Sucesso
{
  "data": { },
  "message": "Usuário criado com sucesso",
  "statusCode": 201
}

// Erro (baseado em RFC 7807)
{
  "statusCode": 422,
  "error": "VALIDATION_ERROR",
  "message": "Falha na validação dos dados",
  "details": [
    { "field": "email", "message": "Formato de e-mail inválido" }
  ]
}

// Listagem paginada
{
  "data": [],
  "meta": {
    "total": 150,
    "page": 1,
    "perPage": 20,
    "totalPages": 8
  }
}
```

### 13.3 Códigos HTTP Corretos

| Código | Uso Correto |
|---|---|
| 200 OK | GET, PUT, PATCH bem-sucedidos |
| 201 Created | POST bem-sucedido com criação de recurso |
| 204 No Content | DELETE bem-sucedido |
| 400 Bad Request | Dados de entrada inválidos |
| 401 Unauthorized | Não autenticado |
| 403 Forbidden | Autenticado mas sem permissão |
| 404 Not Found | Recurso não encontrado |
| 409 Conflict | Conflito (ex: e-mail já cadastrado) |
| 422 Unprocessable Entity | Erros de validação de negócio |
| 429 Too Many Requests | Rate limit atingido |
| 500 Internal Server Error | Erro interno — nunca expor detalhes em produção |

- **NUNCA expor stack traces** ou mensagens de erro internas em produção
- Exception filter global para capturar e formatar todos os erros de forma uniforme

> 📌 **Fonte:** RFC 7807 ProblemDetails · Postman API Best Practices · RESTful API Design 2026

### 13.4 Versionamento e Depreciação de API

- **Versionar desde o primeiro endpoint** — nunca fazer "depois"
- Estratégia: URI versioning (`/api/v1/`, `/api/v2/`)
- Política: anunciar → manter versão antiga 6 meses → remover
- Nunca remover ou renomear campos sem lançar nova versão

> 📌 **Fonte:** Postman REST API Best Practices · ABP.IO Backward Compatible APIs

---

## 14. Logging, Observabilidade e Monitoramento

> 📌 **Fonte:** Group107 API Practices 2025 · REST API Best Practices · Postman Blog 2025

### 14.1 Logging Estruturado — Regras Obrigatórias

- Logs **SEMPRE em formato JSON** — machine-readable para Datadog, ELK, CloudWatch
- Incluir **correlation ID** (request ID) em cada log para rastreabilidade
- Níveis de log: `ERROR`, `WARN`, `INFO`, `DEBUG` (dev only)
- **NUNCA logar senhas, tokens JWT, dados de cartão ou qualquer PII sensível**
- Usar **Pino** ou **Winston** para logging estruturado no Node.js

```json
{
  "timestamp": "2025-05-25T14:32:11.123Z",
  "level": "error",
  "correlationId": "abc-123-def",
  "userId": "usr_xxxx",
  "method": "POST",
  "path": "/api/v1/orders",
  "statusCode": 500,
  "durationMs": 142,
  "message": "Erro ao processar pedido",
  "error": "InternalServerError"
}
```

### 14.2 O que Monitorar

| Métrica | Ação |
|---|---|
| Taxa de erros 5xx | Alerta se > 1% das requests em 5 minutos |
| Latência p95 e p99 | Alerta se p95 > 2s ou p99 > 5s |
| Falhas de autenticação | Alerta se > 10 falhas/minuto por IP |
| Rate limit atingido | Indicador de possível abuso ou ataque |
| Conexões de banco | Alerta se pool de conexões > 80% do limite |
| Uso de memória/CPU | Alerta se > 85% por mais de 5 minutos |

---

## 15. Infraestrutura, CI/CD e Gestão de Segredos

> 📌 **Fonte:** OWASP A02:2025 Security Misconfiguration · Medium Secure Backend 2025 · SecComply OWASP 2025

### 15.1 Gestão de Variáveis de Ambiente e Segredos

- Todos os segredos exclusivamente em variáveis de ambiente
- Usar **AWS Secrets Manager**, **HashiCorp Vault** ou **Azure Key Vault** em produção
- Credenciais de produção nunca em arquivos `.env` commitados
- Rotação periódica de segredos (mínimo anual, recomendado trimestral)

```ts
// Usar ConfigService com getOrThrow — falha no startup se a variável não existir
const secret = this.config.getOrThrow<string>('JWT_SECRET');
```

### 15.2 CI/CD — Pipeline Mínima Obrigatória

- ✅ Lint + TypeScript check — bloqueia merge com erros de tipo
- ✅ Testes unitários e de integração — cobertura mínima 80%
- ✅ **`npm audit`** — bloqueia merge com vulnerabilidades críticas
- ✅ SAST (análise estática de segurança) — ex: Snyk, SonarQube
- ✅ Build de produção — verifica que o projeto compila sem erros
- ✅ Deploy automático apenas após toda a pipeline verde

### 15.3 Configuração de Produção

- **HTTPS obrigatório** — redirecionar todo HTTP para HTTPS (301)
- Desativar endpoints de debug e Swagger em produção
- `NODE_ENV=production` — garante otimizações e remove logs de debug
- Executar processo Node.js com usuário sem privilégios de root

---

# PARTE 3 — PADRÕES DE DESENVOLVIMENTO

---

## 16. Nomenclatura — Variáveis, Funções e Constantes

Nomear bem é documentar. Um nome claro elimina a necessidade de comentários e reduz o tempo de onboarding de novos membros.

> 📌 **Fonte:** AWS Prescriptive Guidance TypeScript · Syncfusion JS Naming Conventions 2026 · Awesome NestJS Boilerplate

### 16.1 Tabela de Convenções por Tipo

| Tipo | Convenção + Exemplo |
|---|---|
| Variável comum | `camelCase` → `userEmail`, `isLoading`, `pageCount` |
| Função / Método | `camelCase` + verbo → `getUserById()`, `sendEmail()`, `formatDate()` |
| Constante global | `UPPER_SNAKE_CASE` → `MAX_RETRY_ATTEMPTS`, `API_BASE_URL` |
| Classe / Componente | `PascalCase` → `UserService`, `OrderController`, `PaymentModal` |
| Interface TypeScript | `PascalCase` → `UserProfile`, `CreateOrderDto`, `ApiResponse` |
| Type alias | `PascalCase` → `UserId`, `OrderStatus`, `PaginatedResult<T>` |
| Enum | `PascalCase` + valor `UPPER` → `Role.ADMIN`, `Status.ACTIVE` |
| Hook React | `use` + `PascalCase` → `useAuth`, `usePagination`, `useDebounce` |
| Event handler | `handle` + `PascalCase` → `handleSubmit`, `handleUserClick` |
| Boolean | `is / has / can / should` → `isActive`, `hasPermission`, `canDelete` |
| Variável de ambiente | `UPPER_SNAKE_CASE` → `DATABASE_URL`, `JWT_SECRET`, `PORT` |

### 16.2 Regras de Nomenclatura

- **Nomes sempre em inglês** — sem mistura de idiomas no mesmo projeto
- **Nomes descritivos** sem abreviações obscuras: `getUserById`, não `getUsrById`
- **Booleanos lidos como pergunta**: `isLoading` (não `loading`), `hasAccess` (não `access`)
- Funções nomeadas com **verbo de ação**: `fetchOrders`, `calculateTotal`, `validateEmail`
- **Evitar nomes genéricos**: `data`, `info`, `temp`, `result`, `obj` — sempre especificar
- Evitar negação dupla: `isEnabled` (não `isNotDisabled`)
- Enums no singular e valores em `UPPER_SNAKE_CASE`: `Role.ADMIN`, `OrderStatus.PENDING`

```ts
// ❌ ERRADO
const d = await getData();
const ativo = true;
const ShouldUpdate = false;

// ✅ CORRETO
const orders = await fetchUserOrders(userId);
const isActive = true;
const shouldUpdate = false;

// ✅ Booleanos, constantes e enums
const isLoading = false;
const hasPermission = user.roles.includes(Role.ADMIN);
const MAX_LOGIN_ATTEMPTS = 5;
enum OrderStatus { PENDING = 'PENDING', SHIPPED = 'SHIPPED', DELIVERED = 'DELIVERED' }
```

---

## 17. Nomenclatura de Arquivos

Nomes de arquivo inconsistentes causam problemas em sistemas case-sensitive (Linux/servidores de produção).

> 📌 **Fonte:** Medium NestJS File Naming 2024 · Syncfusion JS Conventions · React+TypeScript Style Guide

### 17.1 Frontend — Arquivos React / Next.js

| Tipo de Arquivo | Padrão + Exemplo |
|---|---|
| Componente React | `PascalCase.tsx` → `UserCard.tsx`, `OrderModal.tsx` |
| Arquivo de teste | `PascalCase.test.tsx` → `UserCard.test.tsx` |
| Hook customizado | `camelCase.ts` → `useAuth.ts`, `usePagination.ts` |
| Contexto React | `PascalCase.context.tsx` → `AuthContext.tsx` |
| Service / API client | `kebab-case.service.ts` → `user.service.ts` |
| Store / Estado | `kebab-case.store.ts` → `auth.store.ts`, `cart.store.ts` |
| Utilitário / Helper | `kebab-case.util.ts` → `date.util.ts`, `format.util.ts` |
| Constantes | `kebab-case.constants.ts` → `app.constants.ts` |
| Tipos e Interfaces | `kebab-case.types.ts` → `user.types.ts`, `api.types.ts` |
| Estilo CSS/Tailwind | `PascalCase.module.css` → `UserCard.module.css` |
| Página (Next.js App) | `kebab-case/page.tsx` → `/user-profile/page.tsx` |

### 17.2 Backend — Arquivos NestJS

| Tipo de Arquivo | Padrão + Exemplo |
|---|---|
| Módulo | `kebab-case.module.ts` → `users.module.ts` |
| Controller | `kebab-case.controller.ts` → `users.controller.ts` |
| Service | `kebab-case.service.ts` → `users.service.ts` |
| Repository | `kebab-case.repository.ts` → `users.repository.ts` |
| DTO (criação) | `create-[entity].dto.ts` → `create-user.dto.ts` |
| DTO (atualização) | `update-[entity].dto.ts` → `update-user.dto.ts` |
| Entity / Model | `kebab-case.entity.ts` → `user.entity.ts` |
| Guard | `kebab-case.guard.ts` → `jwt.guard.ts`, `roles.guard.ts` |
| Decorator | `kebab-case.decorator.ts` → `roles.decorator.ts` |
| Interceptor | `kebab-case.interceptor.ts` → `logging.interceptor.ts` |
| Filtro de exceção | `kebab-case.filter.ts` → `http-exception.filter.ts` |
| Middleware | `kebab-case.middleware.ts` → `logger.middleware.ts` |
| Pipe | `kebab-case.pipe.ts` → `parse-int.pipe.ts` |
| Teste unitário | `[nome].spec.ts` → `users.service.spec.ts` |
| Teste E2E | `[nome].e2e-spec.ts` → `users.e2e-spec.ts` |

### 17.3 Regras Gerais de Arquivos

- **SEMPRE `kebab-case` para arquivos de backend** — nunca PascalCase
- Exceção: componentes React e páginas Next.js usam PascalCase *(convenção do ecossistema)*
- **Sufixo obrigatório** indica o papel do arquivo: `.service.ts`, `.controller.ts`, `.dto.ts`
- Arquivos de teste **ao lado do arquivo original** — não em pasta separada `/tests/`
- **Um componente/classe por arquivo** — nunca múltiplos exports de componentes em um `.tsx`
- Índices (`index.ts`) apenas para re-export limpo de módulos públicos
- **Proibido**: `misc.ts`, `helpers.ts`, `utils.ts` genéricos — nomear pelo domínio (`date.util.ts`)

---

## 18. Git — Branches e Commits

Um histórico Git limpo é uma forma de documentação.

> 📌 **Fonte:** Conventional Commits 1.0.0 · Conventional Branch · Medium Git Branch Naming 2025

### 18.1 Nomenclatura de Branches

| Padrão | Uso + Exemplo |
|---|---|
| `feature/descricao-curta` | Nova funcionalidade → `feature/user-authentication` |
| `fix/descricao-do-bug` | Correção de bug → `fix/login-redirect-loop` |
| `hotfix/descricao-urgente` | Correção urgente em produção → `hotfix/payment-crash` |
| `chore/descricao` | Manutenção, deps, config → `chore/update-dependencies` |
| `docs/descricao` | Documentação → `docs/update-api-readme` |
| `refactor/descricao` | Refatoração sem mudança de comportamento |
| `test/descricao` | Adição ou correção de testes |
| `release/versao` | Preparação de release → `release/2.1.0` |

- Sempre **kebab-case e letras minúsculas** — sem espaços ou underscores
- Máximo **50 caracteres** após o prefixo
- **Nunca** usar nomes genéricos: `fix`, `update`, `wip`, `test`, `minha-branch`
- Branches de feature devem ser de **vida curta** — merge em no máximo 2–3 dias
- **Branches protegidas**: `main` / `master` — requerem PR aprovado + CI verde para merge

### 18.2 Conventional Commits — Padrão de Mensagem

```
<tipo>(<escopo opcional>): <descrição curta em inglês>

[corpo opcional — explica o PORQUÊ, não o O QUÊ]

[rodapé opcional — BREAKING CHANGE, referência a issue]
```

**Exemplos corretos:**

```
feat(auth): add JWT refresh token rotation
fix(orders): prevent duplicate order creation on double-click
chore(deps): update prisma to v6.2.0
refactor(users): extract password hashing to dedicated service
docs(api): add examples to POST /users endpoint
test(auth): add unit tests for token expiration logic
perf(database): add index on orders.created_at column

# BREAKING CHANGE:
feat(api)!: rename /users to /accounts

BREAKING CHANGE: The /users endpoint has been renamed to /accounts.
All clients must update their API calls accordingly.
```

### 18.3 Tipos de Commit Permitidos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade visível ao usuário |
| `fix` | Correção de bug |
| `docs` | Mudanças apenas em documentação |
| `style` | Formatação, espaçamento (sem mudança de lógica) |
| `refactor` | Refatoração sem nova funcionalidade nem correção de bug |
| `test` | Adição ou correção de testes |
| `chore` | Manutenção, dependências, configuração de build |
| `perf` | Melhoria de performance |
| `ci` | Mudanças em CI/CD e scripts de automação |
| `revert` | Reverte um commit anterior |
| `build` | Mudanças no sistema de build ou dependências externas |

- Descrição em inglês, no **imperativo**: `"add feature"` (não `"added"` ou `"adds"`)
- Máximo **72 caracteres** na primeira linha — sem ponto final
- **Nunca fazer commit direto em `main`/`master`** — sempre via Pull Request

> 📌 **Fonte:** Conventional Commits 1.0.0 — conventionalcommits.org · Conventional Branch Spec · Medium Git Best Practices 2025

---

## 19. Padrões de Código — Estrutura e Boas Práticas

> 📌 **Fonte:** React Best Practices 2025 · Clean Code — Robert C. Martin · DEV.to React+TypeScript Best Practices

### 19.1 Funções e Métodos

- **Uma função = uma responsabilidade** — se precisar de "e" para descrever, dividir
- Máximo **30 linhas** por função — acima disso, extrair em funções menores
- Máximo **3 parâmetros** — acima disso, usar objeto tipado como argumento
- Funções puras sempre que possível
- **Early return** — retornar cedo para evitar aninhamento profundo (máx 3 níveis)

```ts
// ❌ ERRADO — lógica profunda, múltiplas responsabilidades
function processUser(u: any, d: any, s: boolean) {
  if (u) {
    if (d) {
      if (s) {
        // 4 níveis de aninhamento
      }
    }
  }
}

// ✅ CORRETO — early return, parâmetro tipado, responsabilidade única
interface ProcessUserParams {
  user: User;
  data: UserData;
  isSuperAdmin: boolean;
}

function processUser({ user, data, isSuperAdmin }: ProcessUserParams): ProcessedUser {
  if (!user) throw new Error('User is required');
  if (!data) throw new Error('Data is required');
  if (!isSuperAdmin) return processStandardUser(user, data);
  return processSuperAdmin(user, data);
}
```

### 19.2 Comentários e Documentação

- Comentários explicam o **PORQUÊ**, nunca o O QUÊ — o código deve ser autoexplicativo
- **JSDoc obrigatório** em funções públicas de services e utilitários compartilhados
- Comentários `TODO` devem incluir a issue relacionada: `// TODO(#123): refactor after migration`
- **Proibido**: comentários que explicam código óbvio

```ts
// ❌ ERRADO — comentário explica o óbvio
// verifica se o usuário está ativo
if (user.isActive) { ... }

// ✅ CORRETO — comentário explica o porquê (regra de negócio não óbvia)
// Usuários em período de carência (7 dias) ainda podem acessar mesmo sem assinatura ativa
if (user.isActive || isWithinGracePeriod(user.subscriptionEndDate)) { ... }

// ✅ JSDoc em função pública compartilhada
/**
 * Formata um valor monetário no padrão brasileiro.
 * @param value - Valor em centavos (ex: 1990 = R$ 19,90)
 * @param currency - Código da moeda (padrão: BRL)
 */
export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value / 100);
}
```

### 19.3 Imports e Exports

```ts
// ✅ CORRETO — 3 grupos separados por linha em branco

// 1. Externos (bibliotecas)
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// 2. Internos (módulos do projeto — via path alias)
import { UsersRepository } from '@modules/users/users.repository';
import { AuthService } from '@modules/auth/auth.service';

// 3. Tipos (import type — sem impacto em runtime)
import type { CreateUserDto } from './dto/create-user.dto';
import type { User } from './user.entity';
```

- Usar **path aliases** para evitar imports relativos longos (`../../..`)
- **Proibido**: `import * as` — sempre importar explicitamente o que é necessário

### 19.4 Tratamento de Erros

- **NUNCA silenciar erros** com `catch` vazio: `catch(e) {}` — sempre tratar ou relançar
- Usar classes de erro customizadas para erros de negócio tipados

```ts
// ❌ ERRADO — erro silenciado
try {
  const user = await userService.findById(id);
} catch (e) {} // nunca fazer isso

// ✅ CORRETO — erro tipado, tratado explicitamente
try {
  const user = await userService.findById(id);
  if (!user) throw new NotFoundException(`User ${id} not found`);
  return user;
} catch (error) {
  if (error instanceof NotFoundException) throw error;
  this.logger.error('Unexpected error fetching user', { userId: id, error });
  throw new InternalServerErrorException('Failed to fetch user');
}
```

### 19.5 Formatação e Estilo

```json
// .prettierrc — configuração obrigatória
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

---

## 20. Nomenclatura de Banco de Dados

> 📌 **Fonte:** Prisma Docs · OWASP Database Security Cheat Sheet · Medium NestJS Best Practices 2025

| Elemento | Padrão + Exemplo |
|---|---|
| Tabela | `snake_case` plural → `users`, `order_items`, `product_categories` |
| Coluna | `snake_case` singular → `user_id`, `created_at`, `is_active` |
| Chave primária | Sempre `id` (UUID ou ULID) |
| Chave estrangeira | `[tabela_singular]_id` → `user_id`, `order_id`, `category_id` |
| Timestamps | `created_at` e `updated_at` em **TODAS** as tabelas |
| Soft delete | `deleted_at TIMESTAMP nullable` — padrão em entidades críticas |
| Índice | `idx_[tabela]_[coluna]` → `idx_users_email` |
| Constraint única | `uq_[tabela]_[coluna]` → `uq_users_email`, `uq_users_cpf` |
| Migration | `YYYYMMDDHHMMSS_descricao` → `20250525143000_add_users_table` |

- Nomenclatura exclusivamente em **inglês** — sem colunas em português
- Nunca usar palavras reservadas como nome de tabela (`user` → `users`, `order` → `orders`)
- **IDs sempre UUID ou ULID** — nunca auto-increment sequencial exposto na API
- Timestamps em **UTC** — nunca armazenar datas sem timezone
- Campos booleanos com prefixo `is_`: `is_active`, `is_verified`, `is_deleted`
- Evitar abreviações: `description` (não `desc`), `quantity` (não `qty`)

---

# Resumo Executivo — Regras Inegociáveis

## 🔵 Frontend

| # | Regra |
|---|---|
| 1 | Tokens de autenticação **SEMPRE** em cookies `HttpOnly` + `Secure` + `SameSite=Strict` |
| 2 | CSP configurada em **todos** os ambientes de produção |
| 3 | `dangerouslySetInnerHTML` **SEMPRE** com DOMPurify |
| 4 | Variáveis secretas **NUNCA** em `NEXT_PUBLIC_` ou `VITE_` |
| 5 | WCAG 2.2 AA: contraste 4,5:1, touch targets 24px, navegação por teclado |
| 6 | TypeScript `strict: true` — **NUNCA** usar `any` |

## 🟣 Backend

| # | Regra |
|---|---|
| 1 | Senhas **SEMPRE** com bcrypt (cost ≥ 12) — nunca MD5/SHA ou plain text |
| 2 | `JWT_SECRET` em variável de ambiente com mínimo 64 caracteres |
| 3 | Access token: máx 15 minutos / Refresh token: cookie HttpOnly rotativo |
| 4 | `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true` |
| 5 | **NUNCA** expor stack trace em produção — mensagem genérica para erros 500 |
| 6 | Usuário do banco com permissões mínimas — **nunca** root na aplicação |
| 7 | CORS com lista explícita de origens — **nunca** `origin: "*"` em produção |
| 8 | Rate limiting em **todas** as rotas; mais restrito em `/auth/*` |
| 9 | Logs em JSON estruturado — **nunca** logar senhas, tokens ou PII |
| 10 | HTTPS obrigatório em todos os ambientes — redirecionar HTTP |

## 🟢 Padrões de Desenvolvimento

| # | Regra |
|---|---|
| 1 | Nomes sempre em **inglês** e descritivos — nunca genéricos (`data`, `info`, `temp`) |
| 2 | Booleanos com prefixo `is / has / can / should` — nunca nome ambíguo (`active`) |
| 3 | Arquivos backend em `kebab-case.sufixo.ts` — sufixo obrigatório (`.service`, `.controller`…) |
| 4 | Branches com `prefixo/descricao-curta` — nunca `fix`, `wip`, `update` sem contexto |
| 5 | Commits no padrão **Conventional Commits** — `feat:`, `fix:`, `chore:`, `refactor:` |
| 6 | **Nunca** commitar direto em `main`/`master` — sempre via Pull Request aprovado |
| 7 | **NUNCA** silenciar erros com `catch` vazio — sempre tratar ou relançar |
| 8 | Uma função = uma responsabilidade — máx 30 linhas e 3 parâmetros |
| 9 | IDs sempre **UUID ou ULID** no banco — nunca auto-increment exposto na API |
| 10 | Tabelas e colunas do banco sempre em **inglês** e `snake_case` |

---

> *Fontes: OWASP (owasp.org) · W3C WCAG (w3.org) · Postman Blog · web.dev · NestJS Docs · Prisma Docs · Conventional Commits (conventionalcommits.org) · AWS Prescriptive Guidance*
>
> *Revisão recomendada: a cada 6 meses ou após atualização major de framework*
