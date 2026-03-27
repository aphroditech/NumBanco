import mongoose from "mongoose";

/** Used when `MONGO_URI` is unset — same DB name as standalone scripts under `src/scripts`. */
const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/num2bet";

export const connectDB = async () => {
  const uri = String(process.env.MONGO_URI || "").trim() || DEFAULT_MONGO_URI;
  if (!process.env.MONGO_URI?.trim()) {
    console.warn(
      "⚠️ MONGO_URI is not set — using local default (database is created on first write):",
      DEFAULT_MONGO_URI
    );
  }
  try {
    await mongoose.connect(uri);
    const { host, name } = mongoose.connection;
    console.log(`MongoDB connected → ${host} / ${name}`);
  } catch (err) {
    console.error("Database Error:", err);
    process.exit(1);
  }
};