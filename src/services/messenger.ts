export class MessengerService {
    constructor(private pageAccessToken: string) { }

    async sendText(recipientId: string, text: string) {
        const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${this.pageAccessToken}`;
        const body = {
            recipient: { id: recipientId },
            message: { text },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Failed to send message:', error);
            throw new Error('Failed to send message');
        }
    }

    async sendTypingOn(recipientId: string) {
        const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${this.pageAccessToken}`;
        const body = {
            recipient: { id: recipientId },
            sender_action: 'typing_on'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error('Failed to send typing indicator');
        }
    }

    async sendQuickReplies(recipientId: string, text: string, options: string[]) {
        const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${this.pageAccessToken}`;

        // Facebook limits quick replies to 13 items. We might need to paginate or limit.
        // For now, we slice to 13.
        const quickReplies = options.slice(0, 13).map(option => ({
            content_type: 'text',
            title: option,
            payload: option
        }));

        const body = {
            recipient: { id: recipientId },
            messaging_type: "RESPONSE",
            message: {
                text,
                quick_replies: quickReplies
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Failed to send quick replies:', error);
            // Don't throw, just log.
        }
    }
}
