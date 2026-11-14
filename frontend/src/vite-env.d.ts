/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the InvoiceFlow API, without the `/api/v1` suffix. */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
