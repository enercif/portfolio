import { getUser } from '$lib/remote/user.remote';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	return {
		user: await getUser()
	};
};
