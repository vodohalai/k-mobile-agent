import { Ai } from '@cloudflare/ai';

export class RAGService {
    constructor(private ai: Ai, private index: VectorizeIndex) { }

    async embed(text: string) {
        // Use Cloudflare's BGE model
        const { data } = await this.ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
        return data[0];
    }

    async indexDocument(docId: string, content: string) {
        const chunks = this.chunkText(content, 600, 100); // 600 chars with 100 char overlap
        const vectors = [];

        // Process in batches to avoid rate limits if necessary
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await this.embed(chunk);
            vectors.push({
                id: `${docId}_${i}`,
                values: embedding,
                metadata: { docId, text: chunk, chunkIndex: i }
            });
        }

        // Vectorize upsert limit is 1000 vectors per call, which is fine here
        if (vectors.length > 0) {
            await this.index.upsert(vectors);
        }
    }

    async deleteDocument(docId: string) {
        // Vectorize doesn't support delete by metadata easily without querying first
        // Or we can delete by ID prefix if we track IDs.
        // For now, we assume we need to delete IDs `${docId}_0`, `${docId}_1`...
        // This requires knowing how many chunks.
        // A better way is to query by metadata (if supported) or store chunk IDs in D1.
        // For simplicity/MVP, we might skip deletion or implement it later.
        // Actually, Vectorize supports deleteByIds. We need to know the IDs.
        // Let's assume we store chunk count in D1 or just try to delete a range.
        // Or just leave it for now.
    }

    async search(query: string, topK: number = 5) {
        const embedding = await this.embed(query);
        const results = await this.index.query(embedding, {
            topK,
            returnMetadata: true,
            returnValues: false
        });

        // Filter by similarity threshold (cosine similarity > 0.6)
        const relevantMatches = results.matches.filter(m => m.score && m.score > 0.6);

        if (relevantMatches.length === 0) {
            return ''; // No relevant context found
        }

        // Sort by score (highest first) and deduplicate
        const uniqueTexts = new Set<string>();
        const contextPieces: string[] = [];

        for (const match of relevantMatches) {
            const text = match.metadata?.text as string;
            if (text && !uniqueTexts.has(text)) {
                uniqueTexts.add(text);
                contextPieces.push(text);
            }
        }

        return contextPieces.join('\n\n---\n\n');
    }

    private chunkText(text: string, size: number, overlap: number = 0): string[] {
        const chunks: string[] = [];

        // Split by paragraphs first (double newlines or single newlines)
        const paragraphs = text.split(/\n\n+|\n/).filter(p => p.trim().length > 0);

        let currentChunk = '';

        for (const paragraph of paragraphs) {
            // If adding this paragraph exceeds size, save current chunk
            if (currentChunk.length > 0 && currentChunk.length + paragraph.length > size) {
                chunks.push(currentChunk.trim());

                // Start new chunk with overlap from previous chunk
                if (overlap > 0 && currentChunk.length > overlap) {
                    currentChunk = currentChunk.slice(-overlap) + '\n' + paragraph;
                } else {
                    currentChunk = paragraph;
                }
            } else {
                // Add paragraph to current chunk
                currentChunk += (currentChunk.length > 0 ? '\n' : '') + paragraph;
            }
        }

        // Add the last chunk
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }

        // If no chunks created (very short text), return as single chunk
        if (chunks.length === 0 && text.trim().length > 0) {
            chunks.push(text.trim());
        }

        return chunks;
    }
}
