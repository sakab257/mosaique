/** Document persisté ou importé illisible / non conforme au schéma. */
export class InvalidDataError extends Error {
  override readonly name = 'InvalidDataError';
}

/** Version de schéma non gérée (données plus récentes que l'app, ou migration absente). */
export class SchemaVersionError extends Error {
  override readonly name = 'SchemaVersionError';
}
