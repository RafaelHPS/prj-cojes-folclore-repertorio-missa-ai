-- Adiciona valor 'outros' ao enum liturgical_season
-- Execute este script no SQL Editor do Supabase

ALTER TYPE liturgical_season ADD VALUE IF NOT EXISTS 'outros';
