import { ChatInputCommandInteraction } from 'discord.js';
import { User } from '../api/models/User';
import logger from '../logger';

export async function handleNotificationsCommand(
  interaction: ChatInputCommandInteraction
) {
  try {
    const enable = interaction.options.getBoolean('enable');
    
    if (enable === null) {
      const user = await User.findOne({ userId: interaction.user.id });
      if (!user) {
        await interaction.reply({
          content: 'Ваш профіль не знайдено. Спробуйте використати команду /init для створення профілю.',
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        content: `Ваші сповіщення зараз ${user.notificationsEnabled ? 'увімкнені' : 'вимкнені'}.`,
        ephemeral: true,
      });
      return;
    }

    const user = await User.findOneAndUpdate(
      { userId: interaction.user.id },
      { notificationsEnabled: enable },
      { new: true, upsert: true }
    );

    await interaction.reply({
      content: `Сповіщення ${enable ? 'увімкнено' : 'вимкнено'}.`,
      ephemeral: true,
    });

    logger.info(`User ${interaction.user.id} ${enable ? 'enabled' : 'disabled'} notifications`);
  } catch (error) {
    logger.error(`Error in handleNotificationsCommand: ${error}`);
    await interaction.reply({
      content: 'Виникла помилка при зміні налаштувань сповіщень. Спробуйте ще раз пізніше.',
      ephemeral: true,
    });
  }
}