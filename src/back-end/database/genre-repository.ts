import type { DatabaseSync } from 'node:sqlite';

export type Genre = {
  id: number;
  name: string;
};

/**
 * Returns the genre identified by its TMDB identifier.
 */
export function getGenreById(
  database: DatabaseSync,
  id: number,
): Genre | undefined {
  return database
    .prepare('SELECT id, name FROM genres WHERE id = ?')
    .get(id) as unknown as Genre | undefined;
}

/**
 * Inserts or updates all provided genres in one transaction.
 */
export function saveGenres(
  database: DatabaseSync,
  genres: Iterable<Genre>,
): void {
  const statement = database.prepare(
    `INSERT INTO genres (id, name)
     VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
  );

  database.exec('BEGIN TRANSACTION;');
  try {
    for (const genre of genres) {
      statement.run(genre.id, genre.name);
    }
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

/**
 * Inserts or updates one genre.
 */
export function saveGenre(database: DatabaseSync, genre: Genre): void {
  saveGenres(database, [genre]);
}

/**
 * Returns all genres ordered by their TMDB identifier.
 */
export function getGenres(database: DatabaseSync): Genre[] {
  return database
    .prepare('SELECT id, name FROM genres ORDER BY id')
    .all() as unknown as Genre[];
}
