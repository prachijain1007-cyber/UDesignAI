import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

neonConfig.poolQueryViaFetch = true;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const models = [
  "adminUser",
  "visitorSession",
  "websiteEvent",
  "imageAsset",
  "generatedDesign",
  "lead",
  "leadNote",
  "leadScoreHistory",
  "conversation",
  "message",
  "consultation",
];

let ok = true;
for (const model of models) {
  try {
    const count = await prisma[model].count();
    console.log(`OK   ${model.padEnd(20)} count=${count}`);
  } catch (err) {
    ok = false;
    console.error(`FAIL ${model.padEnd(20)}`, err.message);
  }
}

await prisma.$disconnect();
process.exit(ok ? 0 : 1);
