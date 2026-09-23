import 'server-only';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies } from 'next/headers';
import { encrypt, decrypt } from './crypto';

export const AUTH_COOKIE_NAME = 'everworks_auth_token';

// M-21: in preview / staging deploys that serve over HTTPS but happen to
// run with NODE_ENV !== 'production', the previous `secure: NODE_ENV ===
// 'production'` flag would let the cookie travel over HTTP. Anchor on the
// public URL scheme instead so any HTTPS deploy gets the secure flag.
// `WEB_URL` is already required at boot for the API; mirror that here.
function isPublicUrlHttps(): boolean {
    const url = process.env.WEB_URL || process.env.NEXT_PUBLIC_WEB_URL;
    if (url) {
        try {
            return new URL(url).protocol === 'https:';
        } catch {
            // fall through
        }
    }
    return process.env.NODE_ENV === 'production';
}

const cookieOptions: Partial<ResponseCookie> = {
    httpOnly: true,
    secure: isPublicUrlHttps(),
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
};

export async function setAuthAccessCookie(token: string) {
    const cookieStore = await cookies();
    const encryptedToken = await encrypt(token);
    cookieStore.set(AUTH_COOKIE_NAME, encryptedToken, cookieOptions);
}

export async function getAuthAccessCookie() {
    const cookieStore = await cookies();
    const encryptedValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!encryptedValue) return undefined;

    try {
        return await decrypt(encryptedValue);
    } catch (error) {
        console.error('Failed to decrypt auth cookie:', error);
        return undefined;
    }
}

export async function removeAuthAccessCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
}

// =================
// All cookies
// =================

export async function setAuthCookies(access_token: string) {
    await setAuthAccessCookie(access_token);
}

export async function removeAuthAccessCookies() {
    await removeAuthAccessCookie();
}

// =================
// OAuth
// =================

export async function setOAuthStateCookie(state: string) {
    const cookieStore = await cookies();
    cookieStore.set('oauth_state', state, {
        ...cookieOptions,
        maxAge: 60 * 10, // 10 minute expiry
    });
}

export async function getOAuthStateCookie() {
    const cookieStore = await cookies();
    return cookieStore.get('oauth_state')?.value;
}

export async function removeOAuthStateCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('oauth_state');
}

export type OAuthPluginIntent = {
    state: string;
    providerId: string;
    returnPath: string;
    mode: 'connect' | 'read_packages';
};

/** Keep the GitHub redirect URI fixed while preserving the requested return page. */
export async function setOAuthPluginIntentCookie(intent: OAuthPluginIntent) {
    const cookieStore = await cookies();
    cookieStore.set('oauth_plugin_intent', JSON.stringify(intent), {
        ...cookieOptions,
        maxAge: 60 * 10,
    });
}

export async function getOAuthPluginIntentCookie(): Promise<OAuthPluginIntent | null> {
    const cookieStore = await cookies();
    const value = cookieStore.get('oauth_plugin_intent')?.value;
    if (!value) return null;
    try {
        const intent: unknown = JSON.parse(value);
        if (
            intent &&
            typeof intent === 'object' &&
            'state' in intent &&
            typeof intent.state === 'string' &&
            'providerId' in intent &&
            typeof intent.providerId === 'string' &&
            'returnPath' in intent &&
            typeof intent.returnPath === 'string' &&
            'mode' in intent &&
            (intent.mode === 'connect' || intent.mode === 'read_packages')
        ) {
            return intent as OAuthPluginIntent;
        }
    } catch {
        // A malformed cookie cannot control the callback destination.
    }
    return null;
}

export async function removeOAuthPluginIntentCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('oauth_plugin_intent');
}

// =================
// Redirects
// =================

export async function setRedirectCookie(url: string) {
    const cookieStore = await cookies();
    cookieStore.set('redirect_url', url, {
        ...cookieOptions,
        maxAge: 60 * 10, // 10 minute expiry
    });
}

export async function getRedirectCookie() {
    const cookieStore = await cookies();
    return cookieStore.get('redirect_url')?.value;
}

export async function removeRedirectCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('redirect_url');
}
