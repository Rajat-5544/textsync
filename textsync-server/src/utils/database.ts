import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Use the environment variable DATABASE_URL from the .env file
const mongoURI = process.env.DATABASE_URL;

export const connectDatabase = async () => {
  try {
    if (!mongoURI) {
      throw new Error("DATABASE_URL is not defined in the environment variables");
    }

    // Connect to MongoDB using the connection string from the .env file
    await mongoose.connect(mongoURI);

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};