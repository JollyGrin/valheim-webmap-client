# Valheim Map API

This is a PostgreSQL database API for storing and retrieving Valheim map pins. The API is built using Prisma and Express, making it easy to deploy to Railway.

## Setup Instructions

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `env.example`:
   ```bash
   cp env.example .env
   ```

3. Update the `.env` file with your PostgreSQL credentials.

4. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

5. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Deploying to Railway

1. Push your code to a GitHub repository.

2. Create a Railway account at [railway.app](https://railway.app).

3. Create a new project and select "PostgreSQL" as the database.

4. Once the database is created, connect your GitHub repository:
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Railway will automatically detect it's a Node.js project

5. Add the following environment variables in the Railway dashboard:
   - `PORT`: 3000 (or any other port)
   - `NODE_ENV`: production

6. Railway will automatically set the `DATABASE_URL` variable based on your PostgreSQL instance.

7. Once deployed, you can access your API at the provided Railway URL.

## API Endpoints

### Pins

- `GET /pins` - Get all pins
- `POST /pins` - Create a new pin
- `DELETE /pins/:id` - Delete a pin
- `GET /users/:userId/pins` - Get pins by user

### Users

- `POST /users` - Create a new user
- `GET /users` - Get all users

## Using with SvelteKit Frontend

Add the following utility functions to interact with the API from your SvelteKit app:

```typescript
// src/lib/api.ts

// Set your Railway deployed API URL here
const API_URL = 'https://your-railway-url.railway.app';

// Get all pins
export async function getPins() {
  const response = await fetch(`${API_URL}/pins`);
  if (!response.ok) throw new Error('Failed to fetch pins');
  return await response.json();
}

// Create a new pin
export async function createPin(pin: {
  x: number;
  z: number;
  type: string;
  label?: string;
  userId: string;
}) {
  const response = await fetch(`${API_URL}/pins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pin),
  });
  
  if (!response.ok) throw new Error('Failed to create pin');
  return await response.json();
}

// Delete a pin
export async function deletePin(id: string) {
  const response = await fetch(`${API_URL}/pins/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) throw new Error('Failed to delete pin');
  return await response.json();
}

// Get a user's pins
export async function getUserPins(userId: string) {
  const response = await fetch(`${API_URL}/users/${userId}/pins`);
  if (!response.ok) throw new Error('Failed to fetch user pins');
  return await response.json();
}
```

Then use these functions in your Svelte components:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getPins, createPin } from '$lib/api';
  
  let pins = [];
  let loading = true;
  let error = null;
  
  onMount(async () => {
    try {
      pins = await getPins();
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
  
  async function handleAddPin(pin) {
    try {
      const newPin = await createPin({
        x: currentCoords.x,
        z: currentCoords.z,
        type: pinType,
        label: pinText,
        userId: 'user-id-here' // Replace with actual user ID
      });
      
      pins = [...pins, newPin];
    } catch (e) {
      error = e.message;
    }
  }
</script>
```

## Database Schema

The database includes two main models:

### User
- `id`: Unique identifier (UUID)
- `username`: Unique username
- `email`: Unique email address
- `password`: Hashed password
- `pins`: Relationship to user's pins
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

### Pin
- `id`: Unique identifier (UUID)
- `x`: X coordinate (Float)
- `z`: Z coordinate (Float)
- `type`: Pin type (String)
- `label`: Optional label (String)
- `userId`: Reference to user who created pin
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
