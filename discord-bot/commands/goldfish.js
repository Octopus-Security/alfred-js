const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('goldfish')
        .setDescription('goldfish'),
    async execute(interaction) {
        await interaction.reply('https://i.kym-cdn.com/photos/images/newsfeed/002/486/154/c06.gif');
    },
};