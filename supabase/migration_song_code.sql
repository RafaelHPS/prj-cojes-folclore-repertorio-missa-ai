-- Adiciona um código sequencial por equipe na tabela songs.
-- O título sozinho não identifica a música (ex.: "Cordeiro de Deus" aparece 18x),
-- então cada música ganha um número curto para a equipe usar no dia a dia.
-- Execute este script no SQL Editor do Supabase.

-- 1. Coluna (nullable primeiro, para permitir o backfill)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS code integer;

-- 2. Numera as músicas existentes por equipe, na ordem de cadastro
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY team_id ORDER BY created_at, id) AS seq
  FROM songs
)
UPDATE songs
SET code = numbered.seq
FROM numbered
WHERE songs.id = numbered.id
  AND songs.code IS NULL;

-- 3. Agora que toda linha tem valor, torna obrigatório e único dentro da equipe
ALTER TABLE songs ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_songs_team_id_code ON songs (team_id, code);

-- 4. Atribui o próximo código automaticamente em novos cadastros.
--    O advisory lock serializa os inserts da mesma equipe: sem ele, dois cadastros
--    simultâneos leriam o mesmo max(code) e um deles quebraria no índice único.
CREATE OR REPLACE FUNCTION set_song_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.code IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(new.team_id::text));
    SELECT coalesce(max(code), 0) + 1 INTO new.code FROM songs WHERE team_id = new.team_id;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS set_song_code_before_insert ON songs;

CREATE TRIGGER set_song_code_before_insert
BEFORE INSERT ON songs
FOR EACH ROW
EXECUTE FUNCTION set_song_code();
