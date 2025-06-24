const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coin')
        .setDescription('Flips multiple coins and shows the results.')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('The number of coins to flip (1-10).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10))
        .addStringOption(option =>
            option.setName('dummy') // Dummy option (workaround)
                .setDescription('A dummy option (workaround).')
                .setRequired(false)),
    async execute(interaction) {
        const numFlips = interaction.options.getInteger('count');
        const results = [];

        for (let i = 0; i < numFlips; i++) {
            results.push(Math.random() < 0.5 ? 'heads' : 'tails');
        }

        let hasReplied = false; // Flag for reply/followUp

        for (const result of results) {
            const imagePath = path.join(__dirname, 'images/coins', `${result}.png`);

            if (!fs.existsSync(imagePath)) {
                console.error(`Image file not found: ${imagePath}`);
                return interaction.reply(`Image for ${result} is missing. Please notify the bot administrator.`);
            }

            const capitalizedResult = result.charAt(0).toUpperCase() + result.slice(1);

            const embed = {
                title: `Coin Flip: ${capitalizedResult}`,
                color: 0xC000FF,
                image: { url: `attachment://${result}.png` },
            };
            const file = { attachment: imagePath, name: `${result}.png` };

            try {
                if (!hasReplied) {
                    await interaction.reply({ embeds: [embed], files: [file] });
                    hasReplied = true;
                } else {
                    await interaction.followUp({ embeds: [embed], files: [file] });
                }
            } catch (error) {
                console.error("Error sending message:", error);
                await interaction.followUp({ content: "There was an error flipping the coin(s). Please try again later." });
                return; // Stop on error
            }
        }
    },
};