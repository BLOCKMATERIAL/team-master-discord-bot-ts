import { ActionRowBuilder, ChatInputCommandInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { isUserInAnyTeam } from "../utils";

import { games } from "../utils";

export async function handleCreateCommand(interaction: ChatInputCommandInteraction) {
    if (isUserInAnyTeam(interaction.user.id)) {
        await interaction.reply({ content: 'Ви вже є учасником, лідером або в резерві команди. Ви не можете створити нову команду.', ephemeral: true });
        return;
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_game')
                .setPlaceholder('Виберіть гру')
                .addOptions(games.map(game => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(game.name)
                        .setValue(game.value)
                ))
        );

    await interaction.reply({
        content: 'Виберіть гру для вашої нової команди:',
        components: [row],
        ephemeral: true,
    });
}