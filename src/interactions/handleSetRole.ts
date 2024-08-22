import { ChatInputCommandInteraction } from 'discord.js';

import { User } from '../api/models/User';
import logger from '../logger';
import { getUserRole } from '../utils/userRole';

export async function handleSetRoleCommand(
  interaction: ChatInputCommandInteraction,
) {
  try {
    const executorRole = await getUserRole(interaction.user.id);
    if (executorRole !== 'admin') {
      await interaction.reply({
        content: 'Ця команда доступна тільки для адміністраторів.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const newRole = interaction.options.getString('role', true) as
      | 'admin'
      | 'moderator'
      | 'user';

    await User.findOneAndUpdate(
      { userId: targetUser.id },
      { role: newRole },
      { upsert: true, new: true },
    );

    await interaction.reply({
      content: `Роль користувача ${targetUser.username} змінено на ${newRole}.`,
      ephemeral: true,
    });

    logger.info(
      `User ${interaction.user.id} set role ${newRole} for user ${targetUser.id}`,
    );
  } catch (error) {
    logger.error(`Error in handleSetRoleCommand: ${error}`);
    await interaction.reply({
      content:
        'Виникла помилка при зміні ролі користувача. Спробуйте ще раз пізніше.',
      ephemeral: true,
    });
  }
}
