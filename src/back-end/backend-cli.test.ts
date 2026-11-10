import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_DATABASE_PATH = '/tmp/movies-default.sqlite';

const closeMock = vi.fn();
const getDatabaseMock = vi.fn(() => ({
  close: closeMock,
}));
const saveCountriesMock = vi.fn();
const deleteUnreferencedCountriesMock = vi.fn();

vi.mock('./database/schema.ts', () => ({
  DEFAULT_DATABASE_PATH,
  getDatabase: getDatabaseMock,
}));

vi.mock('./database/country-repository.ts', () => ({
  deleteUnreferencedCountries: deleteUnreferencedCountriesMock,
  saveCountries: saveCountriesMock,
}));

/**
 * Executes the backend CLI with the specified command-line arguments
 * @param args The command-line arguments to pass to the CLI
 */
async function runCliWithArgs(args: string[]): Promise<void> {
  const originalArgv = process.argv;
  process.argv = ['node', 'src/back-end/backend-cli.ts', ...args];
  try {
    await import('./backend-cli.ts');
  } finally {
    process.argv = originalArgv;
  }
}

async function loadCountriesParser(): Promise<
  (content: string) => { code: string; name: string }[]
> {
  const module = await import('./backend-cli.ts');
  return module.parseCountriesCsv;
}

describe('backend-cli.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('create-database', () => {
    it('uses the default database path when the subcommand has no path option', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['create-database']);

        expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `Database available at ${resolve(DEFAULT_DATABASE_PATH)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });

    it('uses the path passed in --path', async () => {
      const customDatabasePath = './data/custom-movies.sqlite';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['create-database', '--path', customDatabasePath]);

        expect(getDatabaseMock).toHaveBeenCalledWith(customDatabasePath);
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `Database available at ${resolve(customDatabasePath)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('parseCountriesCsv', () => {
    it('parses BOM, CRLF, reordered headers, empty lines, and quoted values', async () => {
      const directory = mkdtempSync(`${tmpdir()}/countries-cli-`);
      const csvPath = resolve(directory, 'countries.csv');
      const databasePath = resolve(directory, 'movies.sqlite');
      writeFileSync(
        csvPath,
        '\ufeff name , code\r\n"Congo, Republic of the", CG\r\n\r\n"United States ""of"" America", US\r\n',
      );

      try {
        const output = execFileSync(
          'npx',
          [
            'tsx',
            'src/back-end/backend-cli.ts',
            'add-countries',
            csvPath,
            '--path',
            databasePath,
          ],
          { encoding: 'utf8' },
        );

        expect(output).toContain('2 countries imported/updated');
        expect(readFileSync(csvPath, 'utf8')).toContain('Congo');
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });

    it('rejects invalid headers, values, and CSV syntax', async () => {
      const directory = mkdtempSync(`${tmpdir()}/countries-cli-`);
      const csvPath = resolve(directory, 'countries.csv');
      const databasePath = resolve(directory, 'movies.sqlite');
      writeFileSync(csvPath, 'country,name\nFR,France\n');

      try {
        expect(() =>
          execFileSync(
            'npx',
            [
              'tsx',
              'src/back-end/backend-cli.ts',
              'add-countries',
              csvPath,
              '--path',
              databasePath,
            ],
            { encoding: 'utf8', stdio: 'pipe' },
          ),
        ).toThrow('Invalid countries CSV headers');
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });

    it('validates all row-level errors', async () => {
      const parseCountriesCsv = await loadCountriesParser();

      expect(() => parseCountriesCsv('code,name\nfr,France')).toThrow(
        'Invalid country code',
      );
      expect(() => parseCountriesCsv('code,name\nFR,')).toThrow(
        'Invalid country name',
      );
      expect(() => parseCountriesCsv('code,name\nFR')).toThrow(
        'Invalid countries CSV syntax',
      );
      expect(() => parseCountriesCsv('code,name\nFR,"France')).toThrow(
        'Invalid countries CSV syntax',
      );
    });
  });

  describe('country commands', () => {
    it('imports validated countries, uses the database path, and closes the connection', async () => {
      const directory = mkdtempSync(`${tmpdir()}/countries-cli-`);
      const csvPath = resolve(directory, 'countries.csv');
      const databasePath = './data/custom-movies.sqlite';
      writeFileSync(csvPath, 'code,name\nFR,France\n');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await runCliWithArgs([
          'add-countries',
          csvPath,
          '--path',
          databasePath,
        ]);

        expect(getDatabaseMock).toHaveBeenCalledWith(databasePath);
        expect(saveCountriesMock).toHaveBeenCalledWith(
          expect.objectContaining({ close: closeMock }),
          [{ code: 'FR', name: 'France' }],
        );
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `1 countries imported/updated in ${resolve(databasePath)}`,
        );
      } finally {
        logSpy.mockRestore();
        rmSync(directory, { recursive: true, force: true });
      }
    });

    it('cleans unreferenced countries and closes the connection', async () => {
      const customDatabasePath = './data/custom-movies.sqlite';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      deleteUnreferencedCountriesMock.mockReturnValue(3);

      try {
        await runCliWithArgs(['clean-countries', '--path', customDatabasePath]);

        expect(getDatabaseMock).toHaveBeenCalledWith(customDatabasePath);
        expect(deleteUnreferencedCountriesMock).toHaveBeenCalledWith(
          expect.objectContaining({ close: closeMock }),
        );
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `3 countries deleted from ${resolve(customDatabasePath)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
