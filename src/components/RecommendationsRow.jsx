/**
 * Componente para mostrar recomendaciones personalizadas
 * 
 * Muestra "Porque viste X, te recomendamos Y" y "Tendencias para ti"
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPersonalizedRecommendations, getPersonalizedTrends } from '../services/supabase/recommendationService';
import MovieRow from './MovieRow';

function RecommendationsRow() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendations() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [recs, personalizedTrends] = await Promise.all([
          getPersonalizedRecommendations(user.id, 20),
          getPersonalizedTrends(user.id, 20)
        ]);

        setRecommendations(recs || []);
        setTrends(personalizedTrends || []);
      } catch (err) {
        console.error('Error cargando recomendaciones:', err);
        setRecommendations([]);
        setTrends([]);
      } finally {
        setLoading(false);
      }
    }

    loadRecommendations();
  }, [user]);

  if (!user || loading) {
    return null;
  }

  return (
    <>
      {recommendations.length > 0 && (
        <MovieRow title="Recomendaciones para ti" movies={recommendations} />
      )}
      {trends.length > 0 && (
        <MovieRow title="Tendencias para ti" movies={trends} />
      )}
    </>
  );
}

export default RecommendationsRow;

