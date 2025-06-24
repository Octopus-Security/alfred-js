const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convertbase')
        .setDescription('Converts a number from one base to another.')
        .addStringOption(option =>
            option.setName('number')
                .setDescription('The number to convert.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('frombase')
                .setDescription('The original base (2-36).')
                .setRequired(true)
                .setMinValue(2)
                .setMaxValue(36))
        .addIntegerOption(option =>
            option.setName('tobase')
                .setDescription('The target base (2-36).')
                .setRequired(true)
                .setMinValue(2)
                .setMaxValue(36)),

    async execute(interaction) {
        const number = interaction.options.getString('number');
        const fromBase = interaction.options.getInteger('frombase');
        const toBase = interaction.options.getInteger('tobase');

        try {
            const parsedNumber = parseInt(number, fromBase); // Parse from original base

            if (isNaN(parsedNumber)) {
                return interaction.reply("Invalid number provided for the given base.");
            }

            const convertedNumber = parsedNumber.toString(toBase).toUpperCase(); // Convert to target base

            await interaction.reply(`\`${number}\` (base ${fromBase}) = \`${convertedNumber}\` (base ${toBase})`);

        } catch (error) {
            console.error("Conversion error:", error);
            await interaction.reply("An error occurred during the conversion. Please check your input and try again.");
        }
    },
};