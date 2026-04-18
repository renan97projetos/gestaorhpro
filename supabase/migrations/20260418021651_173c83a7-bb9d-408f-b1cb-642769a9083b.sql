-- Tipo de demissão
DO $$ BEGIN
  CREATE TYPE public.tipo_demissao AS ENUM (
    'Pedido de demissao',
    'Sem justa causa',
    'Com justa causa',
    'Acordo',
    'Fim de contrato'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sexo
DO $$ BEGIN
  CREATE TYPE public.sexo_tipo AS ENUM ('Masculino', 'Feminino');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS sexo public.sexo_tipo,
  ADD COLUMN IF NOT EXISTS data_demissao date,
  ADD COLUMN IF NOT EXISTS tipo_demissao public.tipo_demissao;

-- Trigger: ao mudar status para Demitido, registrar data
CREATE OR REPLACE FUNCTION public.tg_set_data_demissao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Demitido' AND (OLD.status IS DISTINCT FROM 'Demitido') AND NEW.data_demissao IS NULL THEN
    NEW.data_demissao := CURRENT_DATE;
  END IF;
  IF NEW.status <> 'Demitido' THEN
    NEW.data_demissao := NULL;
    NEW.tipo_demissao := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_colab_data_demissao ON public.colaboradores;
CREATE TRIGGER trg_colab_data_demissao
BEFORE UPDATE ON public.colaboradores
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_data_demissao();

-- Inferir sexo pelo nome para registros existentes (heurística simples PT-BR)
UPDATE public.colaboradores
SET sexo = CASE
  WHEN lower(split_part(colaborador, ' ', 1)) ~ '(a|e)$' 
    AND lower(split_part(colaborador, ' ', 1)) NOT IN ('luca','andre','andré','jose','josé','felipe','jorge','jaime','jacque','isaque','enrique','henrique','jhone','dione','daniele','dani','vinicius','tadeu','mateus','matheus','marcos','lucas','thiago','tiago','gabriel','rafael','daniel','israel','samuel','manuel','miguel','ezequiel','emanuel','natanael','ismael')
  THEN 'Feminino'::public.sexo_tipo
  WHEN lower(split_part(colaborador, ' ', 1)) IN ('mary','beatriz','raquel','ester','esther','ruth','rute','miriam','iris','íris','jaqueline','jacqueline','luz','dores','solange','carmen','carmem','helen','ellen','jennifer','jeniffer','jasmin','jasmim','sol','isabel','mabel','rachel','michel','michele')
  THEN 'Feminino'::public.sexo_tipo
  ELSE 'Masculino'::public.sexo_tipo
END
WHERE sexo IS NULL;