import { query } from '$app/server';
import { getDirectusInstancePrivate } from '$lib/directus/directus.server';
import { readItems } from '@directus/sdk';

export const getProjects = query(async () => {
	const directus = getDirectusInstancePrivate();
	return await directus.request(
		readItems('projects', {
			fields: ['id', 'name', 'slug', 'tags', 'description', { thumbnail: ['id'] }]
		})
	);
});

export type Project = Awaited<ReturnType<typeof getProjects>>[number];
