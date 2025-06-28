# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Versioning

L'applicazione visualizza la versione corrente nella dashboard. Il numero di versione è letto dal campo `version` di `package.json` ed è disponibile come costante `__APP_VERSION__` durante la build Vite.

## Database migrations

- `06. Alter fogli_assistenza add assegnato_a_user_id.sql` adds an `assegnato_a_user_id` column to `fogli_assistenza` and populates it for existing records.
- `27. Policy fogli_assistenza.sql` now allows users assigned to a sheet via `assegnato_a_user_id` to select and update it.
- `28. Policy interventi_assistenza.sql` permits actions on interventions when the user is the technician assigned to the parent sheet.
- `29. Function is_user_assigned_to_foglio.sql` also checks the `assegnato_a_user_id` field.
- `52. FK fogli_assistenza assegnato_a_profiles.sql` links `fogli_assistenza.assegnato_a_user_id` to `public.profiles.id`.
