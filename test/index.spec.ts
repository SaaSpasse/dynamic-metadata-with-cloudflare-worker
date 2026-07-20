// test/index.spec.ts — routing du strangler (bascule totale 19 juil 2026).
// Les fetches sortants (Vercel/WeWeb) sont réels: tests d'intégration légers.
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

async function get(path: string): Promise<Response> {
	const request = new IncomingRequest(`https://saaspasse.com${path}`, { redirect: 'manual' });
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe('Strangler v3', () => {
	it('la home est servie par le front v3', async () => {
		const response = await get('/');
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain('data-theme="dark"');
		expect(html).toContain('home-hero');
	});

	it('les routes migrées avec trailing slash redirigent 301 vers la forme canonique', async () => {
		const response = await get('/podcast/');
		expect(response.status).toBe(301);
		expect(response.headers.get('location')).toBe('https://saaspasse.com/podcast');
	});

	it('/lajobdumois suit la chaîne Worker → Next 308 → /emplois', async () => {
		const response = await get('/lajobdumois');
		expect([301, 308]).toContain(response.status);
	});
});
