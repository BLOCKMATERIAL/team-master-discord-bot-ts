import { ChatInputCommandInteraction, Client } from "discord.js";
import { getTeamIdByLeader, teams, updateTeamMessage } from "../utils";

export async function handleKickCommand(interaction: ChatInputCommandInteraction) {
    const teamId = getTeamIdByLeader(interaction.user.id);
    if (!teamId) {
        await interaction.reply({ content: 'Ви не є лідером жодної команди.', ephemeral: true });
        return;
    }

    const playerToKick = interaction.options.getUser('player');
    if (!playerToKick) {
        await interaction.reply({ content: 'Вказаного користувача не знайдено.', ephemeral: true });
        return;
    }

    const team = teams[teamId];
    if (!team.players.includes(playerToKick.id) && !team.reserve.includes(playerToKick.id)) {
        await interaction.reply({ content: 'Цей гравець не є учасником вашої команди.', ephemeral: true });
        return;
    }

    team.players = team.players.filter(id => id !== playerToKick.id);
    team.reserve = team.reserve.filter(id => id !== playerToKick.id);

    if (team.players.length < 5 && team.reserve.length > 0) {
        const newPlayer = team.reserve.shift()!;
        team.players.push(newPlayer);
    }

    await updateTeamMessage(interaction.client, teamId);
    await interaction.reply({ content: `Гравця ${playerToKick} вигнано з команди.`, ephemeral: true });
}


