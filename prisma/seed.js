"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const seed = async () => {
    const email = "admin@erp.com";
    const password = "admin123";
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        await prisma.user.create({
            data: {
                email,
                passwordHash,
            },
        });
    }
};
seed()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
