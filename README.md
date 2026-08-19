# 🎵 Repertório de Missas

Plataforma web para equipes de música litúrgica organizarem seu acervo de músicas e montarem o repertório de cada celebração — por parte da missa, com exportação em PDF e link público para a comunidade. Em uso real pela **COJES** (Comunidade Jovem Espírito Santo).

🔗 **[Acessar o portal](https://rafaelhps.github.io/prj-cojes-folclore-repertorio-missa-ai/)**

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Auth_%2B_Storage-3FCF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/deploy-GitHub_Pages-181717?logo=github)

---

## Sobre o projeto

Times de música em paróquias e comunidades organizam o repertório de cada missa manualmente — planilhas, grupos de WhatsApp, papéis avulsos. Este projeto resolve isso de ponta a ponta: um catálogo central de músicas (com partitura, cifra, letra e áudio), a montagem do repertório de cada celebração organizada pela liturgia, e a distribuição do material pronto — tanto para quem toca (PDF único, mesclado e com índice clicável) quanto para a comunidade (link público, sem necessidade de login).

## Funcionalidades

### 🎼 Músicas
- Catálogo com busca, ordenação e paginação, em visualização de grade ou lista
- Upload de partitura, cifra e letra — imagens enviadas são convertidas automaticamente em PDF de página única
- Metadados: tom, origem/hinário (com número no livro), partes litúrgicas e tempos sugeridos

### ⛪ Missas e repertório
- Cadastro de missas com ano e tempo litúrgico, participantes (membros ou convidados) e visibilidade pública/privada
- Montagem do repertório organizada pelas **15 partes fixas da liturgia** (Entrada → Final)
- Reordenação por arraste (desktop e touch) e remoção por deslizar no celular
- Permissões por linha: colaboradores só removem o que eles mesmos adicionaram

### 📄 Exportação em PDF
- Mescla partitura/cifra/letra de toda a missa em um único PDF, gerado no navegador (sem backend de conversão)
- Página de índice com **links clicáveis** para cada música, incluindo link de áudio quando disponível
- Compartilhamento direto via WhatsApp (Web Share API)

### 🌐 Link público
- Página somente-leitura por missa, sem login, protegida por Row Level Security — apenas o que o time marcar como público fica visível

### 👥 Equipes e permissões
- Múltiplas equipes por usuário, convite por e-mail com criação de senha e nome no primeiro acesso
- Papéis (Admin / Editor / Colaborador / Visualizador) com matriz de permissões configurável por equipe
- Log de auditoria de criação/edição/remoção

### 📊 Estatísticas
- Músicas mais usadas, distribuição por origem, celebrações por mês, ano litúrgico e partes mais usadas
- Histórico das últimas músicas utilizadas, com busca, ordenação e paginação

## Stack técnica

| Camada | Tecnologias |
|---|---|
| Frontend | React 19 · TypeScript (`strict`) · Vite · Tailwind CSS v4 |
| Formulários | React Hook Form + Zod (mesmo schema de validação client-side) |
| Estado | Zustand (com persistência local) |
| Interação | `@dnd-kit` (arraste), gestos de toque nativos (swipe) |
| Geração de PDF | `pdf-lib`, 100% client-side |
| Backend | Supabase — Postgres, Auth, Storage, Edge Functions (Deno) |
| Deploy | GitHub Actions → GitHub Pages |

## Arquitetura e práticas de desenvolvimento

- **Organização por domínio** (`src/features/<área>`), separando página, serviço de dados e schema de validação
- **TypeScript em modo estrito**, sem uso de `any`
- **Design system próprio**: paleta e tipografia como tokens CSS (`@theme` do Tailwind v4), reaproveitados em toda a aplicação
- **Acessibilidade**: lint dedicado (`eslint-plugin-jsx-a11y`), navegação por teclado, `aria-label`/`aria-invalid` nos formulários
- **Mobile-first responsivo**: sidebar no desktop vira barra inferior no celular; tabelas viram cards; gestos de toque para reordenar e excluir
- **Qualidade automatizada**: Husky + lint-staged rodando ESLint e Prettier em cada commit
- **Commits semânticos** (Conventional Commits) e histórico linear em `main`

## Segurança

- **Row Level Security (RLS)** ativa em todas as tabelas do Postgres — cada policy escopada por equipe/papel, sem exceções amplas
- Funções `SECURITY DEFINER` com `search_path` fixado explicitamente (evita sequestro de schema)
- Autenticação e hash de senha via Supabase Auth (bcrypt), com fluxo de convite que exige criação de senha própria no primeiro acesso
- **Content Security Policy** configurada, sem chaves privilegiadas expostas no bundle do cliente (a chave de serviço do Supabase só existe no lado servidor/Edge Function)
- CORS restrito a origens conhecidas nas Edge Functions (nunca `*` em produção)
- Auditoria periódica de dependências (`npm audit`) e revisão manual de policies de acesso

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com suas credenciais do Supabase
npm run dev
```

---

<sub>Projeto pessoal em produção real, usado como peça de portfólio técnico. Feedback é bem-vindo via issues.</sub>
