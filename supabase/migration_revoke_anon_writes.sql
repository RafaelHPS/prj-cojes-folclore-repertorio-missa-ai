-- Remove do papel `anon` as permissões de escrita que a aplicação nunca usa.
--
-- `anon` é o papel de quem NÃO está logado — a chave anônima vai no bundle do
-- navegador, então qualquer pessoa a tem. O visitante anônimo só precisa LER a
-- missa pública; nunca precisa gravar nada.
--
-- Sem isto, a única barreira contra uma escrita anônima é a RLS. Com isto, o
-- Postgres recusa antes de avaliar qualquer policy — uma policy criada por
-- engano com USING (true) deixa de ser suficiente para causar estrago.
--
-- Os SELECT continuam intactos (masses, mass_songs, songs, profiles, teams),
-- assim como todas as permissões do papel `authenticated`.
--
-- Execute este script no SQL Editor do Supabase.

REVOKE INSERT, UPDATE, DELETE, REFERENCES ON TABLE
  public.audit_logs,
  public.invites,
  public.role_permissions,
  public.team_members,
  public.teams
FROM anon;

-- Conferência: deve sobrar apenas SELECT para o papel anon.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
ORDER BY table_name, privilege_type;
