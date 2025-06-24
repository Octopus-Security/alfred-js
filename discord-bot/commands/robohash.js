const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('robohash')
        .setDescription('Generates a robohash image for the given text.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text to generate the robohash for.')
                .setRequired(true)),
    async execute(interaction) {
        const inputText = interaction.options.getString('text');

        // URL encode the input text:
        const encodedText = encodeURIComponent(inputText);


        const imageUrl = `https://robohash.org/${encodedText}`;

        const embed = {
            title: `Robohash for: ${inputText}`,
            color: 0xC000FF, // You can customize the color
            image: { url: imageUrl },
        };

        try {
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Error sending message:", error);
            await interaction.reply("There was an error generating the robohash. Please try again later.");
        }
    },
};