/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the PHP content API, e.g. https://api.teask.asia
   * Leave it unset and the site falls back to the built-in articles plus
   * browser-only storage, which is what makes local work possible before the
   * database exists. See .env.example.
   */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
