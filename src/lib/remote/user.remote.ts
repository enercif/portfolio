import { query } from '$app/server';
import { getDirectusInstancePrivate } from '$lib/directus/directus.server';
import { readSingleton } from '@directus/sdk';

export const getUser = query(async () => {
	const directus = getDirectusInstancePrivate();
	return await directus.request(
		readSingleton('user', {
			fields: ['name', { signature: ['id'] }]
		})
	);
});

export type User = Awaited<ReturnType<typeof getUser>>;
