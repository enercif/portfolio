import { getProjects } from '$lib/remote/project.remote';
import { getUser } from '$lib/remote/user.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		projects: await getProjects(),
		user: await getUser()
	};
};
