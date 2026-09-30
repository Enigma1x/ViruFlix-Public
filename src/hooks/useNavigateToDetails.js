/**
 * Hook para navegar a detalles guardando la posición de scroll actual.
 * Así "Volver" puede restaurar la posición (ej. Thriller en Películas).
 */
import { useNavigate, useLocation } from 'react-router-dom';

export function useNavigateToDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToDetails = (path) => {
    const from = location.pathname + location.search;
    const scrollY = window.scrollY ?? 0;
    navigate(path, { state: { from, scrollY } });
  };

  return navigateToDetails;
}
