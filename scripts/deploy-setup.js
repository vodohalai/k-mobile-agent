const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to run command and get output
const run = (cmd) => {
    try {
        return execSync(cmd, { encoding: 'utf8' });
    } catch (e) {
        console.error(`Command failed: ${cmd}`);
        console.error(e.stdout);
        console.error(e.stderr);
        throw e;
    }
};

// Helper to extract ID from wrangler output
// Wrangler output for KV create: "Created namespace with ID <ID>"
// Wrangler output for D1 create: "Created database ... with ID <ID>"
const extractId = (output, type) => {
    if (type === 'kv') {
        const match = output.match(/id\s*=\s*"([^"]+)"/); // Match from TOML snippet output
        if (match) return match[1];
        // Fallback for different wrangler versions
        const match2 = output.match(/namespace with ID\s+([a-zA-Z0-9]+)/);
        if (match2) return match2[1];
    }
    if (type === 'd1') {
        const match = output.match(/database_id\s*=\s*"([^"]+)"/);
        if (match) return match[1];
    }
    return null;
};

async function main() {
    console.log('🚀 Starting Automated Deployment Setup...');

    let wranglerToml = fs.readFileSync('wrangler.toml', 'utf8');

    // 1. Setup KV: SESSION_STORE
    console.log('Checking SESSION_STORE...');
    try {
        // Try to create. If it exists, this might fail or return existing? 
        // Actually, creating with same name usually creates a NEW one or fails.
        // Better to LIST first? 
        // For simplicity in this script, we will try to CREATE. If we want to reuse, we'd need to list.
        // But the user wants "auto config on NEW account". So creating is fine.
        // Wait, if we run this on every push, we don't want to create new KVs every time.
        // We should check if `wrangler.toml` already has a valid ID? 
        // No, the `wrangler.toml` in the repo might have OLD IDs or Placeholders.

        // Strategy: List namespaces. If name exists, use it. If not, create.
        const kvList = JSON.parse(run('npx wrangler kv:namespace list --json'));

        let sessionStoreId = kvList.find(ns => ns.title === 'k-mobile-SESSION_STORE')?.id;
        if (!sessionStoreId) {
            console.log('Creating SESSION_STORE...');
            const output = run('npx wrangler kv:namespace create k-mobile-SESSION_STORE');
            // Wrangler create output usually gives the TOML snippet.
            sessionStoreId = extractId(output, 'kv');
        }
        console.log(`SESSION_STORE ID: ${sessionStoreId}`);
        wranglerToml = wranglerToml.replace(/id = "[^"]*"/, `id = "${sessionStoreId}"`); // Replace first KV (SESSION_STORE)

        // 2. Setup KV: CHAT_HISTORY
        let chatHistoryId = kvList.find(ns => ns.title === 'k-mobile-CHAT_HISTORY')?.id;
        if (!chatHistoryId) {
            console.log('Creating CHAT_HISTORY...');
            const output = run('npx wrangler kv:namespace create k-mobile-CHAT_HISTORY');
            chatHistoryId = extractId(output, 'kv');
        }
        console.log(`CHAT_HISTORY ID: ${chatHistoryId}`);
        // Replace second KV. This is tricky with regex. 
        // Let's use a more robust replacement strategy or assume order.
        // SESSION_STORE is first, CHAT_HISTORY is second in our file.
        // We can split the file or use specific comments.
        // For now, let's replace by binding name context.
        wranglerToml = wranglerToml.replace(
            /binding = "SESSION_STORE"\s*\n\s*id = "[^"]*"/,
            `binding = "SESSION_STORE"\nid = "${sessionStoreId}"`
        );
        wranglerToml = wranglerToml.replace(
            /binding = "CHAT_HISTORY"\s*\n\s*id = "[^"]*"/,
            `binding = "CHAT_HISTORY"\nid = "${chatHistoryId}"`
        );

    } catch (e) {
        console.error('Error setting up KV:', e);
    }

    // 3. Setup D1
    console.log('Checking D1 Database...');
    try {
        const d1List = JSON.parse(run('npx wrangler d1 list --json'));
        let dbId = d1List.find(db => db.name === 'k-mobile-db')?.uuid;

        if (!dbId) {
            console.log('Creating D1 Database...');
            const output = run('npx wrangler d1 create k-mobile-db');
            dbId = extractId(output, 'd1');
        }
        console.log(`D1 ID: ${dbId}`);
        wranglerToml = wranglerToml.replace(
            /binding = "APP_DB"\s*\n\s*database_name = "k-mobile-db"\s*\n\s*database_id = "[^"]*"/,
            `binding = "APP_DB"\ndatabase_name = "k-mobile-db"\ndatabase_id = "${dbId}"`
        );

        // Run migrations if new or existing
        console.log('Applying D1 Migrations...');
        run(`npx wrangler d1 migrations apply k-mobile-db --remote`);

    } catch (e) {
        console.error('Error setting up D1:', e);
    }

    // 4. Update Account ID
    // We assume CLOUDFLARE_ACCOUNT_ID is in env
    if (process.env.CLOUDFLARE_ACCOUNT_ID) {
        wranglerToml = wranglerToml.replace(
            /account_id = "[^"]*"/,
            `account_id = "${process.env.CLOUDFLARE_ACCOUNT_ID}"`
        );
    }

    // Write updated config
    fs.writeFileSync('wrangler.toml', wranglerToml);
    console.log('✅ wrangler.toml updated successfully.');
}

main();
