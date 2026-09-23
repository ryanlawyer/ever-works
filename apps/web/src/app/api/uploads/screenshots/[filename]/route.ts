import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/constants';

type RouteContext = { params: Promise<{ filename: string }> };

/** Public, immutable PNGs captured from unauthenticated public web pages. */
export async function GET(_request: Request, { params }: RouteContext) {
    const { filename } = await params;
    if (!/^[0-9a-f]{64}\.png$/.test(filename)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const upstream = await fetch(`${API_URL}/uploads/screenshots/${filename}`, {
        cache: 'no-store',
    });
    if (!upstream.ok) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const headers = new Headers({
        'Content-Type': 'image/png',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        'Cache-Control': 'public, max-age=31536000, immutable',
    });
    const length = upstream.headers.get('content-length');
    if (length) headers.set('Content-Length', length);
    return new Response(upstream.body, { status: 200, headers });
}
