import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

import Game from '../api/models/Game';
import logger from '../logger';
import { isUserInAnyTeam } from '../utils';

export async function handleCreateCommand(
  interaction: ChatInputCommandInteraction,
) {
  try {
    if (await isUserInAnyTeam(interaction.user.id)) {
      await interaction.reply({
        content:
          'Ви вже є учасником, лідером або в резерві команди. Ви не можете створити нову команду.',
        ephemeral: true,
      });
      logger.info(
        `User ${interaction.user.id} ${interaction.user.username} tried to create a team but is already in a team`,
      );
      return;
    }

    const games = await Game.find({});

    if (games.length === 0) {
      await interaction.reply({
        content:
          'На жаль, зараз немає доступних ігор для вибору. Спробуйте пізніше.',
        ephemeral: true,
      });
      logger.warn(
        'No games found in the database when attempting to create a team',
      );
      return;
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_game')
        .setPlaceholder('Виберіть гру')
        .addOptions(
          games.map((game) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(game.name)
              .setValue(game.value),
          ),
        ),
    );

    await interaction.reply({
      content: 'Виберіть гру для вашої нової команди:',
      components: [row],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Error in handleCreateCommand:', error);
    await interaction.reply({
      content:
        'Виникла помилка при створенні команди. Спробуйте ще раз пізніше.',
      ephemeral: true,
    });
  }
}
