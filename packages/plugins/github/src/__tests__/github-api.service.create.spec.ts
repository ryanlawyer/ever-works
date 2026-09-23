import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('libsodium-wrappers', () => ({
	default: { ready: Promise.resolve() }
}));

const getAuthenticated = vi.fn();
const get = vi.fn();
const createForAuthenticatedUser = vi.fn();

vi.mock('octokit', () => ({
	Octokit: class {
		rest = {
			users: { getAuthenticated },
			repos: { get, createForAuthenticatedUser }
		};
	},
	RequestError: class RequestError extends Error {
		status = 404;
	}
}));

const { GitHubApiService } = await import('../github-api.service.js');
const { RequestError } = await import('octokit');

describe('GitHubApiService.createRepository', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getAuthenticated.mockResolvedValue({ data: { login: 'owner' } });
		get.mockRejectedValue(new RequestError('Not Found', 404, {} as never));
		createForAuthenticatedUser.mockResolvedValue({
			data: {
				owner: { login: 'owner' },
				name: 'work',
				full_name: 'owner/work',
				default_branch: 'main',
				private: true,
				html_url: 'https://github.com/owner/work',
				clone_url: 'https://github.com/owner/work.git'
			}
		});
	});

	it('keeps a long Idea description within the GitHub repository limit', async () => {
		const description = `Idea\n${'😀 long description '.repeat(30)}`;
		await new GitHubApiService().createRepository(
			{ name: 'work', description, isPrivate: true },
			'token'
		);

		const sent = createForAuthenticatedUser.mock.calls[0]?.[0]?.description as string;
		expect(Array.from(sent)).toHaveLength(350);
		expect(sent).not.toContain('\n');
		expect(sent).toMatch(/^Idea 😀/);
	});
});
