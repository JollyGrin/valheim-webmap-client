import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';
import type { Request, Response } from 'express';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Get all pins
app.get('/pins', async (req: Request, res: Response) => {
  try {
    const pins = await prisma.pin.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    res.json(pins);
  } catch (error) {
    console.error('Error fetching pins:', error);
    res.status(500).json({ error: 'Failed to fetch pins' });
  }
});

// Create a new pin
app.post('/pins', async (req: Request, res: Response) => {
  const { x, z, type, label, userId } = req.body;

  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pin = await prisma.pin.create({
      data: {
        x: parseFloat(x),
        z: parseFloat(z),
        type,
        label,
        userId
      }
    });

    res.status(201).json(pin);
  } catch (error) {
    console.error('Error creating pin:', error);
    res.status(500).json({ error: 'Failed to create pin' });
  }
});

// Delete a pin
app.delete('/pins/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const pin = await prisma.pin.delete({
      where: { id }
    });
    res.json(pin);
  } catch (error) {
    console.error('Error deleting pin:', error);
    res.status(500).json({ error: 'Failed to delete pin' });
  }
});

// Get pins by user
app.get('/users/:userId/pins', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const pins = await prisma.pin.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    res.json(pins);
  } catch (error) {
    console.error('Error fetching user pins:', error);
    res.status(500).json({ error: 'Failed to fetch user pins' });
  }
});

// User routes
app.post('/users', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password // Note: In a real app, hash this password!
      }
    });

    // Don't return the password in response
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all users
app.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            pins: true
          }
        }
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Initialize database
async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to database');
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
}

main();
