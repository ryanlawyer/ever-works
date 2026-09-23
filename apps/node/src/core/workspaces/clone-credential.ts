import {
	FLEET_PUSH_CREDENTIAL_REVOKE_URL,
	fleetPushRemoteRepositoryId,
	type FleetJobCloneCredentialResponse
} from '@ever-works/contracts';
import type { Logger } from '../logger';

export interface CloneCredentialProvider {
	authFor(remoteUrl: string): Promise<{ username: string; token: string }>;
}

/** A contents:read token exists only while the checkout is being prepared. */
export class CloneCredentialSession implements CloneCredentialProvider {
	private loading: Promise<FleetJobCloneCredentialResponse> | null = null;
	private response: FleetJobCloneCredentialResponse | null = null;
	private disposed = false;

	constructor(
		private readonly options: {
			mint: () => Promise<FleetJobCloneCredentialResponse>;
			logger?: Logger;
			fetchFn?: typeof fetch;
		}
	) {}

	async authFor(remoteUrl: string): Promise<{ username: string; token: string }> {
		if (this.disposed) throw new Error('The clone credential has been released');
		const repositoryId = fleetPushRemoteRepositoryId(remoteUrl);
		if (!repositoryId) throw new Error('A scoped clone credential requires an HTTPS GitHub repository URL');
		if (!this.loading) this.loading = this.options.mint();
		const response = await this.loading;
		if (this.disposed) throw new Error('The clone credential has been released');
		this.response = response;
		if (!response.clone.repositories.includes(repositoryId)) {
			throw new Error(`The scoped clone credential does not cover ${repositoryId}`);
		}
		return { username: response.clone.username, token: response.clone.token };
	}

	async dispose(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;
		let token = this.response?.clone.token;
		this.response = null;
		const loading = this.loading;
		this.loading = null;
		if (!token && loading) {
			try {
				token = (await loading).clone.token;
			} catch {
				/* No token was issued. */
			}
		}
		if (!token) return;
		try {
			await (this.options.fetchFn ?? fetch)(FLEET_PUSH_CREDENTIAL_REVOKE_URL, {
				method: 'DELETE',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${token}`,
					'User-Agent': 'ever-works-node',
					'X-GitHub-Api-Version': '2022-11-28'
				},
				signal: AbortSignal.timeout(5_000)
			});
		} catch {
			// GitHub also expires the narrowly scoped read token within an hour.
		} finally {
			this.options.logger?.unprotect(token);
		}
	}
}
