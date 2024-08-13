import { Client, User } from 'discord.js';
import logger from '../logger';

export async function fetchUserInfo(client: Client, userId: string): Promise<User | null> {
    try {
        // Попытка получить пользователя из кэша
        let user = client.users.cache.get(userId);

        if (!user) {
            // Если пользователь не найден в кэше, попробуем загрузить его
            try {
                user = await client.users.fetch(userId, { force: true });
            } catch (fetchError) {
                logger.warn(`Failed to fetch user ${userId}: ${fetchError}`);
            }
        }

        if (!user) {
            // Если все еще не удалось получить пользователя, попробуем найти его на сервере
            for (const guild of client.guilds.cache.values()) {
                try {
                    const member = await guild.members.fetch(userId);
                    if (member) {
                        user = member.user;
                        break;
                    }
                } catch (memberFetchError) {
                    logger.warn(`Failed to fetch member ${userId} from guild ${guild.id}: ${memberFetchError}`);
                }
            }
        }

        return user || null;
    } catch (error) {
        logger.error(`Error in fetchUserInfo for user ${userId}: ${error}`);
        return null;
    }
}