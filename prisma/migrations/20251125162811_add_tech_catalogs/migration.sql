-- CreateTable
CREATE TABLE "OperatingSystem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "cores" INTEGER,
    "threads" INTEGER,
    "baseClockGhz" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RamOption" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "sizeGb" INTEGER,
    "ramType" TEXT,
    "speedMhz" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RamOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiskType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "interface" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiskType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageOption" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "sizeGb" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatingSystem_name_key" ON "OperatingSystem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Processor_name_key" ON "Processor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RamOption_label_key" ON "RamOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "DiskType_name_key" ON "DiskType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StorageOption_label_key" ON "StorageOption"("label");
