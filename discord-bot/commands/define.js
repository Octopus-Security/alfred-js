const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('define')
        .setDescription('Looks up the definition of a word.')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The word to define.')
                .setRequired(true)),
    async execute(interaction) {
        const word = interaction.options.getString('word');

        try {
            const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;

            const response = await axios.get(apiUrl);
            const data = response.data;

            if (!data || data.length === 0) {
                return interaction.reply(`No definition found for "${word}".`);
            }

            // Extract definitions and format them
            let definitions = "";
            data.forEach(entry => {
                entry.meanings.forEach(meaning => {
                    meaning.definitions.forEach(def => {
                        definitions += `${def.definition}\n`;
                        if (def.example) {
                            definitions += `\tExample: ${def.example}\n`;
                        }
                        definitions += "\n"; // Add extra spacing between definitions
                    });
                });
            });

            const embed = {
                title: `Definition of ${word}:`,
                color: 0x800080, // Purple color
                description: definitions.slice(0, 4096), // Discord embed description limit
            };

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error defining "${word}":`, error);

            if (error.response) {
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
                console.error("Response headers:", error.response.headers);

                if (error.response.status === 404) {
                    await interaction.reply(`No definition found for "${word}".`);
                } else {
                    await interaction.reply(`Dictionary API Error: ${error.response.status}`);
                }

            } else if (error.request) {
                console.error("Request:", error.request);
                await interaction.reply("No response received from the Dictionary API. Please try again later.");
            } else {
                console.error('Error message:', error.message);
                await interaction.reply("There was an error setting up the request to the Dictionary API. Please try again later.");
            }
        }
    },
};