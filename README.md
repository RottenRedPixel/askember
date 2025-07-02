# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Development

This project uses Vercel serverless functions for API endpoints. To run the development server with full API support:

### Option 1: Full Development (with API endpoints working)
```bash
npm run dev:vercel
```
This runs the application on `http://localhost:3000` with all API endpoints functional.

### Option 2: Frontend Only (API endpoints will fail)
```bash
npm run dev
```
This runs only the Vite development server on `http://localhost:5173` but API calls will fail with 404 errors.

**Recommended:** Use `npm run dev:vercel` for development to avoid API-related errors.
