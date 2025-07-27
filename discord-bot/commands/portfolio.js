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

// Helper function to wrap db.all in a promise
function dbAll(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
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
        .setName('portfolio')
        .setDescription('View your complete asset portfolio.')
        .addUserOption(option =>
            option.setName('user')
            .setDescription('The user whose portfolio to view.')
            .setRequired(false)), // Optional, defaults to yourself

    async execute(interaction) {
        // Defer the reply immediately!
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userId = targetUser.id;

        try {
            // Get user's USD and Chip balance
            let userRow = await dbGet(`SELECT * FROM users WHERE user_id = ?`, [userId]);

            // If user doesn't exist, create them
            if (!userRow) {
                await dbRun('INSERT INTO users (user_id) VALUES (?)', [userId]);
                userRow = { usd_balance: 100.0, chip_balance: 0 }; // Use default values for the embed
            }

            // Get all their owned stocks/crypto
            const query = `
                SELECT p.amount, a.ticker, a.type
                FROM portfolios p
                JOIN assets a ON p.asset_id = a.asset_id
                WHERE p.user_id = ? AND p.amount > 0
            `;
            const assetRows = await dbAll(query, [userId]);

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Portfolio`)
                .setColor(0x0099FF)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '💵 USD Balance', value: `$${userRow.usd_balance.toFixed(2)}`, inline: true },
                    { name: '🎰 Casino Chips', value: `${userRow.chip_balance}`, inline: true }
                );
            
            const stocks = assetRows.filter(a => a.type === 'STOCK');
            const cryptos = assetRows.filter(a => a.type === 'CRYPTO');

            if (stocks.length > 0) {
                embed.addFields({ 
                    name: '📈 Stocks', 
                    value: stocks.map(s => `**${s.ticker}**: ${s.amount.toFixed(4)}`).join('\n'),
                    inline: false 
                });
            }

            if (cryptos.length > 0) {
                embed.addFields({ 
                    name: '💎 Crypto', 
                    value: cryptos.map(c => `**${c.ticker}**: ${c.amount.toFixed(4)}`).join('\n'),
                    inline: false 
                });
            }

            if (stocks.length === 0 && cryptos.length === 0) {
                embed.addFields({ name: 'Assets', value: 'No stocks or crypto held.' });
            }
            
            // Send the final result using editReply
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error in /portfolio command:", error);
            // Use editReply for errors as well
            await interaction.editReply({ content: 'An error occurred while fetching the portfolio.', ephemeral: true });
        }
    },
};