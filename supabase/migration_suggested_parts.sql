-- Adiciona campo de momentos sugeridos na tabela songs
-- Execute este script no SQL Editor do Supabase

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS suggested_parts mass_part[] NOT NULL DEFAULT '{}';
