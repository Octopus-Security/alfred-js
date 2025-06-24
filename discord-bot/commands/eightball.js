const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the Magic 8 Ball a question.'),
    async execute(interaction) {
        const imageDir = path.join(__dirname, 'images', '8ball'); // Directory containing 8 Ball images

        try {
            const files = fs.readdirSync(imageDir); // Read all files in the directory
            const imageFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')); // Filter for image files

            if (imageFiles.length === 0) {
                console.error(`No images found in ${imageDir}`);
                return interaction.reply(`No 8 Ball images found. Please notify the bot administrator.`);
            }

            const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
            const imagePath = path.join(imageDir, randomImage);

            const embed = {
                title: "~Your Fortune~", // Embed title
                color: 0x00FF00, // Green color
                image: { url: `attachment://${randomImage}` }, // Use random image filename
            };
            const file = { attachment: imagePath, name: randomImage };

            await interaction.reply({ embeds: [embed], files: [file] });

        } catch (error) {
            console.error("Error consulting the Magic 8 Ball:", error);
            await interaction.reply("There was an error consulting the Magic 8 Ball. Please try again later.");
        }
    },
};
