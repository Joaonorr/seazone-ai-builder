import { prisma } from "@/lib/prisma";

export function getPropertyBasicsByCode(code: string) {
  return prisma.property.findUnique({
    where: {
      code,
    },
    select: {
      code: true,
      name: true,
      propertyType: true,
      city: true,
      state: true,
      bedroomQuantity: true,
      bathroomQuantity: true,
      guestCapacity: true,
    },
  });
}
