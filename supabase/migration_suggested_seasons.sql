-- Adiciona tempo litúrgico sugerido na tabela songs
-- Execute este script no SQL Editor do Supabase

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'liturgical_season') THEN
    CREATE TYPE liturgical_season AS ENUM (
      'tempo_comum',
      'advento',
      'natal',
      'quaresma',
      'pascoa',
      'pentecostes'
    );
  END IF;
END$$;

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS suggested_seasons liturgical_season[] NOT NULL DEFAULT '{}';
