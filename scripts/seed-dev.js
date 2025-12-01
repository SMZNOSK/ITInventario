// scripts/seed-dev.js
const { PrismaClient, EquipmentStatus } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed de datos de ejemplo...");

  // 1) Tipo
  const type = await prisma.type.upsert({
    where: { name: "Laptop" },
    update: {},
    create: {
      name: "Laptop",
    },
  });
  console.log("Type:", type);

  // 2) Marca
  const brand = await prisma.brand.upsert({
    where: { name: "Dell" },
    update: {},
    create: {
      name: "Dell",
      typeId: type.id,
    },
  });
  console.log("Brand:", brand);

  // 3) Modelo
  const model = await prisma.model.upsert({
    where: {
      // Por el @@unique([name, typeId, brandId])
      name_typeId_brandId: {
        name: "XPS 13",
        typeId: type.id,
        brandId: brand.id,
      },
    },
    update: {},
    create: {
      name: "XPS 13",
      typeId: type.id,
      brandId: brand.id,
    },
  });
  console.log("Model:", model);

  // 4) Hotel
  const hotel = await prisma.hotel.upsert({
    where: { name: "Hotel Demo Cancún" },
    update: {},
    create: {
      name: "Hotel Demo Cancún",
      isActive: true,
    },
  });
  console.log("Hotel:", hotel);

  // 5) Asset (equipo) en estado ALTA
  const asset = await prisma.asset.upsert({
    where: { serial: "EQ-0001" },
    update: {},
    create: {
      serial: "EQ-0001",
      typeId: type.id,
      brandId: brand.id,
      modelId: model.id,
      currentHotelId: hotel.id,
      status: EquipmentStatus.ALTA,
      invoiceNumber: "FAC-0001",
      invoiceDate: new Date(),
    },
  });
  console.log("Asset:", asset);

  // 6) Collaborator (catálogo)
  const collaborator = await prisma.collaborator.upsert({
    where: { id: "123456" }, // EMPLID
    update: {
      name: "Juan Pérez",
    },
    create: {
      id: "123456",
      name: "Juan Pérez",
      email: "juan.perez@example.com",
      phone: "9980000000",
      jobTitle: "Analista de Sistemas",
    },
  });
  console.log("Collaborator:", collaborator);

  console.log("✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

