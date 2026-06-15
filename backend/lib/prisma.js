// a single shared Prisma Client that the whole app imports
// so i won't need to create a new DB connection every time

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
