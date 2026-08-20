// test/index.spec.ts — routeur edge post-WeWeb.
// Toute sortie Vercel est simulée : la CI ne dépend jamais de la production.
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import worker, { createOriginRequest } from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const originFetch = vi.fn<typeof fetch>();
let lastOriginRequest: Request | null = null;
let lastOriginInit: RequestInit | undefined;

beforeEach(() => {
	originFetch.mockImplementation(async (input, init) => {
		const request = new Request(input, init);
		lastOriginRequest = request.clone();
		lastOriginInit = init;
		const url = new URL(request.url);
		expect(url.origin).toBe('https://saaspasse-v3.vercel.app');

		switch (url.pathname) {
			case '/':
				return new Response('<html data-theme="dark"><div class="home-hero"></div></html>');
			case '/lajobdumois':
				return new Response(null, {
					status: 308,
					headers: { location: 'https://saaspasse.com/emplois' },
				});
			case '/collaborer':
				return new Response('Collaborer avec SaaSpasse.');
			case '/employeur-premium':
				return new Response('Employeur premium.');
			case '/ce-chemin-n-existe-vraiment-pas':
				return new Response('Introuvable', {
					status: 404,
					headers: { 'x-vercel-id': 'fixture::worker-test' },
				});
			case '/robots.txt':
				return new Response('Sitemap: https://saaspasse.com/sitemap.xml');
			case '/sitemap.xml':
				return new Response(
					'<urlset><url><loc>https://saaspasse.com/startups</loc></url></urlset>'
				);
			case '/infolettre':
				return new Response(null, { status: 204 });
			default:
				throw new Error(`unexpected_origin_path:${url.pathname}`);
		}
	});
	vi.stubGlobal('fetch', originFetch);
});

afterEach(() => {
	vi.unstubAllGlobals();
	originFetch.mockReset();
	lastOriginRequest = null;
	lastOriginInit = undefined;
});

async function get(path: string): Promise<Response> {
	const request = new IncomingRequest(`https://saaspasse.com${path}`, { redirect: 'manual' });
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe('Routeur Next.js', () => {
	it('retire tout header origine entrant et ajoute seulement un binding secret valide', () => {
		const incoming = new IncomingRequest('https://saaspasse.com/infolettre', {
			method: 'POST',
			headers: {
				'x-saaspasse-origin-secret': 'valeur-forgee-par-un-client',
				'x-saaspasse-public-host': 'hote-forge.example',
			},
		});
		const withoutBinding = createOriginRequest(
			incoming,
			'https://saaspasse-v3.vercel.app/infolettre',
			'saaspasse.com'
		);
		expect(withoutBinding.headers.get('x-saaspasse-origin-secret')).toBeNull();
		expect(withoutBinding.headers.get('x-saaspasse-public-host')).toBeNull();

		const withInvalidBinding = createOriginRequest(
			incoming,
			'https://saaspasse-v3.vercel.app/infolettre',
			'saaspasse.com',
			'secret avec espaces interdit 000000000001'
		);
		expect(withInvalidBinding.headers.get('x-saaspasse-origin-secret')).toBeNull();
		expect(withInvalidBinding.headers.get('x-saaspasse-public-host')).toBeNull();

		const secret = 'worker-origin-secret-fixture-0000000001';
		const withBinding = createOriginRequest(
			incoming,
			'https://saaspasse-v3.vercel.app/infolettre',
			'saaspasse.com',
			secret
		);
		expect(withBinding.headers.get('x-saaspasse-origin-secret')).toBe(secret);
		expect(withBinding.headers.get('x-saaspasse-public-host')).toBe('saaspasse.com');

		const getRequest = new IncomingRequest('https://saaspasse.com/infolettre', {
			headers: {
				'x-saaspasse-origin-secret': 'valeur-forgee-par-un-client',
				'x-saaspasse-public-host': 'saaspasse.com',
			},
		});
		const proxiedGet = createOriginRequest(
			getRequest,
			'https://saaspasse-v3.vercel.app/infolettre',
			'saaspasse.com',
			secret
		);
		expect(proxiedGet.headers.get('x-saaspasse-origin-secret')).toBeNull();
		expect(proxiedGet.headers.get('x-saaspasse-public-host')).toBeNull();
	});

	it('relaie un POST avec les preuves recréées et le corps intact', async () => {
		const secret = 'worker-origin-secret-fixture-0000000001';
		const request = new IncomingRequest('https://saaspasse.com/infolettre', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				'x-saaspasse-origin-secret': 'valeur-forgee-par-un-client',
				'x-saaspasse-public-host': 'hote-forge.example',
			},
			body: 'email=fixture%40example.test',
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(
			request,
			{ ...env, SAASPASSE_WORKER_ORIGIN_SECRET: secret },
			ctx
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(204);
		expect(originFetch).toHaveBeenCalledTimes(1);
		expect(lastOriginRequest).not.toBeNull();
		const proxied = lastOriginRequest!;
		expect(proxied.headers.get('x-saaspasse-origin-secret')).toBe(secret);
		expect(proxied.headers.get('x-saaspasse-public-host')).toBe('saaspasse.com');
		expect(proxied.headers.get('content-type')).toContain(
			'application/x-www-form-urlencoded'
		);
		expect(new TextDecoder().decode(await proxied.arrayBuffer())).toBe(
			'email=fixture%40example.test'
		);
		expect(lastOriginInit).toMatchObject({ redirect: 'manual' });
	});

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

	it('les fiches consolidées redirigent vers leur fiche canonique', async () => {
		for (const [source, destination] of [
			['/startups/billdr-pro', 'https://saaspasse.com/startups/billdr'],
			['/startups/billdr-pro/reclamer', 'https://saaspasse.com/startups/billdr/reclamer'],
			['/startups/intelligence-node-canada', 'https://saaspasse.com/startups/node'],
			[
				'/startups/intelligence-node-canada/reclamer',
				'https://saaspasse.com/startups/node/reclamer',
			],
			['/startups/ticksmith', 'https://saaspasse.com/startups/revelate'],
			['/startups/ticksmith/reclamer', 'https://saaspasse.com/startups/revelate/reclamer'],
		] as const) {
			const response = await get(source);
			expect(response.status).toBe(301);
			expect(response.headers.get('location')).toBe(destination);
		}
	});

	it('une ancienne fiche avec slash et UTM garde une URL canonique attribuable', async () => {
		const response = await get('/startups/billdr-pro/?utm_source=ancien-lien');
		expect(response.status).toBe(301);
		expect(response.headers.get('location')).toBe(
			'https://saaspasse.com/startups/billdr?utm_source=ancien-lien'
		);
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
