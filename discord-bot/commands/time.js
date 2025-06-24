const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('time')
        .setDescription('Replies with the current time!'),
    async execute(interaction) {
        const now = new Date();
        await interaction.reply(`Current time: ${now.toLocaleString()}`);
    },
};
