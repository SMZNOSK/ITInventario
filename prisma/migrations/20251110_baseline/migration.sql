-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ALTA', 'ASIGNADO', 'TRANSFERENCIA_PENDIENTE', 'BAJA');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ALTA', 'INACTIVO');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ALMACEN', 'INGENIERO');

-- CreateTable
CREATE TABLE "Type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "typeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "isDiscontinued" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" SERIAL NOT NULL,
    "serial" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "currentHotelId" INTEGER,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ALTA',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ALTA',
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHotel" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "hotelId" INTEGER NOT NULL,

    CONSTRAINT "UserHotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marca" (
    "id_marca" SERIAL NOT NULL,
    "nombre_marca" VARCHAR(120) NOT NULL,

    CONSTRAINT "marca_pkey" PRIMARY KEY ("id_marca")
);

-- CreateTable
CREATE TABLE "modelo" (
    "id_modelo" SERIAL NOT NULL,
    "nombre_modelo" VARCHAR(150) NOT NULL,
    "estado" VARCHAR(10) NOT NULL DEFAULT 'ALTA',
    "id_tipo_equipo" INTEGER NOT NULL,
    "id_marca" INTEGER NOT NULL,

    CONSTRAINT "modelo_pkey" PRIMARY KEY ("id_modelo")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id_proveedor" SERIAL NOT NULL,
    "nombre_proveedor" VARCHAR(150) NOT NULL,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id_proveedor")
);

-- CreateTable
CREATE TABLE "tipo_equipo" (
    "id_tipo_equipo" SERIAL NOT NULL,
    "nombre_tipo" VARCHAR(120) NOT NULL,

    CONSTRAINT "tipo_equipo_pkey" PRIMARY KEY ("id_tipo_equipo")
);

-- CreateIndex
CREATE UNIQUE INDEX "Type_name_key" ON "Type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Model_name_typeId_brandId_key" ON "Model"("name", "typeId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_name_key" ON "Hotel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_serial_key" ON "Equipment"("serial");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_currentHotelId_idx" ON "Equipment"("currentHotelId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserHotel_userId_hotelId_key" ON "UserHotel"("userId", "hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "marca_nombre_marca_key" ON "marca"("nombre_marca");

-- CreateIndex
CREATE UNIQUE INDEX "modelo_nombre_modelo_key" ON "modelo"("nombre_modelo");

-- CreateIndex
CREATE INDEX "idx_modelo_estado" ON "modelo"("estado");

-- CreateIndex
CREATE INDEX "idx_modelo_marca" ON "modelo"("id_marca");

-- CreateIndex
CREATE INDEX "idx_modelo_tipo" ON "modelo"("id_tipo_equipo");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_nombre_proveedor_key" ON "proveedor"("nombre_proveedor");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_equipo_nombre_tipo_key" ON "tipo_equipo"("nombre_tipo");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_currentHotelId_fkey" FOREIGN KEY ("currentHotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHotel" ADD CONSTRAINT "UserHotel_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHotel" ADD CONSTRAINT "UserHotel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo" ADD CONSTRAINT "modelo_id_marca_fkey" FOREIGN KEY ("id_marca") REFERENCES "marca"("id_marca") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "modelo" ADD CONSTRAINT "modelo_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipo_equipo"("id_tipo_equipo") ON DELETE RESTRICT ON UPDATE NO ACTION;

