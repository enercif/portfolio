import { query } from '$app/server';
import { getDirectusInstancePrivate } from '$lib/directus/directus.server';
import { readItems } from '@directus/sdk';

export const getSkills = query(async () => {
	const directus = getDirectusInstancePrivate();
	return await directus.request(
		readItems('skills', {
			fields: ['id', 'group', 'skills']
		})
	);
});

export type Skill = Awaited<ReturnType<typeof getSkills>>[number];
