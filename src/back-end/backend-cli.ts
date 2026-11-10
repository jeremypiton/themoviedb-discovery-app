#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { DEFAULT_DATABASE_PATH, getDatabase } from './database/schema.ts';
import {
  deleteUnreferencedCountries,
  saveCountries,
  type Country,
} from './database/country-repository.ts';

export function parseCountriesCsv(content: string): Country[] {
  let records: string[][];
  try {
    records = parse(content, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];
  } catch (error) {
    throw new Error(
      `Invalid countries CSV syntax: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const [headers, ...rows] = records;
  if (
    !headers ||
    headers.length !== 2 ||
    new Set(headers.map((header) => header.toLowerCase())).size !== 2 ||
    !headers.every((header) => ['code', 'name'].includes(header.toLowerCase()))
  ) {
    throw new Error('Invalid countries CSV headers: expected code and name');
  }

  const codeIndex = headers.findIndex(
    (header) => header.toLowerCase() === 'code',
  );
  const nameIndex = headers.findIndex(
    (header) => header.toLowerCase() === 'name',
  );

  return rows.map((row, index) => {
    if (row.length !== 2) {
      throw new Error(
        `Invalid countries CSV row ${index + 2}: expected code and name`,
      );
    }

    const code = row[codeIndex];
    const name = row[nameIndex];
    if (!code || !/^[A-Z]{2}$/.test(code)) {
      throw new Error(
        `Invalid country code at row ${index + 2}: expected two uppercase letters`,
      );
    }
    if (!name) {
      throw new Error(
        `Invalid country name at row ${index + 2}: value cannot be empty`,
      );
    }

    return { code, name };
  });
}

function readCountriesCsv(path: string): Country[] {
  return parseCountriesCsv(readFileSync(path, 'utf8'));
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
  .command('add-countries <csv-file>')
  .description('Import countries from a CSV file')
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .action((csvFile: string, { path }: { path: string }) => {
    const countries = readCountriesCsv(csvFile);
    let database: ReturnType<typeof getDatabase> | undefined;
    try {
      database = getDatabase(path);
      saveCountries(database, countries);
      console.log(
        `${countries.length} countries imported/updated in ${resolve(path)}`,
      );
    } finally {
      database?.close();
    }
  });

program
  .command('clean-countries')
  .description('Remove countries not referenced by any movie')
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .action(({ path }: { path: string }) => {
    let database: ReturnType<typeof getDatabase> | undefined;
    try {
      database = getDatabase(path);
      const deletedCount = deleteUnreferencedCountries(database);
      console.log(`${deletedCount} countries deleted from ${resolve(path)}`);
    } finally {
      database?.close();
    }
  });

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  program.parse();
}
