import { describe, expect, it, vi } from 'vitest';
import type { ItemData } from '../../common/index.js';
import { captureScreenshots } from '../screenshots.js';

describe('captureScreenshots', () => {
	it('makes a captured screenshot primary even when an item already has an image URL', async () => {
		vi.useFakeTimers();
		try {
			const getSmartImage = vi.fn().mockResolvedValue({ primaryImage: '/api/uploads/screenshots/captured.png' });
			const item = {
				name: 'Fountain',
				source_url: 'https://www.fountain.com/',
				images: ['https://www.fountain.com/old-image.png']
			} as ItemData;
			const capture = captureScreenshots([item], {
				screenshotFacade: { isAvailable: () => true, getSmartImage },
				facadeOptions: { userId: 'user-1', workId: 'work-1' },
				signal: new AbortController().signal,
				logger: { warn: vi.fn() }
			});
			await vi.runAllTimersAsync();

			expect(await capture).toEqual({ status: 'completed', errors: [] });
			expect(getSmartImage).toHaveBeenCalledWith(
				{ url: 'https://www.fountain.com/', itemName: 'Fountain' },
				{ userId: 'user-1', workId: 'work-1' }
			);
			expect(item.images).toEqual([
				'/api/uploads/screenshots/captured.png',
				'https://www.fountain.com/old-image.png'
			]);
		} finally {
			vi.useRealTimers();
		}
	});
});
