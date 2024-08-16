import { ChatInputCommandInteraction } from 'discord.js';

import Admin from '../api/models/Admin';
import Team, { IPlayer } from '../api/models/Team';
import logger from '../logger';
import {
  getTeamIdByLeader,
  isUserInAnyTeam,
  updateTeamMessage,
} from '../utils';

export async function handleInviteCommand(
  interaction: ChatInputCommandInteraction,
) {
  try {
    const teamId = await getTeamIdByLeader(interaction.user.id);

    if (!teamId) {
      await interaction.reply({
        content: 'Ви не є лідером жодної команди.',
        ephemeral: true,
      });
      return;
    }

    const playerToInvite = interaction.options.getUser('player');
    if (!playerToInvite) {
      await interaction.reply({
        content: 'Вказаного користувача не знайдено.',
        ephemeral: true,
      });
      return;
    }

    const isAdmin = await Admin.findOne({ userId: playerToInvite.id });
    const newPlayer: IPlayer = {
      id: playerToInvite.id,
      name: playerToInvite.username,
      isAdmin: !!isAdmin,
    };
    if (await isUserInAnyTeam(playerToInvite.id)) {
      await interaction.reply({
        content: 'Цей гравець вже є учасником іншої команди або в резерві.',
        ephemeral: true,
      });
      return;
    }

    const team = await Team.findOne({ teamId });
    if (!team) {
      await interaction.reply({
        content: 'Команду не знайдено.',
        ephemeral: true,
      });
      return;
    }

    if (team.players.length >= team.slots && team.reserve.length >= 2) {
      await interaction.reply({
        content: 'Команда та резерв повні. Неможливо запросити більше гравців.',
        ephemeral: true,
      });
      return;
    }

    if (team.players.length < team.slots) {
      team.players.push(newPlayer);
      logger.info(
        `User ${interaction.user.id} invited ${playerToInvite.id} ${playerToInvite.username} to team ${teamId}`,
      );
      await interaction.reply({
        content: `Гравця ${playerToInvite} запрошено до команди.`,
        ephemeral: true,
      });
    } else {
      team.reserve.push(newPlayer);
      logger.info(
        `User ${interaction.user.id} invited ${playerToInvite.id} ${playerToInvite.username} to reserve of team ${teamId}`,
      );
      await interaction.reply({
        content: `Гравця ${playerToInvite} запрошено до резерву команди.`,
        ephemeral: true,
      });
    }

    await team.save();
    await updateTeamMessage(interaction, teamId);

    try {
      await playerToInvite.send(
        `Вас було запрошено до команди ${teamId}. Використайте команду /join ${teamId}, щоб приєднатися.`,
      );
    } catch (error) {
      logger.warn(
        `Failed to send invitation message to user ${playerToInvite.id}: ${error}`,
      );
      await interaction.followUp({
        content: `Не вдалося надіслати повідомлення гравцю ${playerToInvite}. Можливо, у них вимкнені особисті повідомлення.`,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Виникла помилка при обробці команди. Спробуйте ще раз пізніше.',
      ephemeral: true,
    });
  }
}
