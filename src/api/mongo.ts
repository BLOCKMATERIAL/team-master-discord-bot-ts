import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

import logger from '../logger';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  logger.error('MONGODB_URI is not defined in the environment variables');
  process.exit(1);
}

let mongoClient: MongoClient | null = null;

const connectWithRetry = async (retryCount = 0, maxRetries = 5) => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 75000,
      connectTimeoutMS: 30000,
    });
    logger.info('Connected to MongoDB with Mongoose');

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    logger.info('Connected to MongoDB with native driver');
  } catch (error) {
    if (retryCount < maxRetries) {
      logger.error(error);
      logger.warn(
        `Failed to connect to MongoDB. Retrying in 5 seconds... (Attempt ${retryCount + 1}/${maxRetries})`,
      );
      setTimeout(() => connectWithRetry(retryCount + 1), 5000);
    } else {
      logger.error(
        'Failed to connect to MongoDB after multiple attempts. Exiting...',
      );
      process.exit(1);
    }
  }
};

export const connectToDatabase = async () => {
  await connectWithRetry();
};

export const isConnected = () => {
  return mongoose.connection.readyState === 1 && mongoClient !== null;
};

export const getNativeClient = () => {
  if (!mongoClient) {
    throw new Error('MongoDB native client is not initialized');
  }
  return mongoClient;
};
