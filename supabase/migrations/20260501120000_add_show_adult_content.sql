-- Agregar flag de contenido adulto al perfil de usuario
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_adult_content boolean DEFAULT false;

-- Comentario para documentación
COMMENT ON COLUMN public.profiles.show_adult_content IS 'Habilita contenido para adultos (+18) en TV en vivo y catálogo';
