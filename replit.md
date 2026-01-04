# RecruitTrack - Volleyball Recruiting Contact Manager

## Overview

RecruitTrack is a productivity web application designed for volleyball players to manage their college recruiting process. The application helps users track college coach contacts, send personalized emails using templates with merge fields, set follow-up reminders, and log all communication history. It follows a Linear-inspired clean, modern aesthetic focused on efficient data management and streamlined workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx
- **API Design**: RESTful JSON API with routes prefixed at `/api/`
- **Email Integration**: Nodemailer for SMTP email sending via Gmail app passwords

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Validation**: Drizzle-Zod generates Zod schemas from database tables for type-safe validation
- **Current Storage**: In-memory storage implementation (`MemStorage` class) with interface designed for database migration

### Core Data Models
- **Coaches**: Contact information, school, position, division, status tracking
- **Contacts**: Communication log entries linked to coaches
- **Reminders**: Follow-up tasks with due dates and completion status
- **Email Templates**: Reusable email templates with merge field support ({{coach_name}}, {{school}}, etc.)
- **Gmail Settings**: iCloud Mail SMTP configuration (smtp.mail.me.com:587) for email sending
- **Recruiting Profiles**: User's profile links (NCSA, Hudl, MaxPreps, etc.) for quick insertion into emails

### Project Structure
```
client/           # React frontend
  src/
    components/   # Reusable UI components
    pages/        # Route-based page components
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Entry point
  routes.ts       # API route handlers
  storage.ts      # Data access layer
shared/           # Shared types and schemas
  schema.ts       # Drizzle table definitions
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires DATABASE_URL environment variable)
- **Drizzle Kit**: Database migrations via `npm run db:push`

### Email Service
- **iCloud Mail SMTP**: Configured through app-specific passwords (smtp.mail.me.com:587)
- **Nodemailer**: Node.js email client for sending through SMTP
- **File Attachments**: Base64-encoded files (PDF, Word, images, videos up to 10MB) sent with emails

### UI Dependencies
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **embla-carousel-react**: Carousel component

### Development Tools
- **Vite**: Frontend build and dev server with HMR
- **esbuild**: Production server bundling
- **TypeScript**: Type checking across the entire codebase