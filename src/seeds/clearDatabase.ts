import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { User } from '../api/models/User';
import Team from '../api/models/Team';

dotenv.config();


const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in the environment variables');
  process.exit(1);
}

async function clearDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Видалення всіх команд
    const deleteTeamsResult = await Team.deleteMany({});
    console.log(`Deleted ${deleteTeamsResult.deletedCount} teams`);

    // Видалення всіх користувачів
    const deleteUsersResult = await User.deleteMany({});
    console.log(`Deleted ${deleteUsersResult.deletedCount} users`);

    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

clearDatabase();