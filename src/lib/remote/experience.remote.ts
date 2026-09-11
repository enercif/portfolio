import { query } from '$app/server';
import { getDirectusInstancePrivate } from '$lib/directus/directus.server';
import { readItems } from '@directus/sdk';

export const getExperience = query(async () => {
	const directus = getDirectusInstancePrivate();
	return await directus.request(
		readItems('experience', {
			fields: ['name', 'position', 'id', 'description', 'start', 'end'],
			sort: ['-start']
		})
	);
});

export type Experience = Awaited<ReturnType<typeof getExperience>>;
