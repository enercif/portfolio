import { PRIVATE_DIRECTUS_APP_TOKEN } from '$env/static/private';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { createDirectus, rest, staticToken } from '@directus/sdk';
import type { Schema } from './directus-schema';

export function getDirectusInstancePrivate() {
	const directus = createDirectus<Schema>(PUBLIC_DIRECTUS_URL)
		.with(rest())
		.with(staticToken(PRIVATE_DIRECTUS_APP_TOKEN));
	return directus;
}
