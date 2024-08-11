import { ChatInputCommandInteraction, Client } from "discord.js";
import { getTeamIdByLeader, updateTeamMessage } from "../utils";
import logger from "../logger";
import Team from "../api/models/User";


export async function handleKickCommand(interaction: ChatInputCommandInteraction) {
    try {
        const teamId = await getTeamIdByLeader(interaction.user.id);
        if (!teamId) {
            await interaction.reply({ content: 'Ви не є лідером жодної команди.', ephemeral: true });
            return;
        }

        const playerToKick = interaction.options.getUser('player');
        if (!playerToKick) {
            await interaction.reply({ content: 'Вказаного користувача не знайдено.', ephemeral: true });
            return;
        }

        const team = await Team.findOne({ teamId });
        if (!team) {
            await interaction.reply({ content: 'Команду не знайдено.', ephemeral: true });
            return;
        }

        if (!team.players.some(p => p.id === playerToKick.id) && !team.reserve.some(p => p.id === playerToKick.id)) {
            await interaction.reply({ content: 'Цей гравець не є учасником вашої команди.', ephemeral: true });
            return;
        }

        const wasInReserve = team.reserve.some(p => p.id === playerToKick.id);
        team.players = team.players.filter(p => p.id !== playerToKick.id);
        team.reserve = team.reserve.filter(p => p.id !== playerToKick.id);
    
        if (!wasInReserve && team.reserve.length > 0 && team.players.length < team.slots) {
            const newPlayer = team.reserve.shift()!;
            team.players.push(newPlayer);
            try {
                await interaction.client.users.cache.get(newPlayer.id)?.send(`Вас переміщено з резерву до активного складу команди ${teamId}.`);
                logger.info(`User ${newPlayer} moved from reserve to active roster in team ${teamId}`);
            } catch (error) {
                logger.warn(`Failed to send notification to user ${newPlayer} about moving from reserve: ${error}`);
            }
        }

        await team.save();
        await updateTeamMessage(interaction.client, teamId);

        try {
            await playerToKick.send(`Вас було виключено з команди ${teamId}.`);
            logger.info(`User ${playerToKick.id} was kicked from team ${teamId} and notified.`);
        } catch (error) {
            logger.warn(`Failed to send kick notification to user ${playerToKick.id}: ${error}`);
            await interaction.followUp({ content: `Не вдалося надіслати повідомлення гравцю ${playerToKick}. Можливо, у них вимкнені особисті повідомлення.`, ephemeral: true });
        }

        await interaction.reply({ content: `Гравця ${playerToKick} вигнано з команди.`, ephemeral: true });
        logger.info(`User ${interaction.user.id} kicked ${playerToKick.id} from team ${teamId}`);

    } catch (error) {
        console.error(error, 'handleKickCommand');
        await interaction.reply({ content: 'Виникла помилка при обробці команди. Спробуйте ще раз пізніше.', ephemeral: true });
    }
}