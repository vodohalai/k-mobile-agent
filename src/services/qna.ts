import { Ai } from '@cloudflare/ai';

export class QnAService {
    constructor(private ai: Ai, private db: D1Database) { }

    async embed(text: string) {
        const { data } = await this.ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
        return data[0];
    }

    async addQnA(question: string, answer: string) {
        const id = crypto.randomUUID();
        const timestamp = Date.now();
        const embedding = await this.embed(question);

        // Convert embedding array to binary blob
        const embeddingBuffer = new Float32Array(embedding);
        const embeddingBlob = new Uint8Array(embeddingBuffer.buffer);

        await this.db.prepare(
            'INSERT INTO qna (id, question, answer, question_embedding, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, question, answer, embeddingBlob, timestamp).run();

        return { id, question, answer, created_at: timestamp };
    }

    async deleteQnA(id: string) {
        await this.db.prepare('DELETE FROM qna WHERE id = ?').bind(id).run();
    }

    async listQnA() {
        const { results } = await this.db.prepare('SELECT id, question, answer, created_at FROM qna ORDER BY created_at DESC').all();
        return results;
    }

    async searchQnA(query: string, topK: number = 1) {
        const queryEmbedding = await this.embed(query);

        // Get all Q&A pairs with embeddings
        const { results } = await this.db.prepare('SELECT id, question, answer, question_embedding FROM qna').all();

        if (!results || results.length === 0) {
            return null;
        }

        // Calculate cosine similarity for each Q&A
        const similarities = results.map((row: any) => {
            if (!row.question_embedding) return { ...row, similarity: 0 };

            const embeddingBuffer = new Uint8Array(row.question_embedding as ArrayBuffer);
            const embedding = new Float32Array(embeddingBuffer.buffer);

            // Cosine similarity
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < queryEmbedding.length; i++) {
                dotProduct += queryEmbedding[i] * embedding[i];
                normA += queryEmbedding[i] * queryEmbedding[i];
                normB += embedding[i] * embedding[i];
            }
            const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

            return { ...row, similarity };
        });

        // Sort by similarity and get top K
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topResults = similarities.slice(0, topK);

        // Return best match if similarity is above threshold (e.g., 0.7)
        if (topResults[0].similarity > 0.7) {
            return {
                question: topResults[0].question,
                answer: topResults[0].answer,
                similarity: topResults[0].similarity
            };
        }

        return null;
    }
}
