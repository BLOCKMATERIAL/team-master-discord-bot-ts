import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import * as fs from 'fs';

const helpText = JSON.parse(fs.readFileSync('help_text.json', 'utf-8'));

export async function handleHelpCommand(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(helpText.title)
        .setDescription(helpText.description)
        .addFields(
            { name: 'Команди', value: helpText.commands.map((cmd: { name: string; description: string; }) => `**${cmd.name}** - ${cmd.description}`).join('\n') },
            { name: 'Кнопки', value: helpText.buttons.map((btn: { name: string; description: string; }) => `**${btn.name}** - ${btn.description}`).join('\n') },
            { name: 'Обмеження', value: helpText.restrictions.join('\n') }
        )
        .setFooter({ text: helpText.author });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}