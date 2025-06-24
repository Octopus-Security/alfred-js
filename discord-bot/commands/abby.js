const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('abby')
        .setDescription('gail'), // Description is "gail"
    async execute(interaction) {
        await interaction.reply('gail'); // Sends the message "gail"
    },
};