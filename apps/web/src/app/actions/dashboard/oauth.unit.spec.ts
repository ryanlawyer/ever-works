import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConnectUrl, getReadPackagesConnectUrl, setState, setIntent } = vi.hoisted(() => ({
    getConnectUrl: vi.fn(),
    getReadPackagesConnectUrl: vi.fn(),
    setState: vi.fn(),
    setIntent: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
    oauthAPI: { getConnectUrl, getReadPackagesConnectUrl },
    gitProvidersAPI: {},
}));
vi.mock('@/lib/auth', () => ({
    setOAuthStateCookie: setState,
    setOAuthPluginIntentCookie: setIntent,
}));

import { connectOAuthProvider, connectReadPackagesOAuthProvider } from './oauth';

const registeredCallbackPath =
    '/api/oauth/github/callback/plugins?returnPath=%2Fsettings%2Fplugins%2Fgit-provider';

describe('GitHub plugin OAuth redirect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getConnectUrl.mockResolvedValue({ url: 'https://github.com/login/oauth/authorize', state: 'state-1' });
        getReadPackagesConnectUrl.mockResolvedValue({
            url: 'https://github.com/login/oauth/authorize',
            state: 'state-2',
        });
    });

    it('uses the registered callback and retains the requested return page in state-bound intent', async () => {
        const result = await connectOAuthProvider('github', '/org/its/plugins/github');

        expect(result.success).toBe(true);
        expect(getConnectUrl).toHaveBeenCalledWith('github', expect.any(String), undefined);
        const callback = new URL(getConnectUrl.mock.calls[0][1]);
        expect(callback.pathname + callback.search).toBe(registeredCallbackPath);
        expect(setState).toHaveBeenCalledWith('state-1');
        expect(setIntent).toHaveBeenCalledWith({
            state: 'state-1',
            providerId: 'github',
            returnPath: '/org/its/plugins/github',
            mode: 'connect',
        });
    });

    it('routes read-packages authorization through the same registered callback', async () => {
        const result = await connectReadPackagesOAuthProvider('github', '/org/its/plugins/github');

        expect(result.success).toBe(true);
        expect(getReadPackagesConnectUrl).toHaveBeenCalledWith('github', expect.any(String), undefined);
        const callback = new URL(getReadPackagesConnectUrl.mock.calls[0][1]);
        expect(callback.pathname + callback.search).toBe(registeredCallbackPath);
        expect(setIntent).toHaveBeenCalledWith({
            state: 'state-2',
            providerId: 'github',
            returnPath: '/org/its/plugins/github',
            mode: 'read_packages',
        });
    });
});
