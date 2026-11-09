import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { initializeSchema } from './schema';
import {
  getGenreById,
  getGenres,
  saveGenre,
  saveGenres,
} from './genre-repository';

describe('genre-repository.ts', () => {
  it('finds a genre by identifier and returns undefined when it does not exist', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveGenres(database, [{ id: 35, name: 'Comedy' }]);

      expect(getGenreById(database, 35)).toEqual({ id: 35, name: 'Comedy' });
      expect(getGenreById(database, 28)).toBeUndefined();
    } finally {
      database.close();
    }
  });

  it('saves an iterable, keeps the last duplicate label, and sorts results', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveGenres(database, [
        { id: 35, name: 'Comedy' },
        { id: 18, name: 'Drama' },
        { id: 35, name: 'Comédie' },
      ]);

      expect(getGenres(database)).toEqual([
        { id: 18, name: 'Drama' },
        { id: 35, name: 'Comédie' },
      ]);
    } finally {
      database.close();
    }
  });

  it('does not change existing data when saving an empty iterable', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveGenres(database, [{ id: 18, name: 'Drama' }]);
      saveGenres(database, []);

      expect(getGenres(database)).toEqual([{ id: 18, name: 'Drama' }]);
    } finally {
      database.close();
    }
  });

  it('saves one genre', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveGenre(database, { id: 27, name: 'Horror' });

      expect(getGenreById(database, 27)).toEqual({ id: 27, name: 'Horror' });
    } finally {
      database.close();
    }
  });

  it('rolls back all changes when saving genres fails', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);
    const error = new Error('Unable to read genres');

    function* failingGenres(): Iterable<{ id: number; name: string }> {
      yield { id: 18, name: 'Drama' };
      throw error;
    }

    try {
      expect(() => saveGenres(database, failingGenres())).toThrow(error);
      expect(getGenres(database)).toEqual([]);
    } finally {
      database.close();
    }
  });
});
