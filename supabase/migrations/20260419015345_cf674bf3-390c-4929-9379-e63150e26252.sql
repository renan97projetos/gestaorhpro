ALTER TABLE public.colaboradores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.colaboradores;