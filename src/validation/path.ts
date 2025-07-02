/**
 * Path validation utility
 * 
 * Re-exports Valibot-based path validation.
 * Replaces custom validation code with schema-based validation.
 */

export { validatePath } from './schemas';
export { pathSchema, pathWithGlobsSchema } from './schemas';