import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AIService } from './services/ai';
import { RAGService } from './services/rag';
import { MessengerService } from './services/messenger';
import { Ai as AiClient } from '@cloudflare/ai';

type Bindings = {
	SESSION_STORE: KVNamespace;
	CHAT_HISTORY: KVNamespace;
	APP_DB: D1Database;
	DOC_INDEX: VectorizeIndex;
	AI: Ai;
	OPENAI_MODEL_NAME: string;
	GEMINI_MODEL_NAME: string;
	OPENAI_API_KEY: string;
	GEMINI_API_KEY: string;
	FB_PAGE_ACCESS_TOKEN: string;
	FB_VERIFY_TOKEN: string;
	SYSTEM_PROMPT: string;
	ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

app.get('/*', async (c, next) => {
	// Skip API and Webhook routes
	if (c.req.path.startsWith('/api') || c.req.path.startsWith('/webhook')) {
		return next();
	}
	// Serve Assets (UI)
	return c.env.ASSETS.fetch(c.req.raw);
});

// Admin API: Config
app.get('/api/admin/config', async (c) => {
	const activeProvider = await c.env.SESSION_STORE.get('ACTIVE_PROVIDER') || 'openai';
	const openaiModel = await c.env.SESSION_STORE.get('OPENAI_MODEL_OVERRIDE') || '';
	const geminiModel = await c.env.SESSION_STORE.get('GEMINI_MODEL_OVERRIDE') || '';
	const systemPrompt = await c.env.SESSION_STORE.get('SYSTEM_PROMPT') || '';

	return c.json({
		activeProvider,
		openaiModel,
		geminiModel,
		systemPrompt,
		defaultOpenAI: c.env.OPENAI_MODEL_NAME,
		defaultGemini: c.env.GEMINI_MODEL_NAME,
	});
});

app.post('/api/admin/config', async (c) => {
	const body = await c.req.json();
	if (body.activeProvider) await c.env.SESSION_STORE.put('ACTIVE_PROVIDER', body.activeProvider);
	if (body.openaiModel !== undefined) await c.env.SESSION_STORE.put('OPENAI_MODEL_OVERRIDE', body.openaiModel);
	if (body.geminiModel !== undefined) await c.env.SESSION_STORE.put('GEMINI_MODEL_OVERRIDE', body.geminiModel);
	if (body.systemPrompt !== undefined) await c.env.SESSION_STORE.put('SYSTEM_PROMPT', body.systemPrompt);

	return c.json({ success: true });
});

// Admin API: Documents (List)
app.get('/api/admin/documents', async (c) => {
	const { results } = await c.env.APP_DB.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all();
	return c.json(results);
});

// Admin API: Documents (Upload)
app.post('/api/admin/documents', async (c) => {
	const body = await c.req.parseBody();
	const file = body['file'];

	if (file instanceof File) {
		const content = await file.text();
		const id = crypto.randomUUID();
		const timestamp = Date.now();

		// Store Metadata in D1
		await c.env.APP_DB.prepare(
			'INSERT INTO documents (id, name, size, content, uploaded_at) VALUES (?, ?, ?, ?, ?)'
		).bind(id, file.name, file.size, content, timestamp).run();

		// Index in Vectorize
		const ai = new AiClient(c.env.AI);
		const ragService = new RAGService(ai, c.env.DOC_INDEX);
		await ragService.indexDocument(id, content);

		return c.json({ success: true, id });
	}

	return c.json({ error: 'Invalid file' }, 400);
});

// Admin API: Documents (Delete)
app.delete('/api/admin/documents/:id', async (c) => {
	const id = c.req.param('id');
	await c.env.APP_DB.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
	// TODO: Delete from Vectorize
	return c.json({ success: true });
});

// Admin API: Q&A (List)
app.get('/api/admin/qna', async (c) => {
	const { Ai: AiClient } = await import('@cloudflare/ai');
	const { QnAService } = await import('./services/qna');
	const ai = new AiClient(c.env.AI);
	const qnaService = new QnAService(ai, c.env.APP_DB);
	const results = await qnaService.listQnA();
	return c.json(results);
});

// Admin API: Q&A (Add)
app.post('/api/admin/qna', async (c) => {
	const { question, answer } = await c.req.json();
	if (!question || !answer) {
		return c.json({ error: 'Question and answer are required' }, 400);
	}

	const { Ai: AiClient } = await import('@cloudflare/ai');
	const { QnAService } = await import('./services/qna');
	const ai = new AiClient(c.env.AI);
	const qnaService = new QnAService(ai, c.env.APP_DB);
	const result = await qnaService.addQnA(question, answer);
	return c.json(result);
});

// Admin API: Q&A (Delete)
app.delete('/api/admin/qna/:id', async (c) => {
	const id = c.req.param('id');
	const { Ai: AiClient } = await import('@cloudflare/ai');
	const { QnAService } = await import('./services/qna');
	const ai = new AiClient(c.env.AI);
	const qnaService = new QnAService(ai, c.env.APP_DB);
	await qnaService.deleteQnA(id);
	return c.json({ success: true });
});

// Types for Dynamic Tree Menu
interface MenuNode {
	id: string;
	label: string;
	content?: string; // For the final response or extra data
	children: MenuNode[];
}

interface MenuConfig {
	columns: string[]; // e.g., ["Services", "Series", "Models", "Response"]
	tree: MenuNode[];
}

// Admin API: Menu Config (Get)
app.get('/api/admin/menu', async (c) => {
	const menuConfig = await c.env.SESSION_STORE.get('MENU_CONFIG', 'json');
	if (menuConfig) {
		return c.json(menuConfig);
	}
	// Fallback: Migrate from constants
	const { SERVICES, SERIES, MODELS } = await import('./constants/menus');
	const { BATTERY_PRICES } = await import('./constants/battery_prices');

	const tree: MenuNode[] = [];
	const columns = ['Services', 'Series', 'Models', 'Options', 'Response'];

	// Helper to generate ID
	const generateId = () => Math.random().toString(36).substr(2, 9);

	// Build Tree
	for (const service of SERVICES) {
		const serviceNode: MenuNode = {
			id: generateId(),
			label: service,
			content: `Bạn muốn ${service} cho dòng máy nào ạ?`,
			children: []
		};

		// For "Thay Pin", we have specific structure
		// For others, we still show Series -> Models but maybe no content yet
		// Actually, the old logic applied Series/Models to ALL services (except "Gặp tư vấn")

		if (service !== "Gặp tư vấn trực tiếp") {
			for (const series of SERIES) {
				const seriesNode: MenuNode = {
					id: generateId(),
					label: series,
					content: "Cụ thể là máy nào ạ?",
					children: []
				};

				const models = MODELS[series] || [];
				for (const model of models) {
					const modelNode: MenuNode = {
						id: generateId(),
						label: model,
						children: []
					};

					// Add Price Content if Service is "Thay Pin"
					if (service === 'Thay Pin') {
						const price = BATTERY_PRICES[model];
						if (price) {
							modelNode.content = "Bạn muốn chọn loại pin nào ạ?";

							if (price.HC) {
								modelNode.children.push({
									id: generateId(),
									label: 'HC',
									content: `Giá thay pin HC cho ${model} là: ${price.HC}`,
									children: []
								});
							}
							if (price.PD) {
								modelNode.children.push({
									id: generateId(),
									label: 'PD',
									content: `Giá thay pin Pisen/Dura cho ${model} là: ${price.PD}`,
									children: []
								});
							}
						} else {
							modelNode.content = "Hiện tại chưa có báo giá cho dòng máy này.";
						}
					} else {
						// Default content for other services
						modelNode.content = `Dạ, bạn muốn ${service} cho ${model}. Vui lòng đợi nhân viên tư vấn thêm ạ.`;
					}

					seriesNode.children.push(modelNode);
				}
				serviceNode.children.push(seriesNode);
			}
		} else {
			serviceNode.content = "Dạ, em đã thông báo cho nhân viên. Vui lòng đợi trong giây lát ạ.";
		}

		tree.push(serviceNode);
	}

	return c.json({ columns, tree });
});

// Admin API: Menu Config (Save)
app.post('/api/admin/menu', async (c) => {
	const body = await c.req.json();
	await c.env.SESSION_STORE.put('MENU_CONFIG', JSON.stringify(body));
	return c.json({ success: true });
});

// Facebook Webhook Verification
app.get('/webhook', (c) => {
	const mode = c.req.query('hub.mode');
	const token = c.req.query('hub.verify_token');
	const challenge = c.req.query('hub.challenge');

	if (mode === 'subscribe' && token === c.env.FB_VERIFY_TOKEN) {
		return c.text(challenge || '');
	}
	return c.json({ error: 'Forbidden' }, 403);
});

// Helper to find a node by ID in the tree
const findNodeById = (nodes: MenuNode[], id: string): MenuNode | null => {
	for (const node of nodes) {
		if (node.id === id) return node;
		if (node.children) {
			const found = findNodeById(node.children, id);
			if (found) return found;
		}
	}
	return null;
};

// Helper to find a matching child node by label (case-insensitive)
const findMatchingChild = (nodes: MenuNode[], input: string): MenuNode | null => {
	const lowerInput = input.toLowerCase();
	return nodes.find(node => node.label.toLowerCase() === lowerInput) || null;
};

// Facebook Webhook Event
app.post('/webhook', async (c) => {
	const body = await c.req.json();

	if (body.object === 'page') {
		const promises = [];
		for (const entry of body.entry) {
			for (const event of entry.messaging) {
				if (event.message && event.message.text) {
					const senderId = event.sender.id;
					const userMessage = event.message.text;

					// Process in background
					promises.push((async () => {
						try {
							// Initialize services
							const aiService = new AIService(
								c.env,
								(await c.env.SESSION_STORE.get('ACTIVE_PROVIDER') as 'openai' | 'gemini') || 'openai',
								(await c.env.SESSION_STORE.get('OPENAI_MODEL_OVERRIDE')) || undefined
							);
							const ai = new AiClient(c.env.AI);
							const ragService = new RAGService(ai, c.env.DOC_INDEX);
							const messengerService = new MessengerService(c.env.FB_PAGE_ACCESS_TOKEN);

							// Load Menu Config
							const menuConfig: MenuConfig | null = await c.env.SESSION_STORE.get('MENU_CONFIG', 'json');
							const rootNodes = menuConfig?.tree || [];

							// Get History & State
							const historyKey = `session:${senderId}`;
							const stateKey = `state:${senderId}`;
							let history: { role: string; content: string }[] = await c.env.CHAT_HISTORY.get(historyKey, 'json') || [];
							let currentState: { currentNodeId?: string } = await c.env.CHAT_HISTORY.get(stateKey, 'json') || {};

							// Check if this is the first message (no history)
							if (history.length === 0) {
								// First message - always show root menu
								const options = rootNodes.map(n => n.label);
								await messengerService.sendQuickReplies(senderId, "Chào bạn! K-Mobile có thể giúp gì cho bạn hôm nay?", options);

								// Save to history
								history.push({ role: 'user', content: userMessage });
								history.push({ role: 'assistant', content: 'Chào bạn! K-Mobile có thể giúp gì cho bạn hôm nay?' });
								await c.env.CHAT_HISTORY.put(historyKey, JSON.stringify(history));
								return;
							}

							// --- TREE TRAVERSAL LOGIC ---

							// Determine current context (children of current node, or root)
							let currentContextNodes = rootNodes;
							if (currentState.currentNodeId) {
								const currentNode = findNodeById(rootNodes, currentState.currentNodeId);
								if (currentNode && currentNode.children && currentNode.children.length > 0) {
									currentContextNodes = currentNode.children;
								} else {
									// If current node is leaf or invalid, reset to root? 
									// Or maybe we are at a leaf and user typed something new.
									// Let's reset context to root for matching, but keep state if needed?
									// Actually, if we are at a leaf, we usually loop back to root.
									currentContextNodes = rootNodes;
									currentState.currentNodeId = undefined; // Reset state for matching
								}
							}

							// Check for match in current context
							const match = findMatchingChild(currentContextNodes, userMessage);

							if (match) {
								// Match found! Update state
								currentState.currentNodeId = match.id;
								await c.env.CHAT_HISTORY.put(stateKey, JSON.stringify(currentState));

								// Determine response
								let responseText = match.content || match.label;
								let nextOptions: string[] = [];

								if (match.children && match.children.length > 0) {
									// Has children -> Show them as Quick Replies
									nextOptions = match.children.map(n => n.label);
									// If content is empty, maybe generate a generic prompt?
									if (!match.content) {
										responseText = `Bạn chọn ${match.label}, xin mời chọn tiếp:`;
									}
								} else {
									// Leaf node -> Show Content + Loop back to Root
									nextOptions = rootNodes.map(n => n.label);
								}

								// Send Response
								await messengerService.sendQuickReplies(senderId, responseText, nextOptions);

								// Update History
								history.push({ role: 'user', content: userMessage });
								history.push({ role: 'assistant', content: responseText });
								if (history.length > 20) history = history.slice(-20);
								await c.env.CHAT_HISTORY.put(historyKey, JSON.stringify(history));
								return;
							}

							// --- END TREE TRAVERSAL ---

							// Fallback: Check Q&A first, then RAG for free text
							await messengerService.sendTypingOn(senderId);

							// Rewrite user query
							const rewrittenQuery = await aiService.rewriteQuery(userMessage);

							// Try Q&A
							const { Ai: AiClient2 } = await import('@cloudflare/ai');
							const { QnAService } = await import('./services/qna');
							const aiForQnA = new AiClient2(c.env.AI);
							const qnaService = new QnAService(aiForQnA, c.env.APP_DB);
							const qnaResult = await qnaService.searchQnA(rewrittenQuery);

							let responseText: string | null = null;

							if (qnaResult) {
								const isValid = await aiService.validateQnA(
									userMessage,
									qnaResult.question,
									qnaResult.answer,
									'' // No specific service context in new tree logic yet, or could derive from path
								);
								if (isValid) responseText = qnaResult.answer;
							}

							if (!responseText) {
								// Fallback to RAG
								let context = await ragService.search(userMessage);
								// Add context from current node if possible? 
								// For now, simple RAG.

								history.push({ role: 'user', content: userMessage });
								if (history.length > 20) history = history.slice(-20);

								responseText = await aiService.generate(history, context, c.env.SESSION_STORE);
							}

							// Send Response with Root Menu (Loop back)
							const rootOptions = rootNodes.map(n => n.label);
							await messengerService.sendQuickReplies(senderId, responseText || 'Sorry, I could not generate a response.', rootOptions);

							// Update History
							history.push({ role: 'user', content: userMessage }); // Ensure user msg is in history if not added above
							// Wait, I added it in RAG block but not Q&A block. Let's fix history consistency.
							// Actually, let's just ensure it's added once.
							// To be safe, I'll just rely on the push calls above. 
							// But wait, if Q&A hits, I didn't push to history.
							// Let's fix that.

							// Refactor history push:
							// We already pushed in Tree Logic.
							// For Fallback:
							// We pushed in RAG block.
							// We need to push for Q&A block.
							// And we need to push assistant response.

							// Let's clean up history logic in next iteration if needed, but for now:
							// If RAG was used, user msg is pushed.
							// If Q&A was used, user msg is NOT pushed yet.
							if (qnaResult && responseText === qnaResult.answer) {
								history.push({ role: 'user', content: userMessage });
							}

							history.push({ role: 'assistant', content: responseText || '' });
							if (history.length > 20) history = history.slice(-20);
							await c.env.CHAT_HISTORY.put(historyKey, JSON.stringify(history));

						} catch (error) {
							console.error('Error processing message:', error);
						}
					})());
				}

				// Handle postback events (from Persistent Menu)
				if (event.postback) {
					// TODO: Map postbacks to Tree Nodes if possible, or keep legacy mapping?
					// For now, let's keep it simple and just redirect to main menu or handle specific cases.
					// Since we are moving to dynamic tree, hardcoded postbacks might be tricky.
					// Ideally, persistent menu should also be dynamic, but that requires FB API calls.
					// Let's just respond with "Please type your request" or show Root Menu.
					const senderId = event.sender.id;
					const payload = event.postback.payload;

					promises.push((async () => {
						const messengerService = new MessengerService(c.env.FB_PAGE_ACCESS_TOKEN);
						const menuConfig: MenuConfig | null = await c.env.SESSION_STORE.get('MENU_CONFIG', 'json');
						const rootNodes = menuConfig?.tree || [];
						const options = rootNodes.map(n => n.label);

						await messengerService.sendQuickReplies(senderId, `Bạn đã chọn ${payload}. Dưới đây là các dịch vụ của chúng tôi:`, options);
					})());
				}
			}
		}
		// Wait for all background tasks
		c.executionCtx.waitUntil(Promise.all(promises));
	}

	return c.text('EVENT_RECEIVED');
});

export default app;
