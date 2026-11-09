import type { DatabaseSync } from 'node:sqlite';

export type Country = {
  code: string;
  name: string;
};

/**
 * Recherche un pays par son code.
 * Renvoie le pays correspondant ou undefined si aucun pays n'existe.
 */
export function getCountryByCode(
  database: DatabaseSync,
  code: string,
): Country | undefined {
  return database
    .prepare('SELECT code, name FROM countries WHERE code = ?')
    .get(code) as unknown as Country | undefined;
}

/**
 * Insère ou met à jour tous les pays fournis dans une seule transaction.
 * Un code existant entraîne la mise à jour du nom sans créer de doublon.
 * Si l'itérable est vide, aucune donnée n'est modifiée.
 */
export function saveCountries(
  database: DatabaseSync,
  countries: Iterable<Country>,
): void {
  const statement = database.prepare(
    `INSERT INTO countries (code, name)
     VALUES (?, ?)
     ON CONFLICT(code) DO UPDATE SET name = excluded.name`,
  );

  database.exec('BEGIN TRANSACTION;');
  try {
    for (const country of countries) {
      statement.run(country.code, country.name);
    }
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

/**
 * Insère ou met à jour un seul pays.
 */
export function saveCountry(database: DatabaseSync, country: Country): void {
  saveCountries(database, [country]);
}

/**
 * Renvoie tous les pays triés par ordre croissant de leur code.
 * Renvoie une liste vide si aucun pays n'est enregistré.
 */
export function getCountries(database: DatabaseSync): Country[] {
  return database
    .prepare('SELECT code, name FROM countries ORDER BY code ASC')
    .all() as unknown as Country[];
}
