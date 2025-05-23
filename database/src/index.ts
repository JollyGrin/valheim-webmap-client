import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';
import type { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

// Type alias for Express request and response handlers
type ExpressHandler<ReqBody = any, ResBody = any, ReqQuery = ParsedQs> = (
  req: Request<ParamsDictionary, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>
) => Promise<any> | void; // Allow any return type since Express handlers may return Response objects

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', ((_req, res) => {
  res.json({ status: 'ok' });
}) as ExpressHandler);

// Get all pins
app.get('/pins', (async (_req, res) => {
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
}) as ExpressHandler);

// Create a new pin
app.post('/pins', (async (req, res) => {
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
}) as ExpressHandler);

// Delete a pin
app.delete('/pins/:id', (async (req, res) => {
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
}) as ExpressHandler);

// Get pins by user
app.get('/users/:userId/pins', (async (req, res) => {
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
}) as ExpressHandler);

// Media routes
// Create a new media item for a pin
app.post('/pins/:pinId/media', (async (req, res) => {
  const { pinId } = req.params;
  const { url, note, x, z } = req.body;

  try {
    // Verify pin exists
    const pin = await prisma.pin.findUnique({
      where: { id: pinId }
    });

    if (!pin) {
      return res.status(404).json({ error: 'Pin not found' });
    }

    // Use pin coordinates if x and z are not provided
    const mediaX = x !== undefined ? parseFloat(x) : pin.x;
    const mediaZ = z !== undefined ? parseFloat(z) : pin.z;

    const media = await prisma.media.create({
      data: {
        url,
        note,
        x: mediaX,
        z: mediaZ,
        pinId
      }
    });

    res.status(201).json(media);
  } catch (error) {
    console.error('Error creating media:', error);
    res.status(500).json({ error: 'Failed to create media' });
  }
}) as ExpressHandler);

// Get all media for a pin
app.get('/pins/:pinId/media', (async (req, res) => {
  const { pinId } = req.params;

  try {
    const media = await prisma.media.findMany({
      where: { pinId }
    });
    res.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
}) as ExpressHandler);

// Delete a media item
app.delete('/media/:id', (async (req, res) => {
  const { id } = req.params;

  try {
    const media = await prisma.media.delete({
      where: { id }
    });
    res.json(media);
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
}) as ExpressHandler);

// Get all media (for admin purposes)
app.get('/media', (async (_req, res) => {
  try {
    const media = await prisma.media.findMany({
      include: {
        pin: {
          select: {
            id: true,
            label: true,
            x: true,
            z: true
          }
        }
      }
    });
    res.json(media);
  } catch (error) {
    console.error('Error fetching all media:', error);
    res.status(500).json({ error: 'Failed to fetch all media' });
  }
}) as ExpressHandler);

// Create a new media item directly (without requiring a pin)
app.post('/media', (async (req, res) => {
  // Extract fields from request body, handling both our frontend naming and API naming conventions
  const { imageUrl, caption, x, z, userId } = req.body;
  
  // Use the frontend field names or fallback to API names
  const url = imageUrl || req.body.url;
  const note = caption || req.body.note;
  
  try {
    // Validation
    if (!url) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    if (x === undefined || z === undefined) {
      return res.status(400).json({ error: 'Coordinates (x, z) are required' });
    }
    
    console.log('Creating media with data:', { url, note, x, z });
    
    // Use Prisma's createMany which is less strict with relations
    const media = await prisma.$queryRaw`
      INSERT INTO "Media" (id, url, note, x, z, "createdAt") 
      VALUES (gen_random_uuid(), ${url}, ${note}, ${parseFloat(x)}, ${parseFloat(z)}, NOW())
      RETURNING *
    `;
    
    // Return the first result since we're only inserting one record
    const createdMedia = Array.isArray(media) && media.length > 0 ? media[0] : media;
    
    res.status(201).json(createdMedia);
  } catch (error) {
    console.error('Error creating media:', error);
    res.status(500).json({ error: 'Failed to create media' });
  }
}) as ExpressHandler);

// Get media within coordinate boundaries
app.get('/media/bounds', (async (req, res) => {
  // Extract min/max values from query parameters
  const { minX, maxX, minZ, maxZ } = req.query;
  
  // Validate query parameters
  if (!minX || !maxX || !minZ || !maxZ) {
    return res.status(400).json({ error: 'Missing required query parameters (minX, maxX, minZ, maxZ)' });
  }
  
  try {
    // Convert string parameters to numbers
    const minXFloat = parseFloat(minX as string);
    const maxXFloat = parseFloat(maxX as string);
    const minZFloat = parseFloat(minZ as string);
    const maxZFloat = parseFloat(maxZ as string);
    
    // Validate numeric bounds
    if (isNaN(minXFloat) || isNaN(maxXFloat) || isNaN(minZFloat) || isNaN(maxZFloat)) {
      return res.status(400).json({ error: 'All bounds must be valid numbers' });
    }
    
    const media = await prisma.media.findMany({
      where: {
        x: {
          gte: minXFloat,
          lte: maxXFloat
        },
        z: {
          gte: minZFloat,
          lte: maxZFloat
        }
      },
      include: {
        pin: {
          select: {
            id: true,
            label: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(media);
  } catch (error) {
    console.error('Error fetching media within bounds:', error);
    res.status(500).json({ error: 'Failed to fetch media within bounds' });
  }
}) as ExpressHandler<any, any, { minX: string; maxX: string; minZ: string; maxZ: string }>);

// User routes
app.post('/users', (async (req, res) => {
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
}) as ExpressHandler);

// Get all users
app.get('/users', (async (_req, res) => {
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
}) as ExpressHandler);

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
