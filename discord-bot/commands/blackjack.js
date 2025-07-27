const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

// --- Helper Functions for Blackjack Logic ---

// Creates a standard 52-card deck
const createDeck = () => {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            let value = parseInt(rank);
            if (['J', 'Q', 'K'].includes(rank)) value = 10;
            if (rank === 'A') value = 11;
            deck.push({ rank, suit, value });
        }
    }
    return deck;
};

// Shuffles the deck (Fisher-Yates shuffle)
const shuffleDeck = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

// Calculates hand value, properly handling Aces
const calculateHandValue = (hand) => {
    let value = hand.reduce((sum, card) => sum + card.value, 0);
    let aceCount = hand.filter(card => card.rank === 'A').length;
    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
    }
    return value;
};

// Creates a string representation of a hand
const getHandString = (hand) => hand.map(card => `${card.rank}${card.suit}`).join(' ');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of blackjack!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Start a new game of blackjack.')
                .addIntegerOption(option => option.setName('bet').setDescription('The amount of chips to bet.').setRequired(true).setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hit')
                .setDescription('Take another card.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stand')
                .setDescription('Stand with your current hand.')),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let db;
        try {
            db = await open({
                filename: path.join(__dirname, '../balances.db'),
                driver: sqlite3.Database
            });

            // Get user data
            let user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
            if (!user) {
                return interaction.editReply({ content: 'You do not have an account yet. Use a command like `/portfolio` to get started.', ephemeral: true });
            }
            let gameState = user.blackjack_game ? JSON.parse(user.blackjack_game) : null;

            // --- Subcommand Router ---
            if (subcommand === 'play') {
                const betAmount = interaction.options.getInteger('bet');

                if (gameState) {
                    return interaction.editReply({ content: 'You already have a game in progress! Use `/blackjack hit` or `/blackjack stand`.', ephemeral: true });
                }
                if (user.chip_balance < betAmount) {
                    return interaction.editReply({ content: `You don't have enough chips. Your balance is ${user.chip_balance}.`, ephemeral: true });
                }

                // Start Game Logic
                const deck = shuffleDeck(createDeck());
                const playerHand = [deck.pop(), deck.pop()];
                const dealerHand = [deck.pop(), deck.pop()];
                
                const newGameState = {
                    deck,
                    playerHand,
                    dealerHand,
                    bet: betAmount
                };

                // Deduct bet and save game state
                await db.run('UPDATE users SET chip_balance = chip_balance - ?, blackjack_game = ? WHERE user_id = ?', [betAmount, JSON.stringify(newGameState), userId]);
                
                const playerValue = calculateHandValue(playerHand);
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`Blackjack Game - Bet: ${betAmount} chips`)
                    .setDescription('You were dealt your hand. Use `/blackjack hit` or `/blackjack stand`.')
                    .addFields(
                        { name: 'Your Hand', value: `${getHandString(playerHand)} (Value: ${playerValue})`, inline: true },
                        { name: 'Dealer\'s Hand', value: `${getHandString([dealerHand[0]])} (Showing)`, inline: true }
                    );
                
                // Handle instant blackjack
                if (playerValue === 21) {
                    const dealerValue = calculateHandValue(dealerHand);
                    const blackjackPayout = Math.floor(betAmount * 1.5); // 3:2 payout
                    const resultMessage = dealerValue === 21 ? 'Push! You and the dealer both have Blackjack.' : `Blackjack! You win ${blackjackPayout} chips!`;
                    const balanceChange = dealerValue === 21 ? betAmount : betAmount + blackjackPayout; // Return original bet on push

                    await db.run('UPDATE users SET chip_balance = chip_balance + ?, blackjack_game = NULL WHERE user_id = ?', [balanceChange, userId]);
                    embed.setDescription(resultMessage)
                         .addFields({ name: 'Dealer\'s Final Hand', value: `${getHandString(dealerHand)} (Value: ${dealerValue})` });
                }
                
                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'hit' || subcommand === 'stand') {
                if (!gameState) {
                    return interaction.editReply({ content: 'You do not have a game in progress. Use `/blackjack play` to start one.', ephemeral: true });
                }
                
                // --- Hit Logic ---
                if (subcommand === 'hit') {
                    gameState.playerHand.push(gameState.deck.pop());
                    const playerValue = calculateHandValue(gameState.playerHand);

                    const embed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`Blackjack Game - Bet: ${gameState.bet} chips`)
                        .addFields(
                            { name: 'Your Hand', value: `${getHandString(gameState.playerHand)} (Value: ${playerValue})`, inline: true },
                            { name: 'Dealer\'s Hand', value: `${getHandString([gameState.dealerHand[0]])} (Showing)`, inline: true }
                        );

                    if (playerValue > 21) {
                        // Player busts, game over
                        await db.run('UPDATE users SET blackjack_game = NULL WHERE user_id = ?', [userId]);
                        embed.setDescription(`You busted with ${playerValue}! You lose ${gameState.bet} chips.`)
                             .setColor(0xFF0000);
                    } else {
                        // Game continues
                        await db.run('UPDATE users SET blackjack_game = ? WHERE user_id = ?', [JSON.stringify(gameState), userId]);
                        embed.setDescription('You hit. Use `/blackjack hit` or `/blackjack stand`.');
                    }
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }

                // --- Stand Logic ---
                if (subcommand === 'stand') {
                    let dealerValue = calculateHandValue(gameState.dealerHand);
                    while (dealerValue < 17) {
                        gameState.dealerHand.push(gameState.deck.pop());
                        dealerValue = calculateHandValue(gameState.dealerHand);
                    }

                    const playerValue = calculateHandValue(gameState.playerHand);
                    let resultMessage = '';
                    let balanceChange = 0;

                    if (dealerValue > 21) {
                        resultMessage = `Dealer busts with ${dealerValue}! You win!`;
                        balanceChange = gameState.bet * 2; // Bet back + winnings
                    } else if (playerValue > dealerValue) {
                        resultMessage = `You win with ${playerValue} against the dealer's ${dealerValue}!`;
                        balanceChange = gameState.bet * 2;
                    } else if (dealerValue > playerValue) {
                        resultMessage = `Dealer wins with ${dealerValue} against your ${playerValue}.`;
                        balanceChange = 0; // Bet already deducted
                    } else {
                        resultMessage = `Push! You and the dealer tie with ${playerValue}.`;
                        balanceChange = gameState.bet; // Return original bet
                    }

                    await db.run('UPDATE users SET chip_balance = chip_balance + ?, blackjack_game = NULL WHERE user_id = ?', [balanceChange, userId]);

                    const embed = new EmbedBuilder()
                        .setColor(balanceChange > gameState.bet ? 0x00FF00 : balanceChange === gameState.bet ? 0xFFFF00 : 0xFF0000)
                        .setTitle(`Blackjack Game Over - Bet: ${gameState.bet} chips`)
                        .setDescription(resultMessage)
                        .addFields(
                            { name: 'Your Final Hand', value: `${getHandString(gameState.playerHand)} (Value: ${playerValue})`, inline: true },
                            { name: 'Dealer\'s Final Hand', value: `${getHandString(gameState.dealerHand)} (Value: ${dealerValue})`, inline: true }
                        );
                    await interaction.editReply({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error("Error in /blackjack command:", error);
            await interaction.editReply({ content: 'An error occurred.', ephemeral: true });
        } finally {
            if (db) await db.close();
        }
    },
};