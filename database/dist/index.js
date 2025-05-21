"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', ((_req, res) => {
    res.json({ status: 'ok' });
}));
// Get all pins
app.get('/pins', ((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pins = yield prisma.pin.findMany({
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
    }
    catch (error) {
        console.error('Error fetching pins:', error);
        res.status(500).json({ error: 'Failed to fetch pins' });
    }
})));
// Create a new pin
app.post('/pins', ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { x, z, type, label, userId } = req.body;
    try {
        // Verify user exists
        const user = yield prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const pin = yield prisma.pin.create({
            data: {
                x: parseFloat(x),
                z: parseFloat(z),
                type,
                label,
                userId
            }
        });
        res.status(201).json(pin);
    }
    catch (error) {
        console.error('Error creating pin:', error);
        res.status(500).json({ error: 'Failed to create pin' });
    }
})));
// Delete a pin
app.delete('/pins/:id', ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const pin = yield prisma.pin.delete({
            where: { id }
        });
        res.json(pin);
    }
    catch (error) {
        console.error('Error deleting pin:', error);
        res.status(500).json({ error: 'Failed to delete pin' });
    }
})));
// Get pins by user
app.get('/users/:userId/pins', ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const pins = yield prisma.pin.findMany({
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
    }
    catch (error) {
        console.error('Error fetching user pins:', error);
        res.status(500).json({ error: 'Failed to fetch user pins' });
    }
})));
// User routes
app.post('/users', ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = req.body;
    try {
        const user = yield prisma.user.create({
            data: {
                username,
                email,
                password // Note: In a real app, hash this password!
            }
        });
        // Don't return the password in response
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
})));
// Get all users
app.get('/users', ((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({
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
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
})));
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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma.$connect();
            console.log('Connected to database');
        }
        catch (error) {
            console.error('Error connecting to database:', error);
            process.exit(1);
        }
    });
}
main();
//# sourceMappingURL=index.js.map