ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS data_inicio_contrato date,
  ADD COLUMN IF NOT EXISTS dia_vencimento smallint;