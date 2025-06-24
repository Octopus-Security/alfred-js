const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all available commands and their descriptions.'),
    async execute(interaction) {

        const commands = interaction.client.commands; // Get all commands

        let helpEmbed = {
            title: "Help Menu",
            description: "Here's a list of all available commands:",
            color: 0x0099FF, // Blue color
            fields: [],
        };

        commands.forEach(command => {
            helpEmbed.fields.push({
                name: `/${command.data.name}`, // Command name with slash
                value: command.data.description || "No description provided.", // Command description or default message
                inline: true, // Make commands appear inline
            });
        });

        // If there are no commands, add a message
        if (helpEmbed.fields.length === 0) {
            helpEmbed.fields.push({
                name: "No Commands",
                value: "There are no commands available at this time.",
            });
        }

        try {
            await interaction.reply({ embeds: [helpEmbed] });
        } catch (error) {
            console.error("Error sending help menu:", error);
            if (error.response) {
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
                console.error("Response headers:", error.response.headers);
            }
            await interaction.reply("There was an error displaying the help menu. Please try again later.");
        }
    },
};