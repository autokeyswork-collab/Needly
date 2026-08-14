const { PrismaClient } = require("@prisma/client");

// Reuse a single client across the app (avoids exhausting DB connections
// in dev with hot-reload, and is the standard Prisma pattern).
const prisma = new PrismaClient();

module.exports = prisma;
