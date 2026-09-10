import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { createDirectus, rest } from '@directus/sdk';
import type { Schema } from './directus-schema';

export function getDirectusInstancePublic(
	fetch:
		((input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>) | undefined
) {
	const options = fetch ? { globals: { fetch } } : {};
	const directus = createDirectus<Schema>(PUBLIC_DIRECTUS_URL, options).with(rest());
	return directus;
}

export function getDirectusAssetUrl(assetId: string) {
	return PUBLIC_DIRECTUS_URL + '/assets/' + assetId;
}
