const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const rocks = require('./resources/rocks.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rock')
        .setDescription('Returns a random rock, a rock by name, or lists available rocks.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('random')
                .setDescription('Returns a random rock.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('name')
                .setDescription('Returns a rock by name.')
                .addStringOption(option =>
                    option.setName('rockname')
                        .setDescription('The name of the rock.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists the available rocks.')),
    async execute(interaction) {
        const turquoiseColor = 0x40E0D0; // Turquoise hex code

        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'list') {
                const rockNames = Object.keys(rocks);
                const rockList = rockNames.join('\n');

                const embed = {
                    title: "Available Rocks",
                    description: rockList,
                    color: turquoiseColor, // Turquoise color here
                };

                await interaction.reply({ embeds: [embed] });
                return;
            }

            let rockName, rockData;

            if (subcommand === 'random') {
                const rockNames = Object.keys(rocks);
                rockName = rockNames[Math.floor(Math.random() * rockNames.length)];
                rockData = rocks[rockName];
            } else if (subcommand === 'name') {
                rockName = interaction.options.getString('rockname');
                rockData = rocks[rockName];

                if (!rockData) {
                    return interaction.reply(`Rock '${rockName}' not found.`);
                }
            }

            const imageName = rockData.image;
            const imagePath = path.join(__dirname, 'images', 'rocks', imageName);

            if (!fs.existsSync(imagePath)) {
                console.error(`Image file not found: ${imagePath}`);
                return interaction.reply(`Image for ${rockName} is missing. Please notify the bot administrator.`);
            }

            const embed = {
                title: rockName,
                description: rockData.metaphysical || "No metaphysical properties available.",
                color: turquoiseColor, // Turquoise color here as well
                image: { url: `attachment://${imageName}` },
            };

            const file = { attachment: imagePath, name: imageName };

            await interaction.reply({ embeds: [embed], files: [file] });

        } catch (error) {
            console.error("Error getting rock:", error);
            await interaction.reply("There was an error getting a rock. Please try again later.");
        }
    },
};