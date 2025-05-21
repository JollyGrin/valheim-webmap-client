# Getting Started with Valheim Map API

This guide will help you set up the PostgreSQL database and API server for your Valheim Map application.

## Prerequisites

1. Node.js (v14 or later)
2. PostgreSQL installed locally or a cloud PostgreSQL instance
3. Git

## Local Development Setup

### 1. Database Setup

#### Option 1: Local PostgreSQL

1. Install PostgreSQL if you haven't already: [PostgreSQL Downloads](https://www.postgresql.org/download/)
2. Create a new database:
   ```sql
   CREATE DATABASE valheim_map;
   ```
3. Create a user (or use an existing one) with permissions to this database

#### Option 2: Docker PostgreSQL

If you prefer using Docker, you can run PostgreSQL in a container:

```bash
docker run --name valheim-postgres -e POSTGRES_PASSWORD=your_password -e POSTGRES_USER=your_user -e POSTGRES_DB=valheim_map -p 5432:5432 -d postgres
```

### 2. API Setup

1. Clone the repository (if you haven't already)
2. Navigate to the database directory:
   ```bash
   cd valheim-map-iframe/database
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/valheim_map?schema=public"
   PORT=3000
   NODE_ENV=development
   ```
   Replace `username` and `password` with your PostgreSQL credentials.

5. Generate the Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Run the initial migration:
   ```bash
   npm run prisma:migrate
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

The API server should now be running at http://localhost:3000.

## Test Data Setup

You can use these sample API calls to create test data:

### 1. Create a Test User

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Note the `id` from the response for creating pins.

### 2. Create Test Pins

```bash
curl -X POST http://localhost:3000/pins \
  -H "Content-Type: application/json" \
  -d '{
    "x": 100.5,
    "z": -200.3,
    "type": "house",
    "label": "Main Base",
    "userId": "user-id-from-previous-step"
  }'
```

## Using Prisma Studio

Prisma provides a visual database browser called Prisma Studio. To use it:

```bash
npm run prisma:studio
```

This will open a browser window where you can view and manage your database records.

## Deployment to Railway

1. Create a [Railway](https://railway.app/) account
2. Create a new project
3. Add a PostgreSQL database to your project
4. Connect your GitHub repository to Railway
5. Railway will automatically detect the Node.js app and deploy it
6. Set up automatic deployments for future changes

## Troubleshooting

### Database Connection Issues

- Verify your PostgreSQL service is running
- Check the connection string in your `.env` file
- Ensure your database user has proper permissions

### Prisma Migration Failures

- Reset the database if needed:
  ```bash
  npx prisma migrate reset
  ```
- Verify your Prisma schema for errors:
  ```bash
  npx prisma validate
  ```

### API Server Errors

- Check the server logs for detailed error messages
- Verify all environment variables are correctly set
- Ensure port 3000 is not in use by another application

## Next Steps

Once you have the API running, you can integrate it with your SvelteKit application using the provided `api.ts` file in the `src/lib` directory.
