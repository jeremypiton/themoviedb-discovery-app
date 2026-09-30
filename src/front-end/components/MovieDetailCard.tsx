import type { MovieDetails } from "../../back-end/schemas/MoviesTypes";
import { Link } from "react-router";

type MovieDetailCardProps = {
  movie: MovieDetails;
};

export default function MovieDetailCard({ movie }: MovieDetailCardProps) {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : "Date inconnue";
  const runtime = movie.runtime ? `${movie.runtime} min` : "Durée inconnue";

  return (
    <article className="movie-detail-card">
      <Link className="movie-detail-back" to="/movies">
        ← Retour aux films
      </Link>
      <figure className="movie-detail-hero-container">
        {posterUrl ? (
          <img className="movie-detail-hero" src={posterUrl} alt={`Affiche de ${movie.title}`} />
        ) : (
          <div className="movie-detail-hero movie-detail-hero-placeholder" />
        )}
      </figure>
      <div className="movie-detail-copy">
        <p className="movie-detail-kicker">Détails du film</p>
        <h1>{movie.title}</h1>
        {movie.tagline ? <p className="movie-detail-tagline">{movie.tagline}</p> : null}
        <dl className="movie-detail-meta">
          <div>
            <dt>Sortie</dt>
            <dd>{releaseYear}</dd>
          </div>
          <div>
            <dt>Durée</dt>
            <dd>{runtime}</dd>
          </div>
          <div>
            <dt>Note</dt>
            <dd>{movie.vote_average.toFixed(1)}</dd>
          </div>
        </dl>
        <ul className="movie-detail-genres" aria-label="Genres du film">
          {movie.genres.map((genre) => (
            <li key={genre.id}>{genre.name}</li>
          ))}
        </ul>
        <section className="movie-detail-section">
          <h2>Synopsis</h2>
          <p>{movie.overview || "Aucun résumé disponible."}</p>
        </section>
      </div>
    </article>
  );
}
