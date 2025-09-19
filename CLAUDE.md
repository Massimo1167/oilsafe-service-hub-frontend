# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle 
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally

No test framework is currently configured in this project.

## Architecture Overview

This is a React SPA for service management at Oilsafe S.r.l., built with Vite and connected to Supabase PostgreSQL.

### Authentication & Authorization
- Supabase Auth with role-based access control (admin/manager/user)
- Complex session management in `App.jsx` handles session validation, profile fetching with timeout fallbacks, and automatic session refresh on tab focus
- User roles determine navigation access and sheet creation permissions

### Database Integration
- Supabase client configured in `supabaseClient.js` with environment variables
- Extensive Row Level Security policies defined in `/database query/` SQL files
- Database label (`VITE_SUPABASE_DB_LABEL`) determines header color (blue for main, red for debug)

### Core Data Model
- **Fogli Assistenza** (Service Sheets) - Central entity for tracking service work
- **Clienti** (Clients) - Customer master data
- **Tecnici** (Technicians) - Service technician assignments 
- **Commesse** (Job Orders) - Work order references
- **Ordini Cliente** (Customer Orders) - Customer purchase orders
- **Interventi** - Individual intervention records within service sheets

### State Management Pattern
- Shared data (clienti, tecnici, commesse, ordini) loaded in `App.jsx` and passed down as props
- Loading states separated for session (`loadingSession`) and master data (`loadingAnagrafiche`)
- Session state stored in ref for visibility change handlers

### Key Features
- Service sheet lifecycle with status progression (defined in `utils/statoFoglio.js`)
- PDF generation using jsPDF with embedded logo (`utils/pdfGenerator.js`)
- Voice input support for intervention forms
- Excel export functionality for client reports
- Signature capture for service completion

### Component Structure
- **Pages**: Top-level route components handling data fetching and page layout
- **Managers**: CRUD interfaces for master data (admin/manager only)
- **Forms**: Complex forms with validation for service sheets and interventions
- **Cards**: Display components for intervention summaries

### Environment Configuration
Required environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key  
- `VITE_SUPABASE_DB_LABEL` - Database identifier for UI styling

### Version Management
App version and description are injected from `package.json` via Vite config and displayed in the dashboard using `__APP_VERSION__` and `__APP_DESCRIPTION__` constants.

### Role-Based Access
- **User**: Can view and create service sheets
- **Manager**: Additional access to master data management
- **Admin**: Full system access

Navigation and component rendering controlled by `userRole` checks throughout the application.