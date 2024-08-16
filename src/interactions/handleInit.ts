import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';

import Game from '../api/models/Game';
import { User } from '../api/models/User';
import logger from '../logger';

export async function handleInitCommand(
  interaction: ChatInputCommandInteraction,
) {
  logger.info(`Handling /init command for user ${interaction.user.id}`);
  try {
    const games = await Game.find({});
    logger.info(`Found ${games.length} games in the database`);

    if (games.length === 0) {
      logger.warn('No games found in the database');
      await interaction.reply({
        content:
          'На жаль, зараз немає доступних ігор для вибору. Спробуйте пізніше.',
        ephemeral: true,
      });
      return;
    }

    const user = await User.findOne({ userId: interaction.user.id });
    const userGames = user ? user.games : [];

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_init_games')
      .setPlaceholder('Виберіть ігри, в які ви граєте')
      .setMinValues(1)
      .setMaxValues(games.length)
      .addOptions(
        games.map((game) => ({
          label: game.name,
          value: game.value,
          default: userGames.includes(game.value),
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );

    const content =
      userGames.length > 0
        ? `Ваші поточні ігри: ${userGames.map((g) => games.find((game) => game.value === g)?.name).join(', ')}\nВиберіть ігри, щоб оновити свій вибір:`
        : 'Будь ласка, виберіть ігри, в які ви граєте:';

    logger.info('Sending reply with game selection menu');
    await interaction.reply({
      content: content,
      components: [row],
      ephemeral: true,
    });
    logger.info('Reply sent successfully');
  } catch (error) {
    logger.error('Error in handleInitCommand:', error);
    await interaction.reply({
      content: 'Виникла помилка при обробці команди. Спробуйте ще раз пізніше.',
      ephemeral: true,
    });
  }
}

export async function handleInitGameSelection(
  interaction: StringSelectMenuInteraction,
) {
  logger.info(`Handling game selection for user ${interaction.user.id}`);
  try {
    const selectedGames = interaction.values;
    logger.info(`Selected games: ${selectedGames.join(', ')}`);

    const userId = interaction.user.id;
    const username = interaction.user.username;
    const displayName = interaction.user?.displayName || username;

    logger.info(`Updating user preferences in database for user ${userId}`);
    await User.findOneAndUpdate(
      { userId },
      {
        userId,
        username,
        displayName,
        games: selectedGames,
      },
      { upsert: true, new: true, runValidators: true },
    );

    logger.info('Fetching game names from database');
    const gameNames = await Game.find({ value: { $in: selectedGames } }).then(
      (games) => games.map((g) => g.name),
    );

    logger.info('Updating interaction with selected games');
    await interaction.update({
      content: `Ваші ігри успішно оновлено! Ви обрали: ${gameNames.join(', ')}`,
      components: [],
    });
    logger.info(
      `User ${userId} (${username}, ${displayName}) updated their game preferences: ${gameNames.join(', ')}`,
    );
  } catch (error) {
    logger.error('Error in handleInitGameSelection:', error);
    await interaction.update({
      content:
        'Виникла помилка при збереженні ваших ігор. Спробуйте ще раз пізніше.',
      components: [],
    });
  }
}
