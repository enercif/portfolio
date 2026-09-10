import { getSkills } from '$lib/remote/skills.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		skills: await getSkills()
	};
};
