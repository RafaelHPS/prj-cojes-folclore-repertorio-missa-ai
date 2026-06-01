-- Adiciona link de áudio na tabela songs
-- Execute este script no SQL Editor do Supabase

ALTER TABLE songs ADD COLUMN IF NOT EXISTS audio_url text;
