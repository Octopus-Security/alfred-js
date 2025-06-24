const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hash')
        .setDescription('Hashes text using various algorithms.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text to hash.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('algorithm')
                .setDescription('The hashing algorithm to use.')
                .setRequired(true)
                .addChoices(
                    { name: 'MD5', value: 'md5' },
                    { name: 'SHA256', value: 'sha256' },
                    { name: 'SHA512', value: 'sha512' },
                    { name: 'SHA1', value: 'sha1' }, // Added SHA1
                    { name: 'RIPEMD160', value: 'ripemd160' }, // Added RIPEMD160
                    { name: 'BLAKE2b512', value: 'blake2b512' }, //Added BLAKE2b512
                )),
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const algorithm = interaction.options.getString('algorithm');

        try {
            const hash = crypto.createHash(algorithm).update(text).digest('hex');

            await interaction.reply(`\`${text}\` hashed with ${algorithm} is:\n\`\`\`\n${hash}\n\`\`\``);

        } catch (error) {
            console.error("Hashing error:", error);
            await interaction.reply("An error occurred during hashing. Please check your input and try again.");
        }
    },
};