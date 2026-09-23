import { describe, expect, it, vi } from 'vitest';
import { CloneCredentialSession } from './clone-credential';

const response = {
	clone: {
		token: 'ghs_test_read_token',
		username: 'x-access-token',
		expiresAt: '2026-09-23T20:00:00Z',
		repositories: ['ryanlawyer/hirepath-data']
	}
};

describe('CloneCredentialSession', () => {
	it('allows only its scoped GitHub remote and revokes after checkout', async () => {
		const mint = vi.fn(async () => response);
		const revoke = vi.fn(async () => ({ ok: true, status: 204 }));
		const unprotect = vi.fn();
		const session = new CloneCredentialSession({ mint, fetchFn: revoke as never, logger: { unprotect } as never });
		await expect(session.authFor('https://github.com/ryanlawyer/hirepath-data.git')).resolves.toEqual({
			username: 'x-access-token',
			token: response.clone.token
		});
		await expect(session.authFor('https://github.com/other/other.git')).rejects.toThrow('does not cover');
		await expect(session.authFor('https://github.com.evil.test/ryanlawyer/hirepath-data.git')).rejects.toThrow(
			'HTTPS GitHub'
		);
		await session.dispose();
		expect(mint).toHaveBeenCalledTimes(1);
		expect(revoke).toHaveBeenCalledWith(
			'https://api.github.com/installation/token',
			expect.objectContaining({
				method: 'DELETE',
				headers: expect.objectContaining({ Authorization: `Bearer ${response.clone.token}` })
			})
		);
		expect(unprotect).toHaveBeenCalledWith(response.clone.token);
		await expect(session.authFor('https://github.com/ryanlawyer/hirepath-data.git')).rejects.toThrow('released');
	});
});
