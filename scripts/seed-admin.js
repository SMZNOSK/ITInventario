// scripts/seed-admin.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt"); // o "bcryptjs" si es el que tienes instalado

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const plainPassword = "Admin#2025";

  // Usa el mismo número de rondas que en tu .env (si no, 10 por defecto)
  const rounds = Number(process.env.BCRYPT_ROUNDS || "10");

  console.log("🔐 Generando hash para el usuario demo...");
  const passwordHash = await bcrypt.hash(plainPassword, rounds);

  console.log("💾 Creando / actualizando usuario admin...");
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      name: "Administrador",
      passwordHash,
      status: "ALTA",
      role: "ADMIN",
    },
    create: {
      username,
      name: "Administrador",
      passwordHash,
      status: "ALTA",
      role: "ADMIN",
    },
  });

  console.log("✅ Usuario demo listo:");
  console.log({
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
  });

  console.log("\nPuedes iniciar sesión con:");
  console.log("  Usuario: admin");
  console.log("  Contraseña: Admin#2025");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed-admin:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

