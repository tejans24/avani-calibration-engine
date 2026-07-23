/**
 * Canonical schema version for the Avani knowledge contracts.
 *
 * Bump on any change to a schema shape:
 *  - patch: description/doc-only changes
 *  - minor: additive, backward-compatible fields
 *  - major: breaking changes (removed/renamed/retyped fields) — requires a migration
 *
 * Documents carry their own `schemaVersion`; the engine refuses to parse a
 * document whose MAJOR version differs from this one (see `isSupportedVersion`).
 */
export const SCHEMA_VERSION = '1.0.0';

/** Semver string shape used by every document's `schemaVersion` field. */
export const SEMVER = /^\d+\.\d+\.\d+$/;

/** A document is loadable only if its major version matches the engine's. */
export function isSupportedVersion(version: string): boolean {
  const major = version.split('.')[0];
  const currentMajor = SCHEMA_VERSION.split('.')[0];
  return major === currentMajor;
}
