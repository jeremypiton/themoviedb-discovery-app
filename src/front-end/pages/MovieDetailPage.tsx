import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type { MovieDetails } from "../../back-end/schemas/MoviesTypes";
import MovieDetailCard from "../components/MovieDetailCard";
import "../app.css";

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Film introuvable");
      return;
    }

    setMovie(null);
    setError(null);

    fetch(`/api/movies/${id}?language=fr-FR`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch movie details");
        }

        return response.json() as Promise<MovieDetails>;
      })
      .then(setMovie)
      .catch(() => setError("Impossible de charger les détails du film"));
  }, [id]);

  return (
    <main className="app-shell movie-detail-page">
      {error ? <p className="status-message">{error}</p> : null}
      {!error && movie ? <MovieDetailCard movie={movie} /> : null}
      {!error && !movie ? <p className="status-message">Chargement...</p> : null}
    </main>
  );
}