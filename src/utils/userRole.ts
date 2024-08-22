import { User } from "../api/models/User";
import logger from "../logger";

export async function getUserRole(userId: string): Promise<'admin' | 'moderator' | 'user' > {
    try {
      const user = await User.findOne({ userId });
      if (user) {
        return user.role;
      }
      return 'user';
    } catch (error) {
      logger.error(`Error getting user role: ${error}`);
      return 'user';
    }
  }