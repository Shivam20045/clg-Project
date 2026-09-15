import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function seed() {
  // dynamic import — runs AFTER dotenv.config() above, unlike static imports
  const { db } = await import("../firebase/admin");
  const { dummyInterviews } = await import("../constants");

  const realUserId = "QIO2qf4IewXl1WYK82E4NyVEgEo1";

  const batch = db.batch();

  dummyInterviews.forEach((interview) => {
    const { id, ...data } = interview;
    const docRef = db.collection("interviews").doc();

    batch.set(docRef, {
      ...data,
      userId: realUserId,
      createdAt: new Date().toISOString(),
    });
  });

  await batch.commit();

  console.log(`Seeded ${dummyInterviews.length} interviews in one batch.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });