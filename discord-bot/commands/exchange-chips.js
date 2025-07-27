const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../balances.db');

// Helper function to wrap db.get in a promise
function dbGet(query, params) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Helper function to wrap db.run in a promise
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exchange-chips')
        .setDescription('Exchange casino chips and USD (1 Chip = $1 USD).')
        .addSubcommand(subcommand =>
            subcommand
                .setName('tousd')
                .setDescription('Exchange your casino chips for USD.')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('The number of chips to exchange.')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('fromusd')
                .setDescription('Buy casino chips with your USD.')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('The number of chips you want to buy.')
                        .setRequired(true)
                        .setMinValue(1))),

    async execute(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');
        const subcommand = interaction.options.getSubcommand();

        try {
            // Get user data, or create a new user entry if they don't exist
            let user = await dbGet('SELECT * FROM users WHERE user_id = ?', [userId]);
            if (!user) {
                await dbRun('INSERT INTO users (user_id) VALUES (?)', [userId]);
                user = await dbGet('SELECT * FROM users WHERE user_id = ?', [userId]);
            }

            if (subcommand === 'tousd') {
                // --- Logic for exchanging Chips TO USD ---
                if (user.chip_balance < amount) {
                    return interaction.reply({ content: `You don't have enough chips! Your current chip balance is **${user.chip_balance}**.`, ephemeral: true });
                }

                // Perform the exchange
                const newChipBalance = user.chip_balance - amount;
                const newUsdBalance = user.usd_balance + amount;
                await dbRun('UPDATE users SET chip_balance = ?, usd_balance = ? WHERE user_id = ?', [newChipBalance, newUsdBalance, userId]);

                const embed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('Exchange Successful!')
                    .setDescription(`You exchanged **${amount}** chips for **$${amount.toFixed(2)} USD**.`)
                    .addFields(
                        { name: 'New Chip Balance', value: `${newChipBalance}`, inline: true },
                        { name: 'New USD Balance', value: `$${newUsdBalance.toFixed(2)}`, inline: true }
                    );
                return interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'fromusd') {
                // --- Logic for buying Chips FROM USD ---
                if (user.usd_balance < amount) {
                    return interaction.reply({ content: `You don't have enough USD! Your current balance is **$${user.usd_balance.toFixed(2)}**.`, ephemeral: true });
                }

                // Perform the exchange
                const newChipBalance = user.chip_balance + amount;
                const newUsdBalance = user.usd_balance - amount;
                await dbRun('UPDATE users SET chip_balance = ?, usd_balance = ? WHERE user_id = ?', [newChipBalance, newUsdBalance, userId]);

                const embed = new EmbedBuilder()
                    .setColor(0x4CAF50)
                    .setTitle('Purchase Successful!')
                    .setDescription(`You purchased **${amount}** chips with **$${amount.toFixed(2)} USD**.`)
                    .addFields(
                        { name: 'New Chip Balance', value: `${newChipBalance}`, inline: true },
                        { name: 'New USD Balance', value: `$${newUsdBalance.toFixed(2)}`, inline: true }
                    );
                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in /exchange-chips command:', error);
            return interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
        }
    },
};