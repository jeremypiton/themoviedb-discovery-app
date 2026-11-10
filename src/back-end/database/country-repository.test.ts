import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { initializeSchema } from './schema';
import {
  deleteUnreferencedCountries,
  getCountryByCode,
  getCountries,
  saveCountry,
  saveCountries,
  type Country,
} from './country-repository';

describe('country-repository.ts', () => {
  it('finds a country by code and returns undefined when it does not exist', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveCountries(database, [{ code: 'FR', name: 'France' }]);

      expect(getCountryByCode(database, 'FR')).toEqual({
        code: 'FR',
        name: 'France',
      });
      expect(getCountryByCode(database, 'US')).toBeUndefined();
    } finally {
      database.close();
    }
  });

  it('saves an iterable, keeps the last duplicate label, and sorts results', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveCountries(database, [
        { code: 'US', name: 'United States' },
        { code: 'FR', name: 'Franc' },
        { code: 'FR', name: 'France' },
      ]);

      expect(getCountries(database)).toEqual([
        { code: 'FR', name: 'France' },
        { code: 'US', name: 'United States' },
      ]);
    } finally {
      database.close();
    }
  });

  it('does not change existing data when saving an empty iterable', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveCountries(database, [{ code: 'FR', name: 'France' }]);
      saveCountries(database, []);

      expect(getCountries(database)).toEqual([{ code: 'FR', name: 'France' }]);
    } finally {
      database.close();
    }
  });

  it('saves one country', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveCountry(database, { code: 'JP', name: 'Japon' });

      expect(getCountryByCode(database, 'JP')).toEqual({
        code: 'JP',
        name: 'Japon',
      });
    } finally {
      database.close();
    }
  });

  it('rolls back all changes when saving countries fails', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);
    const error = new Error('Unable to read countries');

    function* failingCountries(): Iterable<Country> {
      yield { code: 'FR', name: 'France' };
      throw error;
    }

    try {
      expect(() => saveCountries(database, failingCountries())).toThrow(error);
      expect(getCountries(database)).toEqual([]);
    } finally {
      database.close();
    }
  });

  it('deletes only countries without production references', () => {
    const database = new DatabaseSync(':memory:');
    initializeSchema(database);

    try {
      saveCountries(database, [
        { code: 'FR', name: 'France' },
        { code: 'US', name: 'United States' },
      ]);
      database.exec(`
        INSERT INTO movies (id, title, original_title, original_language, overview, collected_at)
        VALUES (1, 'Movie', 'Movie', 'en', 'Overview', '2026-01-01');
        INSERT INTO production_countries (movie_id, country_code)
        VALUES (1, 'FR');
      `);

      expect(deleteUnreferencedCountries(database)).toBe(1);
      expect(getCountries(database)).toEqual([{ code: 'FR', name: 'France' }]);
    } finally {
      database.close();
    }
  });
});
