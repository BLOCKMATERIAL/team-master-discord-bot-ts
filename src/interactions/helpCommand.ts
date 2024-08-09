import { ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from "discord.js";
import * as path from 'path';
import * as fs from 'fs';
import logger from "../logger";

export async function handleHelpCommand(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Довідка по командам бота Team Master')
        .setDescription('Цей бот допомагає створювати та керувати командами для різних ігор.')
        .addFields(
            { name: 'Команди', value: 
                '`/create` - Створити нову команду\n' +
                '`/invite @користувач` - Запросити гравця до команди\n' +
                '`/kick @користувач` - Вигнати гравця з команди\n' +
                '`/help` - Показати цю довідку'
            },
            { name: 'Кнопки', value: 
                '**Приєднатися** - Приєднатися до команди або стати в чергу\n' +
                '**Покинути** - Покинути команду або чергу\n' +
                '**Розпустити** - Розпустити команду (тільки для лідера)'
            },
            { name: 'Голосовий чат', value: 
                'При створенні команди автоматично створюється тимчасовий голосовий канал.\n' +
                'Цей канал буде видалено, коли всі учасники його покинуть або команду буде розпущено.'
            },
            { name: 'Обмеження', value: 
                '- Ви можете бути учасником лише однієї команди одночасно\n' +
                '- Максимальна кількість гравців у резерві: 2'
            },
            { name: 'Пожертвування', value: 
                'Якщо вам подобається наш бот, ви можете підтримати його розробку!\n' +
                'Посилання на monobank: [Підтримати проект](https://send.monobank.ua/jar/272qxurVzg)'
            },
            { name: 'Автор', value: 
                'Бот розроблений [Myroslav ](https://github.com/BLOCKMATERIAL).\n' +
                'Зв\'язатися з автором: materialblock@gmail.com'
            }
        )
        .setFooter({ text: 'Розроблено з ❤️ для української геймінг-спільноти' });

    let qrCodeAttachment: AttachmentBuilder | undefined;

    const qrCodePath = path.join(__dirname, '..', '..', 'assets', 'monobank-qr.jpg');
    
    if (fs.existsSync(qrCodePath)) {
        try {
            qrCodeAttachment = new AttachmentBuilder(qrCodePath, { name: 'monobank-qr.jpg' });
            embed.setImage('attachment://monobank-qr.jpg');
        } catch (error) {
            logger.error(`Ошибка при создании вложения QR-кода: ${error}`);
        }
    } else {
        logger.warn(`QR-код изображение не найдено по пути: ${qrCodePath}`);
    }

    try {
        if (qrCodeAttachment) {
            await interaction.reply({ embeds: [embed], files: [qrCodeAttachment], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    } catch (error) {
        logger.error(`Ошибка при отправке сообщения помощи: ${error}`);
        await interaction.reply({ content: 'Виникла помилка при відображенні довідки. Будь ласка, спробуйте ще раз пізніше.', ephemeral: true });
    }
}