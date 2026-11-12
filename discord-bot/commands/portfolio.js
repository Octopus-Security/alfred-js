const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('portfolio')
        .setDescription('View your complete asset portfolio.')
        .addUserOption(option =>
            option.setName('user')
            .setDescription('The user whose portfolio to view.')
            .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userId = targetUser.id;

        let db;
        try {
            // Open a new connection to the database for this command execution
            db = await open({
                filename: path.join(__dirname, '../balances.db'), // Correct path to the database
                driver: sqlite3.Database
            });
            await db.run('PRAGMA busy_timeout = 5000'); // wait for a competing writer instead of failing with SQLITE_BUSY (balances.db is a single-file mount, so no WAL)

            // Get user's USD and Chip balance
            let userRow = await db.get(`SELECT * FROM users WHERE user_id = ?`, [userId]);

            // If user doesn't exist, create them
            if (!userRow) {
                await db.run('INSERT INTO users (user_id) VALUES (?)', [userId]);
                userRow = await db.get(`SELECT * FROM users WHERE user_id = ?`, [userId]);
            }

            // Get all their owned stocks/crypto
            const assetRows = await db.all(`
                SELECT p.amount, a.ticker, a.type
                FROM portfolios p
                JOIN assets a ON p.asset_id = a.asset_id
                WHERE p.user_id = ? AND p.amount > 0
            `, [userId]);

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
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error in /portfolio command:", error);
            await interaction.editReply({ content: 'An error occurred while fetching the portfolio.', ephemeral: true });
        } finally {
            // Ensure the database connection is closed
            if (db) {
                await db.close();
            }
        }
    },
};