// scripts/seed-assets-demo.js
/**
 * Crea ~10 activos de ejemplo con distintos Type / Brand / Hotel.
 * Usa las tablas modernas: Type, Brand, Model, Hotel.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helpers para asegurarnos de que existan catálogos
async function ensureType(name) {
  let t = await prisma.type.findUnique({ where: { name } });
  if (!t) {
    t = await prisma.type.create({ data: { name } });
  }
  return t;
}

async function ensureBrand(name, typeId) {
  let b = await prisma.brand.findUnique({ where: { name } });
  if (!b) {
    b = await prisma.brand.create({
      data: {
        name,
        typeId: typeId ?? null,
      },
    });
  }
  return b;
}

async function ensureModel(name, typeId, brandId) {
  let m = await prisma.model.findFirst({
    where: { name, typeId, brandId },
  });
  if (!m) {
    m = await prisma.model.create({
      data: {
        name,
        typeId,
        brandId,
      },
    });
  }
  return m;
}

async function ensureHotel(name) {
  let h = await prisma.hotel.findUnique({ where: { name } });
  if (!h) {
    h = await prisma.hotel.create({
      data: { name },
    });
  }
  return h;
}

async function main() {
  console.log("🚀 Seed de assets demo con tipos/marcas/hoteles distintos...");

  // Muestras de activos (puedes ajustar seriales, modelos, etc.)
  const samples = [
    {
      serial: "CPU-0001",
      typeName: "CPU",
      brandName: "DELL",
      modelName: "OptiPlex 7000",
      hotelName: "Moon Palace Cancún",
      status: "ALTA",
    },
    {
      serial: "MON-0001",
      typeName: "MONITOR",
      brandName: "SAMSUNG",
      modelName: "Odyssey G5",
      hotelName: "Moon Palace Nizuc",
      status: "ALTA",
    },
    {
      serial: "DESK-0001",
      typeName: "DESKTOP DRIVE",
      brandName: "HP",
      modelName: "EliteDesk 800",
      hotelName: "The Grand at Moon Palace",
      status: "ASIGNADO",
    },
    {
      serial: "IPAD-0001",
      typeName: "IPAD",
      brandName: "APPLE",
      modelName: "iPad 10ª Gen",
      hotelName: "Moon Palace Cancún",
      status: "ASIGNADO",
    },
    {
      serial: "PROY-0001",
      typeName: "PROYECTOR",
      brandName: "VIEWSONIC",
      modelName: "PX701HD",
      hotelName: "Moon Palace Sunrise",
      status: "BAJA",
    },
    {
      serial: "IMP-0001",
      typeName: "IMPRESORA",
      brandName: "HP",
      modelName: "LaserJet Pro",
      hotelName: "Moon Palace Nizuc",
      status: "ALTA",
    },
    {
      serial: "IMAC-0001",
      typeName: "IMAC",
      brandName: "APPLE",
      modelName: "iMac 24\"",
      hotelName: "The Grand at Moon Palace",
      status: "ALTA",
    },
    {
      serial: "TAB-0001",
      typeName: "TABLET",
      brandName: "LENOVO",
      modelName: "Tab M10",
      hotelName: "Moon Palace Cancún",
      status: "ASIGNADO",
    },
    {
      serial: "WIFI-0001",
      typeName: "WIFI DEVICE",
      brandName: "LG",
      modelName: "Wi-Fi Hub X1",
      hotelName: "Moon Palace Sunrise",
      status: "ALTA",
    },
    {
      serial: "DIA-0001",
      typeName: "DIADEMA",
      brandName: "SONY",
      modelName: "WH-1000XM4",
      hotelName: "Moon Palace Nizuc",
      status: "ALTA",
    },
  ];

  for (const s of samples) {
    const type = await ensureType(s.typeName);
    const brand = await ensureBrand(s.brandName, type.id);
    const model = await ensureModel(s.modelName, type.id, brand.id);
    const hotel = await ensureHotel(s.hotelName);

    await prisma.asset.upsert({
      where: { serial: s.serial },
      update: {
        status: s.status,
        typeId: type.id,
        brandId: brand.id,
        modelId: model.id,
        currentHotelId: hotel.id,
      },
      create: {
        serial: s.serial,
        status: s.status,
        typeId: type.id,
        brandId: brand.id,
        modelId: model.id,
        currentHotelId: hotel.id,
      },
    });

    console.log(
      `✓ Asset ${s.serial} -> ${s.typeName} / ${s.brandName} / ${s.modelName} @ ${s.hotelName}`
    );
  }

  console.log("✅ Seed completado.");
}

main()
  .catch((err) => {
    console.error("❌ Error en seed-assets-demo:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
