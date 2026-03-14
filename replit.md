# RecruitTrack - Sports Recruiting Contact Manager

## Overview

RecruitTrack is a productivity web application designed for student-athletes to manage their college recruiting process. The application helps users track college coach contacts, send personalized emails using templates with merge fields, set follow-up reminders, log all communication history, and receive/reply to coach emails via an in-app inbox. It follows a Linear-inspired clean, modern aesthetic focused on efficient data management and streamlined workflows.

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
- **Email Integration**: Nodemailer for SMTP email sending via iCloud Mail app passwords (smtp.mail.me.com:587)

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Validation**: Drizzle-Zod generates Zod schemas from database tables for type-safe validation
- **Current Storage**: PostgreSQL database via Drizzle ORM (`DatabaseStorage` class)

### Core Data Models
- **Coaches**: Contact information, school, position, division, status tracking
- **Contacts**: Communication log entries linked to coaches
- **Reminders**: Follow-up tasks with due dates and completion status
- **Email Templates**: Reusable email templates with merge field support ({{coach_name}}, {{school}}, etc.)
- **Email Settings**: iCloud Mail SMTP configuration (smtp.mail.me.com:587) for email sending
- **Recruiting Profiles**: User's profile links (NCSA, Hudl, MaxPreps, etc.) for quick insertion into emails
- **Incoming Emails**: Emails received from coaches via IMAP sync (imap.mail.me.com:993), matched to coach records by email address, with read/unread tracking and reply capability

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
- **ImapFlow**: IMAP client for receiving emails from iCloud (imap.mail.me.com:993)
- **mailparser**: Email parsing library for extracting text/HTML body from raw email source
- **DOMPurify**: HTML sanitization for safely rendering email HTML content
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

## Docker Deployment

### Running with Docker Compose

1. **Create a `.env` file** from the example:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase connection string
   ```

2. **Run migrations:**
   ```bash
   docker compose --profile tools run migrate
   ```

3. **Start the application:**
   ```bash
   docker compose up --build
   ```

4. **Access the app:**
   Open `http://localhost:5000`

### Environment Variables

The docker-compose.yml uses a `.env` file for configuration:
- `DATABASE_URL`: PostgreSQL connection string (Supabase or local)
- `SESSION_SECRET`: Session encryption key (change in production)
- `MOCK_AUTH`: Set to `true` for local development without Replit Auth

## Database Setup (Supabase)

To use Supabase as your database:

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **Database** → **Connection string** → **URI**
3. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password
4. Set the `DATABASE_URL` secret in Replit or your `.env` file
5. Run `npm run db:push` to create the tables

## Vercel Deployment

To deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel dashboard
3. Add environment variables:
   - `DATABASE_URL`: Your Supabase connection string
   - `SESSION_SECRET`: A random secret for session encryption
   - For Google Auth via Firebase:
     - `FIREBASE_PROJECT_ID`: Your Firebase project ID
     - `VITE_FIREBASE_PROJECT_ID`: Same as above (for frontend)
     - `VITE_FIREBASE_APP_ID`: Your Firebase app ID
     - `VITE_FIREBASE_API_KEY`: Your Firebase API key
   - Or set `MOCK_AUTH=true` for testing without authentication
4. Deploy - Vercel will auto-detect the Vite framework

### Firebase Setup for Google Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Click "Add app" and select Web (</>)
3. Go to Authentication > Sign-in method and enable Google
4. Add your Vercel domain (e.g., your-app.vercel.app) to Authentication > Settings > Authorized domains
5. Copy projectId, apiKey, and appId from your app settings to Vercel environment variables

The app uses:
- `api/index.ts` - Serverless Express function for API routes with Firebase token verification
- `vercel.json` - Routing configuration for API and SPA
- `client/src/lib/firebase.ts` - Firebase client-side authentication