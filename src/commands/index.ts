import { Client, REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('create')
    .setDescription('Створити нову команду')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Вигнати гравця з команди')
    .addUserOption((option) =>
      option
        .setName('player')
        .setDescription('Гравець, якого потрібно вигнати')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Причина виключення з команди')
        .setRequired(false),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Показати довідку по командам бота')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Запросити гравця до команди')
    .addUserOption((option) =>
      option
        .setName('player')
        .setDescription('Гравець, якого потрібно запросити')
        .setRequired(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('games')
    .setDescription('Вибрати ігри, в які ви граєте')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('disband')
    .setDescription('Розпустити команду (тільки для адміністраторів)')
    .addStringOption((option) =>
      option
        .setName('team_id')
        .setDescription('ID команди для розпуску')
        .setRequired(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('message')
    .setDescription(
      'Надіслати повідомлення команді (тільки для адміністраторів)',
    )
    .addStringOption((option) =>
      option.setName('team_id').setDescription('ID команди').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('Повідомлення для команди')
        .setRequired(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('edit-notes')
    .setDescription('Змінити нотатки команди (тільки для лідера)')
    .addStringOption((option) =>
      option
        .setName('notes')
        .setDescription('Нові нотатки для команди')
        .setRequired(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('notifications')
    .setDescription('Керування налаштуваннями сповіщень')
    .addBooleanOption((option) =>
      option
        .setName('enable')
        .setDescription('Увімкнути або вимкнути сповіщення')
        .setRequired(false),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('set-role')
    .setDescription('Встановити роль для користувача')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Користувач, якому потрібно встановити роль')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('role')
        .setDescription('Нова роль для користувача')
        .setRequired(true)
        .addChoices(
          { name: 'Адміністратор', value: 'admin' },
          { name: 'Модератор', value: 'moderator' },
          { name: 'Користувач', value: 'user' },
        ),
    )
    .toJSON(),
];

export async function registerCommands(client: Client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log('Почали оновлення команд додатка (/) .');

    await rest.put(Routes.applicationCommands(client.user!.id), {
      body: commands,
    });

    console.log('Успішно оновили команди додатка (/) .');
  } catch (error) {
    console.error(error);
  }
}
