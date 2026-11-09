import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_DATABASE_PATH = '/tmp/movies-default.sqlite';

const closeMock = vi.fn();
const databaseMock = { close: closeMock };
const getDatabaseMock = vi.fn(() => databaseMock);
const readFileSyncMock = vi.fn(() => 'id,name\n18,Drama\n35,Comedy\n');
const saveGenresMock = vi.fn();
const deleteUnusedGenresMock = vi.fn();

vi.mock('./database/schema.ts', () => ({
  DEFAULT_DATABASE_PATH,
  getDatabase: getDatabaseMock,
}));

vi.mock('node:fs', () => ({
  readFileSync: readFileSyncMock,
}));

vi.mock('./database/genre-repository.ts', () => ({
  deleteUnusedGenres: deleteUnusedGenresMock,
  saveGenres: saveGenresMock,
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

  describe('add-genres', () => {
    it('imports genres from the CSV file passed in --file', async () => {
      const databasePath = './data/test.sqlite';
      const csvPath = './data/test-genres.csv';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await runCliWithArgs([
          'add-genres',
          '--path',
          databasePath,
          '--file',
          csvPath,
        ]);

        expect(getDatabaseMock).toHaveBeenCalledWith(databasePath);
        expect(readFileSyncMock).toHaveBeenCalledWith(csvPath, 'utf8');
        expect(saveGenresMock).toHaveBeenCalledWith(databaseMock, [
          { id: 18, name: 'Drama' },
          { id: 35, name: 'Comedy' },
        ]);
        expect(closeMock).toHaveBeenCalledOnce();
      } finally {
        logSpy.mockRestore();
      }
    });

    it('rejects a CSV with an invalid header', async () => {
      readFileSyncMock.mockReturnValueOnce('genre_id,name\n18,Drama\n');

      await expect(
        runCliWithArgs(['add-genres', '--file', './data/test-genres.csv']),
      ).rejects.toThrow('The genres CSV must start with the "id,name" header');
      expect(saveGenresMock).not.toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalledOnce();
    });

    it('rejects a CSV with an invalid genre row', async () => {
      readFileSyncMock.mockReturnValueOnce('id,name\ninvalid,Drama\n');

      await expect(
        runCliWithArgs(['add-genres', '--file', './data/test-genres.csv']),
      ).rejects.toThrow('Invalid genre on CSV line 2');
      expect(saveGenresMock).not.toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalledOnce();
    });
  });

  describe('clean-genres', () => {
    it('removes genres that are not used by any movie', async () => {
      const databasePath = './data/test.sqlite';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await runCliWithArgs(['clean-genres', '--path', databasePath]);

        expect(getDatabaseMock).toHaveBeenCalledWith(databasePath);
        expect(deleteUnusedGenresMock).toHaveBeenCalledWith(databaseMock);
        expect(closeMock).toHaveBeenCalledOnce();
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
