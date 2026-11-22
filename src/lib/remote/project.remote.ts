import { query } from '$app/server';
import { getDirectusInstancePrivate, unwrapTechnologies } from '$lib/directus/directus.server';
import { readItems } from '@directus/sdk';

export const getProjects = query(async () => {
	const directus = getDirectusInstancePrivate();
	const projects = await directus.request(
		readItems('projects', {
			fields: [
				'id',
				'name',
				'link',
				'description',
				{ technologies: [{ technologies_id: ['name', 'color'] }] },
				{ images: [{ directus_files_id: ['id'] }] }
			],
			sort: ['sort'],
			deep: { technologies: { _sort: ['sort'] }, images: { _sort: ['sort'] } }
		})
	);
	return projects.map(({ technologies, ...project }) => ({
		...project,
		tags: unwrapTechnologies(technologies)
	}));
});

export type Project = Awaited<ReturnType<typeof getProjects>>[number];
