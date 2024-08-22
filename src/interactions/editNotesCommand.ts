import { ChatInputCommandInteraction } from 'discord.js';
import Team from '../api/models/Team';
import logger from '../logger';
import { getTeamIdByLeader, updateTeamMessage } from '../utils';

export async function handleEditNotesCommand(
  interaction: ChatInputCommandInteraction
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

    const newNotes = interaction.options.getString('notes', true);

    const team = await Team.findOne({ teamId });
    if (!team) {
      await interaction.reply({
        content: 'Команду не знайдено.',
        ephemeral: true,
      });
      return;
    }

    team.notes = newNotes;
    await team.save();

    await updateTeamMessage(interaction, teamId);

    await interaction.reply({
      content: 'Нотатки команди успішно оновлено.',
      ephemeral: true,
    });

    logger.info(`User ${interaction.user.id} updated notes for team ${teamId}`);
  } catch (error) {
    logger.error(`Error in handleEditNotesCommand: ${error}`);
    await interaction.reply({
      content: 'Виникла помилка при оновленні нотаток. Спробуйте ще раз пізніше.',
      ephemeral: true,
    });
  }
}