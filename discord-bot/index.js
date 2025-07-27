const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// Load environment variables from the .env file in the project root
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use the token from your .env file
const token = process.env.DISCORD_TOKEN;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- Command Handler ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// --- Event Handler ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// --- Login to Discord ---
// Debug log to confirm the token is being read
console.log('--- Attempting to log in with token: ---');
console.log(token);

client.login(token);