const readline = require("readline");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const email = process.argv[2];

if (!email) {
  console.error("Uso: node scripts/create-user.js <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Nova senha: ", async (pwd) => {
  try {
    const passwordHash = await bcrypt.hash(pwd, 10);
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
    });
    console.log("Usuario criado/atualizado:", email);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
});
