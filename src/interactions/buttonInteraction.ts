import { ButtonInteraction } from "discord.js";
import { isUserInAnyTeam, teams, updateTeamMessage } from "../utils";

export async function handleButtonInteraction(interaction: ButtonInteraction) {
    const [action, teamId] = interaction.customId.split('_');

    switch (action) {
        case 'join':
            await handleJoin(interaction, teamId);
            break;
        case 'leave':
            await handleLeave(interaction, teamId);
            break;
        case 'disband':
            await handleDisband(interaction, teamId);
            break;
    }
}

async function handleJoin(interaction: ButtonInteraction, teamId: string) {
    const team = teams[teamId];
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (isUserInAnyTeam(interaction.user.id)) {
        await interaction.reply({ content: 'Ви вже є учасником, лідером або в резерві іншої команди.', ephemeral: true });
        return;
    }

    if (team.players.length < team.slots) {
        team.players.push(interaction.user.id);
        await interaction.reply({ content: 'Ви приєдналися до команди.', ephemeral: true });
    } else {
        team.reserve.push(interaction.user.id);
        await interaction.reply({ content: 'Команда повна. Вас додано до черги.', ephemeral: true });
    }

    await updateTeamMessage(interaction.client, teamId);
}
async function handleLeave(interaction: ButtonInteraction, teamId: string) {
    const team = teams[teamId];
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (!team.players.includes(interaction.user.id) && !team.reserve.includes(interaction.user.id)) {
        await interaction.reply({ content: 'Ви не є учасником цієї команди.', ephemeral: true });
        return;
    }

    if (team.leader === interaction.user.id) {
        await interaction.reply({ content: 'Як лідер, ви не можете покинути команду. Використайте кнопку "Розпустити", щоб видалити команду.', ephemeral: true });
        return;
    }

    const wasInReserve = team.reserve.includes(interaction.user.id);
    team.players = team.players.filter(id => id !== interaction.user.id);
    team.reserve = team.reserve.filter(id => id !== interaction.user.id);

    if (!wasInReserve && team.reserve.length > 0 && team.players.length < 5) {
        const newPlayer = team.reserve.shift()!;
        team.players.push(newPlayer);
        await interaction.client.users.cache.get(newPlayer)?.send(`Вас переміщено з резерву до активного складу команди ${teamId}.`);
    }

    await updateTeamMessage(interaction.client, teamId);
    await interaction.reply({ content: wasInReserve ? 'Ви покинули резерв команди.' : 'Ви покинули команду.', ephemeral: true });
}

async function handleDisband(interaction: ButtonInteraction, teamId: string) {
    const team = teams[teamId];
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (team.leader !== interaction.user.id) {
        await interaction.reply({ content: 'Тільки лідер команди може розпустити команду.', ephemeral: true });
        return;
    }

    delete teams[teamId];
    await interaction.message.delete();
    await interaction.reply({ content: 'Команду розпущено.', ephemeral: true });
}