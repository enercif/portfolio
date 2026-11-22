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

type Tech = { name: string; color: string };

// M2M-Junction -> flache Liste; ID-Strings (nicht expandiert) fallen raus
export const unwrapTechnologies = (
	rows?: Array<string | { technologies_id?: string | Tech | null }> | null
) =>
	(rows ?? []).flatMap((row) => {
		const t = typeof row === 'object' ? row.technologies_id : null;
		return t && typeof t === 'object' ? [{ name: t.name, color: t.color }] : [];
	});
