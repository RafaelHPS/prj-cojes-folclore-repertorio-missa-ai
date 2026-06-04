-- Adiciona tempo litúrgico na tabela masses
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

ALTER TABLE masses
  ADD COLUMN IF NOT EXISTS liturgical_season liturgical_season;
