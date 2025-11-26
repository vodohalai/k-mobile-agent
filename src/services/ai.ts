import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIService {
    constructor(
        private env: any, // Bindings
        private provider: 'openai' | 'gemini',
        private modelOverride?: string
    ) { }


    async generate(history: { role: string; content: string }[], context: string, kvStore?: KVNamespace) {
        // Get system prompt from KV or use default
        let basePrompt = "You are K-Mobile Agent, a helpful assistant for phone repair services. Use the following context to answer the user's question. If the answer is not in the context, say you don't know but offer to connect to a human.";

        if (kvStore) {
            const customPrompt = await kvStore.get('SYSTEM_PROMPT');
            if (customPrompt) {
                basePrompt = customPrompt;
            }
        }

        const systemPrompt = `${basePrompt}
Context:
${context}`;

        if (this.provider === 'openai') {
            const openai = new OpenAI({ apiKey: this.env.OPENAI_API_KEY });
            const model = this.modelOverride || this.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
            ];

            const response = await openai.chat.completions.create({
                model,
                messages: messages as any,
            });
            return response.choices[0].message.content;
        } else {
            const genAI = new GoogleGenerativeAI(this.env.GEMINI_API_KEY);
            const modelName = this.modelOverride || this.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
            const model = genAI.getGenerativeModel({ model: modelName });

            // Gemini history format
            const chatHistory = [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: 'Understood. I will use the context to answer.' }] },
                ...history.slice(0, -1).map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                }))
            ];

            const chat = model.startChat({
                history: chatHistory as any,
            });

            const lastMessage = history[history.length - 1].content;
            const result = await chat.sendMessage(lastMessage);
            return result.response.text();
        }
    }

    async rewriteQuery(userMessage: string): Promise<string> {
        const rewritePrompt = `You are a query rewriter. Rewrite the following customer message into a clear, concise question suitable for semantic search. Remove filler words, slang, and typos. Keep the core intent.

Customer message: "${userMessage}"

Rewritten question (respond with ONLY the rewritten question, no explanation):`;

        if (this.provider === 'openai') {
            const openai = new OpenAI({ apiKey: this.env.OPENAI_API_KEY });
            const model = this.modelOverride || this.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';

            const response = await openai.chat.completions.create({
                model,
                messages: [{ role: 'user', content: rewritePrompt }],
                temperature: 0.3,
            });
            return response.choices[0].message.content?.trim() || userMessage;
        } else {
            const genAI = new GoogleGenerativeAI(this.env.GEMINI_API_KEY);
            const modelName = this.modelOverride || this.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent(rewritePrompt);
            return result.response.text().trim() || userMessage;
        }
    }

    async validateQnA(userQuery: string, qnaQuestion: string, qnaAnswer: string, context: string): Promise<boolean> {
        const validationPrompt = `You are a helpful assistant validating a retrieved Q&A pair for a user query.
User Query: "${userQuery}"
Context: "${context}"
Retrieved Q&A Question: "${qnaQuestion}"
Retrieved Q&A Answer: "${qnaAnswer}"

Is the Retrieved Q&A relevant to the User Query and does it provide a correct answer given the Context?
If the User Query is about a specific service (e.g., Battery) and the Q&A is about a different service (e.g., Camera), respond with NO.
Respond with ONLY "YES" or "NO".`;

        if (this.provider === 'openai') {
            const openai = new OpenAI({ apiKey: this.env.OPENAI_API_KEY });
            const model = this.modelOverride || this.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';

            const response = await openai.chat.completions.create({
                model,
                messages: [{ role: 'user', content: validationPrompt }],
                temperature: 0,
            });
            const text = response.choices[0].message.content?.trim().toUpperCase() || 'NO';
            return text.includes('YES');
        } else {
            const genAI = new GoogleGenerativeAI(this.env.GEMINI_API_KEY);
            const modelName = this.modelOverride || this.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent(validationPrompt);
            const text = result.response.text().trim().toUpperCase();
            return text.includes('YES');
        }
    }
}
