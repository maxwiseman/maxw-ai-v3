// Bun-specific extensions to global types used in sandbox scripts.
// These files run under Bun, which provides import.meta.dir and import.meta.path.

interface ImportMeta {
  /** Absolute path to the directory containing the current file (Bun only). */
  dir: string;
  /** Absolute path to the current file (Bun only). */
  path: string;
}
