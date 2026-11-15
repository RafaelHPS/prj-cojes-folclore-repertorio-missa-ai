-- Corrige a listagem de convites pendentes, que falhava com
-- `42501: permission denied for table users` em toda visita à tela de Equipe.
--
-- Causa: as policies comparavam o e-mail do convite com
--   (SELECT users.email FROM auth.users WHERE users.id = auth.uid())
-- e o papel `authenticated` não tem permissão de ler auth.users. A policy
-- estourava e derrubava a consulta inteira, mesmo quando o outro lado do OR
-- (is_team_member) já seria verdadeiro. O e-mail passa a vir do próprio JWT,
-- que não depende de acesso a tabela nenhuma.
--
-- Aproveita para remover duas policies legadas com role {public} — que inclui
-- `anon` — redundantes com as quatro policies {authenticated} já existentes.
--
-- Execute este script no SQL Editor do Supabase.

-- ── 1. Policies legadas {public} ─────────────────────────────────────────────
-- "admins gerenciam convites" (ALL) já é coberta por criar/editar/excluir/ver.
-- "users view own invites" (SELECT) vira o segundo ramo do OR na policy de ver.
DROP POLICY IF EXISTS "admins gerenciam convites" ON invites;
DROP POLICY IF EXISTS "users view own invites" ON invites;

-- ── 2. Leitura: membro da equipe ou o próprio convidado ──────────────────────
DROP POLICY IF EXISTS "invites: ver se membro ou convidado" ON invites;

CREATE POLICY "invites: ver se membro ou convidado"
ON invites FOR SELECT TO authenticated
USING (is_team_member(team_id) OR email = (auth.jwt() ->> 'email'));

-- ── 3. Edição: admin da equipe ou o próprio convidado ────────────────────────
DROP POLICY IF EXISTS "invites: editar se admin ou convidado" ON invites;

CREATE POLICY "invites: editar se admin ou convidado"
ON invites FOR UPDATE TO authenticated
USING (is_team_admin(team_id) OR email = (auth.jwt() ->> 'email'));

-- ── Conferência ──────────────────────────────────────────────────────────────
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'invites'
ORDER BY cmd, policyname;
