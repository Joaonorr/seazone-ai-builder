-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "bedroomQuantity" INTEGER NOT NULL,
    "bathroomQuantity" INTEGER NOT NULL,
    "guestCapacity" INTEGER NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "wifiNetwork" TEXT NOT NULL,
    "wifiPassword" TEXT NOT NULL,
    "isSelfCheckin" BOOLEAN NOT NULL,
    "propertyAccessType" TEXT NOT NULL,
    "propertyAccessInstructions" TEXT NOT NULL,
    "propertyPassword" TEXT,
    "hasParkingSpot" BOOLEAN NOT NULL,
    "parkingSpotIdentifier" TEXT,
    "parkingSpotInstructions" TEXT,
    "checkInTime" TEXT NOT NULL,
    "checkOutTime" TEXT NOT NULL,
    "allowPet" BOOLEAN NOT NULL,
    "smokingPermitted" BOOLEAN NOT NULL,
    "suitableForChildren" BOOLEAN NOT NULL,
    "suitableForBabies" BOOLEAN NOT NULL,
    "eventsPermitted" BOOLEAN NOT NULL,
    "amenities" JSONB NOT NULL,
    "images" JSONB NOT NULL,
    "hostName" TEXT NOT NULL,
    "hostPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceGuide" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL,
    "restaurants" JSONB NOT NULL,
    "attractions" JSONB NOT NULL,
    "essentials" JSONB NOT NULL,
    "seasonalTip" TEXT NOT NULL,
    "modelName" TEXT,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_code_key" ON "Property"("code");

-- CreateIndex
CREATE INDEX "Property_city_state_idx" ON "Property"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceGuide_propertyId_key" ON "ExperienceGuide"("propertyId");

-- AddForeignKey
ALTER TABLE "ExperienceGuide" ADD CONSTRAINT "ExperienceGuide_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
