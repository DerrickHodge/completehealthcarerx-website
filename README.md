# Complete Healthcare RX

The official website for Complete Healthcare RX - Your trusted local pharmacy partner for personalized care, fast refills, and expert health advice.

## About Complete Healthcare RX

Complete Healthcare RX is an independent pharmacy dedicated to providing personalized healthcare solutions. We focus on:

- Personalized pharmaceutical care
- Fast and reliable prescription refills
- Expert pharmacist consultations
- Remote Patient Monitoring (RPM) services
- Prescription transfer services
- Insurance coordination

## Project Overview

This is the official website built with React, TypeScript, and Tailwind CSS. The site showcases our services and allows customers to request refills, transfer prescriptions, and join our waitlist.

## Technology Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase (PostgreSQL backend)
- Zod (Schema validation)

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DSamuelHodge/elevatedwellnessrx-website.git
   cd elevatedwellnessrx-website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env.local`
   - Update the following values:
     - `VITE_SUPABASE_URL` - Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
     - `BESTRX_API_KEY` - Your BestRX API credentials
     - `BESTRX_PHARMACY_NUMBER` - Your pharmacy number

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Database Setup

To set up the PostgreSQL schema in Supabase:

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Create a new query and paste the contents of `src/lib/migrations/001_init_schema.sql`
4. Execute the query

For detailed instructions, see [DATABASE_MIGRATION.md](.dev/DATABASE_MIGRATION.md)

## Project Structure

```
src/
  components/          - React components (Hero, Contact, Modals, etc.)
  lib/
    migrations/        - Database migration scripts
    bestrx.ts         - BestRX API integration
    schemas.ts        - Zod validation schemas
    supabaseClient.ts - Supabase client configuration
  types.ts            - TypeScript type definitions
  App.tsx             - Main application component
  index.tsx           - Application entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Database Schema

The application uses the following main tables:

- `contact_messages` - Customer inquiry submissions
- `waitlist_entries` - Waitlist signups with status tracking
- `refill_requests` - Prescription refill requests
- `transfer_requests` - Prescription transfer requests
- `splash_modal_submissions` - Email marketing signup tracking

All tables include timestamps and are protected with Row Level Security (RLS).

## Features

- Responsive design optimized for mobile, tablet, and desktop
- Contact form for general inquiries
- Prescription refill request modal
- Prescription transfer request modal
- Waitlist signup functionality
- Email marketing integration
- Insurance provider information
- Location and contact details

## Contributing

This is the official Complete Healthcare RX website repository. For contributions or issues, please contact the development team.

## License

Proprietary - Complete Healthcare RX

## Contact

For questions about the website or our services, please visit our contact page or call us directly.
