import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('K-Mobile Agent API', () => {
	it('responds with status message', async () => {
		const request = new IncomingRequest('http://example.com/');
		const ctx = createExecutionContext();
		// Mock env with minimal bindings
		const testEnv = { ...env };

		const response = await worker.fetch(request, testEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toContain('K-Mobile Agent API is running');
	});

	it('handles webhook verification', async () => {
		const request = new IncomingRequest('http://example.com/webhook?hub.mode=subscribe&hub.verify_token=TEST_TOKEN&hub.challenge=12345');
		const testEnv = { ...env, FB_VERIFY_TOKEN: 'TEST_TOKEN' };
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, testEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toBe('12345');
	});
});
