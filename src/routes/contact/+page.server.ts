import { getDirectusInstancePrivate } from '$lib/directus/directus.server';
import { readSingleton } from '@directus/sdk';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { email } = await getDirectusInstancePrivate().request(
		readSingleton('user', { fields: ['email'] })
	);
	return { email: Buffer.from(email).toString('base64') };
};
