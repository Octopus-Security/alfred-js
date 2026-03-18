module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`[Alfred] Logged in as ${client.user.tag} (${client.user.id})`);
        console.log(`[Alfred] Active in ${client.guilds.cache.size} guild(s):`);
        client.guilds.cache.forEach(guild => {
            console.log(`  - ${guild.name} (${guild.id}) | Members: ${guild.memberCount}`);
        });
    },
};
