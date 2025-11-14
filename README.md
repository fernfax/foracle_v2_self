# Foracle - Personal Finance Management App

A comprehensive personal finance management application built with Next.js 14, Clerk authentication, and PostgreSQL.

## Features

- **User Authentication**: Secure authentication powered by Clerk
- **Dashboard**: Beautiful overview of your financial health
- **Income Tracking**: Monitor multiple income sources
- **Expense Management**: Track and categorize expenses
- **Asset Management**: Keep track of all your assets
- **Policy Management**: Manage insurance policies and subscriptions
- **Goal Setting**: Set and track financial goals
- **Family Planning**: Add family members and plan for their future
- **Data Isolation**: Each user can only access their own data

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Shadcn/ui
- **Authentication**: Clerk
- **Database**: PostgreSQL with Drizzle ORM
- **Language**: TypeScript

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ and npm
- PostgreSQL (running locally)
- A Clerk account (free tier available at [clerk.com](https://clerk.com))

## Getting Started

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL Database

Make sure PostgreSQL is running on your local machine, then create a database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE foracle;

# Exit psql
\q
```

### 3. Configure Environment Variables

Copy the example environment file and update it with your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and update the following variables:

```env
# Database - Update if your PostgreSQL credentials are different
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/foracle"

# Clerk Authentication - Get these from your Clerk dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### 4. Set Up Clerk

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Create a new application
3. Copy your **Publishable Key** and **Secret Key** to `.env.local`
4. In Clerk Dashboard, go to **Webhooks** and create a new endpoint:
   - URL: `http://localhost:3000/api/webhooks/clerk` (for development)
   - Subscribe to events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret** as `CLERK_WEBHOOK_SECRET` in `.env.local`

### 5. Initialize Database

Generate and push the database schema:

```bash
# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Drizzle migration files
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Project Structure

```
foracle_v2/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   └── webhooks/        # Clerk webhooks
│   ├── dashboard/           # Protected dashboard pages
│   ├── sign-in/            # Sign in page
│   ├── sign-up/            # Sign up page
│   ├── layout.tsx          # Root layout with Clerk
│   └── page.tsx            # Landing page
├── components/              # React components
│   └── ui/                 # Shadcn/ui components
├── db/                      # Database
│   ├── schema.ts           # Drizzle schema
│   └── index.ts            # Database connection
├── lib/                     # Utilities
│   ├── actions/            # Server actions
│   └── utils.ts            # Helper functions
├── middleware.ts            # Clerk middleware
└── drizzle.config.ts       # Drizzle configuration
```

## Database Schema

The application includes the following tables:

- **users**: User profiles (synced with Clerk)
- **family_members**: Family member information
- **incomes**: Income sources
- **expenses**: Expense tracking
- **assets**: Asset management
- **policies**: Insurance and subscription policies
- **goals**: Financial goals

All tables enforce user-level data isolation through foreign key relationships.

## Data Isolation & Security

- **Authentication**: Clerk handles secure user authentication
- **Authorization**: Middleware protects dashboard routes
- **Data Isolation**: All database queries filter by authenticated user ID
- **Server Actions**: User-specific data fetching through server actions
- **Webhooks**: Clerk webhooks sync user data to PostgreSQL

## Next Steps

Now that your app is running, you can:

1. Create an account and sign in
2. Explore the dashboard
3. Start building out the individual feature pages (income, expenses, etc.)
4. Add your logo and branding assets
5. Customize the color scheme in `app/globals.css`

## Adding Your Logo

To add your logo:

1. Place your logo file in the `public` folder
2. Update the navigation components in:
   - `app/page.tsx` (landing page)
   - `app/dashboard/layout.tsx` (dashboard)
3. Replace the `TrendingUp` icon with an Image component pointing to your logo

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify PostgreSQL is running: `psql -U postgres`
2. Check your `DATABASE_URL` in `.env.local`
3. Ensure the `foracle` database exists

### Clerk Authentication Issues

If authentication isn't working:

1. Verify your Clerk keys in `.env.local`
2. Check that your webhook is configured correctly
3. Ensure the webhook URL is accessible (use ngrok for local testing)

### Build Errors

If you encounter build errors:

1. Delete `node_modules` and `.next` folders
2. Run `npm install` again
3. Run `npm run build`

## Contributing

This is a personal project. Feel free to fork and customize for your own use!

## License

MIT
