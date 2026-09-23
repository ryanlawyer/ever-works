import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/constants', () => ({ API_URL: 'http://api.example/api' }));

import { GET } from './route';

const hash = 'a'.repeat(64);
const context = (filename: string) => ({ params: Promise.resolve({ filename }) });

afterEach(() => vi.unstubAllGlobals());

describe('public screenshot proxy', () => {
    it('serves an immutable PNG without an auth cookie', async () => {
        const fetchMock = vi.fn(async () => new Response('png', {
            headers: { 'content-type': 'image/png', 'content-length': '3' },
        }));
        vi.stubGlobal('fetch', fetchMock);
        const response = await GET(new Request('http://web.example'), context(`${hash}.png`));
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/png');
        expect(await response.text()).toBe('png');
        expect(fetchMock).toHaveBeenCalledWith(
            `http://api.example/api/uploads/screenshots/${hash}.png`,
            { cache: 'no-store' },
        );
    });

    it('rejects invalid filenames before contacting the API', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const response = await GET(new Request('http://web.example'), context('../secret'));
        expect(response.status).toBe(404);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
