const { SlashCommandBuilder } = require('discord.js');
const tarotCards = require('./resources/cards.json');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tarot')
        .setDescription('Draws tarot cards and shows their meanings.')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('The number of cards to draw (1-7).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(7)
        )
        .addIntegerOption(option =>
            option.setName('deck')
                .setDescription('The tarot deck to use (1, 2, or 3).')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(2)
        ),
    async execute(interaction) {
        const numCards = interaction.options.getInteger('count');
        const deckChoice = interaction.options.getInteger('deck') || 1;

        const drawnCards = [];
        const cardKeys = Object.keys(tarotCards);

        if (cardKeys.length === 0) {
            return interaction.reply("The card data is empty.");
        }

        for (let i = 0; i < numCards; i++) {
            const randomCardKey = cardKeys[Math.floor(Math.random() * cardKeys.length)];
            const selectedCard = tarotCards[randomCardKey];
            const isReversed = Math.random() < 0.5;
            const description = isReversed ? selectedCard.reversed_description : selectedCard.description;
            const cardName = isReversed ? `${selectedCard.name} (Reversed)` : selectedCard.name;

            const imageName = isReversed ? `r${randomCardKey}.jpg` : `${randomCardKey}.jpg`;
            const imagePath = path.join(__dirname, `images/tarot_deck${deckChoice}`, imageName);

            if (!fs.existsSync(imagePath)) {
                console.error(`Image file not found: ${imagePath}`);
                return interaction.reply(`Image for ${cardName} is missing. Please notify the bot administrator.`);
            }

            drawnCards.push({ name: cardName, description: description, imagePath: imagePath });
        }

        // Send the cards (with embeds)
        for (const card of drawnCards) {
            const fileName = card.imagePath.split(path.sep).pop(); // Extract filename
            const embed = {
                title: card.name,
                description: card.description,
                color: 0x0099FF,
                image: { url: `attachment://${fileName}` }, // Use filename in URL
            };
            const file = { attachment: card.imagePath, name: fileName }; // Use filename for attachment

            try {
                if (drawnCards.indexOf(card) === 0) {
                    await interaction.reply({ embeds: [embed], files: [file] });
                } else {
                    await interaction.followUp({ embeds: [embed], files: [file] });
                }
            } catch (error) {
                console.error("Error sending message:", error);
                await interaction.followUp({ content: "There was an error drawing your card. Please try again later." });
                return;
            }
        }
    },
};