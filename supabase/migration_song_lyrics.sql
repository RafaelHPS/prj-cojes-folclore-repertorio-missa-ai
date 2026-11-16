-- Adiciona a letra estruturada da música (refrão, estrofes e outros blocos).
-- Execute este script no SQL Editor do Supabase.
--
-- Formato de `lyrics`: array de seções, na ordem impressa no livro.
--   [
--     { "type": "refrain", "label": "R.", "lines": ["..."], "repeat": "bis" },
--     { "type": "stanza",  "label": "1.", "lines": ["..."], "repeat": null },
--     { "type": "other",   "label": "S:", "lines": ["..."], "repeat": null }
--   ]
-- O refrão aparece uma vez só; quem exibe decide repeti-lo entre as estrofes.

ALTER TABLE songs ADD COLUMN IF NOT EXISTS lyrics jsonb;

ALTER TABLE songs DROP CONSTRAINT IF EXISTS chk_songs_lyrics_is_array;
ALTER TABLE songs
  ADD CONSTRAINT chk_songs_lyrics_is_array
  CHECK (lyrics IS NULL OR jsonb_typeof(lyrics) = 'array');

-- A listagem de músicas carrega o repertório inteiro de uma vez; trazer as letras
-- junto somaria ~2 MB a cada abertura. A listagem lê só esta flag e a letra é
-- buscada quando alguém abre a música.
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS has_lyrics boolean
  GENERATED ALWAYS AS (lyrics IS NOT NULL AND jsonb_array_length(lyrics) > 0) STORED;
