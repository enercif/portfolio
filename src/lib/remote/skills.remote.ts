import { query } from '$app/server';
import { getDirectusInstancePrivate, unwrapTechnologies } from '$lib/directus/directus.server';
import { readItems } from '@directus/sdk';

export const getSkills = query(async () => {
	const directus = getDirectusInstancePrivate();
	const groups = await directus.request(
		readItems('skills', {
			fields: ['id', 'group', { technologies: [{ technologies_id: ['name', 'color'] }] }],
			sort: ['sort'],
			deep: { technologies: { _sort: ['sort'] } }
		})
	);
	return groups.map(({ id, group, technologies }) => ({
		id,
		group,
		skills: unwrapTechnologies(technologies)
	}));
});

export type Skill = Awaited<ReturnType<typeof getSkills>>[number];
