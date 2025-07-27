const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exchange-chips')
        .setDescription('Exchange casino chips and USD (1 Chip = $1 USD).')
        .addStringOption(option =>
            option.setName('direction')
                .setDescription('The direction of the exchange.')
                .setRequired(true)
                .addChoices(
                    { name: 'Exchange Chips TO USD', value: 'tousd' },
                    { name: 'Buy Chips FROM USD', value: 'fromusd' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The number of chips to exchange or buy.')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');
        const direction = interaction.options.getString('direction'); // Use the new 'direction' option

        let db;
        try {
            db = await open({
                filename: path.join(__dirname, '../balances.db'),
                driver: sqlite3.Database
            });

            // Get user data, or create a new user entry if they don't exist
            let user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
            if (!user) {
                await db.run('INSERT INTO users (user_id) VALUES (?)', [userId]);
                user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
            }

            if (direction === 'tousd') {
                // --- Logic for exchanging Chips TO USD ---
                if (user.chip_balance < amount) {
                    return interaction.editReply({ content: `You don't have enough chips! Your current chip balance is **${user.chip_balance}**.`, ephemeral: true });
                }

                const newChipBalance = user.chip_balance - amount;
                const newUsdBalance = user.usd_balance + amount;
                await db.run('UPDATE users SET chip_balance = ?, usd_balance = ? WHERE user_id = ?', [newChipBalance, newUsdBalance, userId]);

                const embed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('Exchange Successful!')
                    .setDescription(`You exchanged **${amount}** chips for **$${amount.toFixed(2)} USD**.`)
                    .addFields(
                        { name: 'New Chip Balance', value: `${newChipBalance}`, inline: true },
                        { name: 'New USD Balance', value: `$${newUsdBalance.toFixed(2)}`, inline: true }
                    );
                return interaction.editReply({ embeds: [embed] });

            } else if (direction === 'fromusd') {
                // --- Logic for buying Chips FROM USD ---
                if (user.usd_balance < amount) {
                    return interaction.editReply({ content: `You don't have enough USD! Your current balance is **$${user.usd_balance.toFixed(2)}**.`, ephemeral: true });
                }

                const newChipBalance = user.chip_balance + amount;
                const newUsdBalance = user.usd_balance - amount;
                await db.run('UPDATE users SET chip_balance = ?, usd_balance = ? WHERE user_id = ?', [newChipBalance, newUsdBalance, userId]);

                const embed = new EmbedBuilder()
                    .setColor(0x4CAF50)
                    .setTitle('Purchase Successful!')
                    .setDescription(`You purchased **${amount}** chips with **$${amount.toFixed(2)} USD**.`)
                    .addFields(
                        { name: 'New Chip Balance', value: `${newChipBalance}`, inline: true },
                        { name: 'New USD Balance', value: `$${newUsdBalance.toFixed(2)}`, inline: true }
                    );
                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in /exchange-chips command:', error);
            return interaction.editReply({ content: 'An error occurred while processing your request.', ephemeral: true });
        } finally {
            if (db) await db.close();
        }
    },
};