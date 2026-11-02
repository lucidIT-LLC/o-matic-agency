# Vendored validators

`ajv-bundle.mjs` is esbuild output of Ajv 8.17.1 and ajv-formats 3.0.1 (both MIT).
`scripts/verify-m365.mjs` loads it so Microsoft 365 manifest checks run offline.

The JSON schemas under `scripts/m365-schemas/` are Microsoft's published drafts:

- declarative agent 1.9
- API plugin 2.4
- Teams / Microsoft 365 app manifest 1.30

Fetched 2026-11-02 from `developer.microsoft.com/json-schemas/`.
