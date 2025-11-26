/**
 * Setup Persistent Menu for Facebook Messenger
 * Run this script once to configure the persistent menu on your Facebook Page
 * 
 * Usage: node setup-persistent-menu.js
 */

const FB_PAGE_ACCESS_TOKEN = "EAAQo7XHCHbABQPgkPdJdV0MwZARr9DT1VN0jwhl7XVCQBcyCVB5QQuUAxOmmCfGOLjlcozGoDPYHw8fGaolZCSQpeyTBzV3PZBgRjSnR0zCKOZAyg9f4JDjB5K5I20DHRjShEDUYsL6YrzHeRCkkTZBUJrBkqhRP0v4ObnsKKdwZCcB3qgvIUfd8JOaSehrtfyZBXvcoFIfsAZDZD";

const persistentMenu = {
    "persistent_menu": [
        {
            "locale": "default",
            "composer_input_disabled": false,
            "call_to_actions": [
                {
                    "type": "postback",
                    "title": "🔋 Thay Pin",
                    "payload": "SERVICE_BATTERY"
                },
                {
                    "type": "postback",
                    "title": "📱 Thay Màn Hình",
                    "payload": "SERVICE_SCREEN"
                },
                {
                    "type": "postback",
                    "title": "🔐 Sửa Face ID",
                    "payload": "SERVICE_FACEID"
                },
                {
                    "type": "postback",
                    "title": "📷 Thay Camera",
                    "payload": "SERVICE_CAMERA"
                },
                {
                    "type": "postback",
                    "title": "🔧 Sửa Main",
                    "payload": "SERVICE_MAIN"
                },
                {
                    "type": "postback",
                    "title": "🔌 Thay Chân Sạc",
                    "payload": "SERVICE_CHARGING"
                },
                {
                    "type": "postback",
                    "title": "🪟 Ép Kính",
                    "payload": "SERVICE_GLASS"
                },
                {
                    "type": "postback",
                    "title": "💧 Máy Rơi Nước",
                    "payload": "SERVICE_WATER"
                },
                {
                    "type": "postback",
                    "title": "👤 Gặp tư vấn trực tiếp",
                    "payload": "SERVICE_HUMAN"
                }
            ]
        }
    ]
};

async function setupPersistentMenu() {
    const url = `https://graph.facebook.com/v18.0/me/messenger_profile?access_token=${FB_PAGE_ACCESS_TOKEN}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(persistentMenu)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Persistent Menu setup successfully!');
            console.log(result);
        } else {
            console.error('❌ Failed to setup Persistent Menu:');
            console.error(result);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

setupPersistentMenu();
