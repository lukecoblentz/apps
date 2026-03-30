/**
 * Removes MongoDB documents created before auth, tagged with userId "demo-user".
 * Run once: node scripts/cleanup-legacy-demo-user.mjs
 * Requires MONGODB_URI in the environment (e.g. set in .env.local and run from repo root).
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI in your environment.");
  process.exit(1);
}

await mongoose.connect(uri, { dbName: "study-tracker" });

const classes = await mongoose.connection.db
  .collection("classes")
  .deleteMany({ userId: "demo-user" });
const assignments = await mongoose.connection.db
  .collection("assignments")
  .deleteMany({ userId: "demo-user" });

console.log(
  `Removed ${classes.deletedCount} classes, ${assignments.deletedCount} assignments (userId: demo-user).`
);

await mongoose.disconnect();
process.exit(0);
