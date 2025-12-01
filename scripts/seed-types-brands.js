// scripts/seed-types-brands.js
/* 
  Seed de tipos de equipo y marcas.
  Se puede correr cuantas veces quieras gracias a skipDuplicates.
*/

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed de Types y Brands...");

  const types = [
    "CPU",
    "MONITOR",
    "DESKTOP DRIVE",
    "IPAD",
    "PROYECTOR",
    "FUENTE DE PODER",
    "IMPRESORA",
    "IMAC",
    "TABLET",
    "PAD DE FIRMA",
    "ESCANER",
    "RADIO",
    "PLOTTER",
    "WIFI DEVICE",
    "DIADEMA",
    "IPOD",
    "TERMINAL",
    "MARCO DIGITAL",
    "SMART TV",
    "IPHONE",
    "BASE DE CARGA",
    "STYLUS",
    "GRABADOR",
  ];

  const brands = [
    "DELL",
    "HP",
    "SONY",
    "VIEWSONIC",
    "SAMSUNG",
    "LG",
    "GATEWAY",
    "APPLE",
    "LENOVO",
  ];

  // ===== Types =====
  console.log("➡️  Insertando Types...");
  await prisma.type.createMany({
    data: types.map((name) => ({ name })),
    skipDuplicates: true, // evita error si ya existe el nombre
  });

  // ===== Brands =====
  console.log("➡️  Insertando Brands...");
  await prisma.brand.createMany({
    data: brands.map((name) => ({ name })), // typeId queda null (opcional)
    skipDuplicates: true,
  });

  console.log("✅ Seed de Types y Brands completado.");
}

main()
  .catch((err) => {
    console.error("❌ Error en seed-types-brands:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
