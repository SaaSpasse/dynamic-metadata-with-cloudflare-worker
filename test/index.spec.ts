// test/index.spec.ts — routeur edge post-WeWeb.
// Les fetches vers Vercel sont réels: tests d'intégration légers.
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

describe('Routeur Next.js', () => {
	it('la home est servie par Next.js', async () => {
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

	it('les redirections historiques conservent les paramètres de campagne', async () => {
		const response = await get('/certification-employeur-certifie?utm_source=infolettre&utm_campaign=sortie-weweb');
		expect(response.status).toBe(301);
		expect(response.headers.get('location')).toBe(
			'https://saaspasse.com/certification-employeur?utm_source=infolettre&utm_campaign=sortie-weweb'
		);
	});

	it('les anciennes destinations retirées mènent vers une page utile', async () => {
		for (const [source, destination] of [
			['/jameo', 'https://saaspasse.com/startups/jameo'],
			['/modif-saas-new', 'https://saaspasse.com/dashboard/saas'],
			['/emploi/dev-front-end-full-stack', 'https://saaspasse.com/emplois'],
			['/retraites', 'https://saaspasse.com/'],
		] as const) {
			const response = await get(source);
			expect(response.status).toBe(301);
			expect(response.headers.get('location')).toBe(destination);
		}
	});

	it('les anciennes routes oubliées sont maintenant servies par Next.js', async () => {
		for (const [path, texte] of [
			['/collaborer', 'Collaborer avec SaaSpasse.'],
			['/employeur-premium', 'Employeur premium.'],
		] as const) {
			const response = await get(path);
			expect(response.status).toBe(200);
			expect(await response.text()).toContain(texte);
		}
	});

	it('une route inconnue retourne le vrai 404 Next.js', async () => {
		const response = await get('/ce-chemin-n-existe-vraiment-pas');
		expect(response.status).toBe(404);
		expect(response.headers.get('x-vercel-id')).toBeTruthy();
	});

	it('robots et sitemap viennent de Next.js', async () => {
		const robots = await get('/robots.txt');
		expect(robots.status).toBe(200);
		expect(await robots.text()).toContain('Sitemap: https://saaspasse.com/sitemap.xml');

		const sitemap = await get('/sitemap.xml');
		expect(sitemap.status).toBe(200);
		const xml = await sitemap.text();
		expect(xml).toContain('<loc>https://saaspasse.com/startups</loc>');
		expect(xml).not.toContain('weweb');
	});
});
