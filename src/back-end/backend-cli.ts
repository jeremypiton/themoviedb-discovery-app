#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_DATABASE_PATH, getDatabase } from './database/schema.ts';
import type { Genre } from './database/genre-repository.ts';
import { deleteUnusedGenres, saveGenres } from './database/genre-repository.ts';

const DEFAULT_GENRES_PATH = resolve('data/genres.csv');

function parseGenresCsv(csv: string): Genre[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (header !== 'id,name') {
    throw new Error('The genres CSV must start with the "id,name" header');
  }

  return rows
    .filter((row) => row.trim() !== '')
    .map((row, index) => {
      const [idValue, ...nameParts] = row.split(',');
      const id = Number(idValue);
      const name = nameParts.join(',').trim();

      if (!Number.isInteger(id) || name === '') {
        throw new Error(`Invalid genre on CSV line ${index + 2}`);
      }

      return { id, name };
    });
}

export function addGenres(
  databasePath = DEFAULT_DATABASE_PATH,
  csvPath = DEFAULT_GENRES_PATH,
): void {
  const database = getDatabase(databasePath);
  try {
    const genres = parseGenresCsv(readFileSync(csvPath, 'utf8'));
    saveGenres(database, genres);
    console.log(`Imported ${genres.length} genres from ${resolve(csvPath)}`);
  } finally {
    database.close();
  }
}

export function cleanGenres(databasePath = DEFAULT_DATABASE_PATH): void {
  const database = getDatabase(databasePath);
  try {
    deleteUnusedGenres(database);
    console.log('Unused genres removed');
  } finally {
    database.close();
  }
}

/** Command-line interface for movie database operations. */
const program = new Command().description('CLI for movie database operations');

program
  .command('create-database')
  .description('Create and initialize the movies database schema')
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .action(({ path }: { path: string }) => {
    const database = getDatabase(path);
    database.close();
    console.log(`Database available at ${resolve(path)}`);
  });

program
  .command('add-genres')
  .description('Import genres from a CSV file')
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .option(
    '-f, --file <path>',
    'path to the genres CSV file',
    DEFAULT_GENRES_PATH,
  )
  .action(({ path, file }: { path: string; file: string }) => {
    addGenres(path, file);
  });

program
  .command('clean-genres')
  .description('Remove genres that are not used by any movie')
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .action(({ path }: { path: string }) => {
    cleanGenres(path);
  });

program.parse();
