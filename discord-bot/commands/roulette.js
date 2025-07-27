const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

// Helper function to determine the color of a number on a roulette wheel
function determineColor(number) {
    // Standard European roulette wheel red numbers
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    if (number === 0) {
        return 'green';
    }
    return redNumbers.includes(number) ? 'red' : 'black';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the roulette wheel!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of chips you want to bet.')
                .setRequired(true)
                .setMinValue(1)) // Can't bet 0 or less
        .addStringOption(option =>
            option.setName('color')
                .setDescription('The color to bet on.')
                // Adding choices creates a dropdown menu in Discord
                .addChoices(
                    { name: 'Red', value: 'red' },
                    { name: 'Black', value: 'black' },
                    { name: 'Green', value: 'green' }
                ))
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('The number to bet on (0-36).')
                .setMinValue(0)
                .setMaxValue(36)),

    async execute(interaction) {
        await interaction.deferReply();
        
        const userId = interaction.user.id;
        const betAmount = interaction.options.getInteger('bet');
        const betColor = interaction.options.getString('color');
        const betNumber = interaction.options.getInteger('number');

        if (!betColor && betNumber === null) {
            return interaction.editReply({ content: 'You must place a bet on a color or a number.', ephemeral: true });
        }

        let db;
        try {
            db = await open({
                filename: path.join(__dirname, '../balances.db'),
                driver: sqlite3.Database
            });

            // Get user from the NEW 'users' table
            let user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);

            // Check if user exists and has enough chips in the correct 'chip_balance' column
            if (!user || user.chip_balance < betAmount) {
                const currentBalance = user ? user.chip_balance : 0;
                return interaction.editReply({ content: `You don't have enough chips to place a bet of ${betAmount}. Your balance is ${currentBalance}.`, ephemeral: true });
            }

            // --- Game Logic ---
            const winningNumber = Math.floor(Math.random() * 37);
            const winningColor = determineColor(winningNumber);
            
            // Payout starts at 0, representing the net winnings (profit)
            let payout = 0;
            const resultMessages = [`The wheel spun and landed on **${winningNumber} (${winningColor})**!`];

            // Evaluate color bet (if placed)
            if (betColor) {
                if (betColor === winningColor) {
                    // Green pays 10x, Red/Black pays 2x (1:1 odds + original bet back)
                    const colorWinnings = (winningColor === 'green') ? betAmount * 10 : betAmount * 2;
                    payout += colorWinnings;
                    resultMessages.push(`✅ Your bet on **${betColor.toUpperCase()}** won **${colorWinnings}** chips!`);
                } else {
                    resultMessages.push(`❌ Your bet on **${betColor.toUpperCase()}** lost.`);
                }
            }
            
            // Evaluate number bet (if placed)
            if (betNumber !== null) {
                if (betNumber === winningNumber) {
                    // Payout for a single number is 36x (35:1 odds + original bet back)
                    const numberWinnings = betAmount * 36;
                    payout += numberWinnings;
                    resultMessages.push(`✅ Your bet on **${betNumber}** won **${numberWinnings}** chips!`);
                } else {
                    resultMessages.push(`❌ Your bet on **${betNumber}** lost.`);
                }
            }

            // Calculate the final change in balance
            // Payout is the total return; betAmount was the cost. So change = payout - betAmount.
            const balanceChange = payout - betAmount;
            await db.run('UPDATE users SET chip_balance = chip_balance + ? WHERE user_id = ?', [balanceChange, userId]);
            
            // Get final balance for the reply
            const updatedUser = await db.get('SELECT chip_balance FROM users WHERE user_id = ?', [userId]);

            if (payout > 0) {
                 resultMessages.push(`\n💰 **Net Gain:** ${balanceChange} chips.`);
            } else {
                 resultMessages.push(`\n**Net Loss:** ${betAmount} chips.`);
            }
            resultMessages.push(`Your new chip balance is **${updatedUser.chip_balance}**.`);

            const embed = new EmbedBuilder()
                .setColor(payout > 0 ? 0x00FF00 : 0xFF0000)
                .setTitle('Roulette Result')
                .setDescription(resultMessages.join('\n'));

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error in /roulette command:", error);
            await interaction.editReply({ content: 'An error occurred.', ephemeral: true });
        } finally {
            if (db) await db.close();
        }
    },
};