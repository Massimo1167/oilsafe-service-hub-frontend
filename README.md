# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Versioning

L'applicazione visualizza la versione corrente e una breve descrizione nella dashboard. In `vite.config.js` questi valori vengono importati direttamente da `package.json` (`import pkg from './package.json' assert { type: 'json' };`) e resi disponibili come costanti `__APP_VERSION__` e `__APP_DESCRIPTION__` durante la build Vite.

## Database migrations

- `06. Alter fogli_assistenza add assegnato_a_user_id.sql` adds an `assegnato_a_user_id` column to `fogli_assistenza` and populates it for existing records.
- `27. Policy fogli_assistenza.sql` now allows users assigned to a sheet via `assegnato_a_user_id` to select and update it.
- `28. Policy interventi_assistenza.sql` permits actions on interventions when the user is the technician assigned to the parent sheet.
- `29. Function is_user_assigned_to_foglio.sql` also checks the `assegnato_a_user_id` field.
- `52. FK fogli_assistenza assegnato_a_profiles.sql` links `fogli_assistenza.assegnato_a_user_id` to `public.profiles.id`.
- Technicians must have a `user_id` linked to `public.profiles` to be selectable when compiling a service sheet.
- `53. Alter tecnici add user_id.sql` creates a `user_id` field in `tecnici` referencing `public.profiles`.
- `54. Alter interventi_assistenza add numero_tecnici.sql` adds a `numero_tecnici` column to `interventi_assistenza` with default 1.
- The client registry now includes a button to export an Excel report of clients referenced in service sheets, orders or job orders. The exported spreadsheet lists the code of each sheet, order or job order in a dedicated column.
