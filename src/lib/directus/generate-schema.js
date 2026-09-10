import { execSync } from 'child_process';
import 'dotenv/config';

let hasError = false;

const url = process.env.PUBLIC_DIRECTUS_URL;
if (!url) {
	console.error('PUBLIC_DIRECTUS_URL is not set.');
	hasError = true;
}

const token = process.env.PRIVATE_DIRECTUS_ADMIN_TOKEN;
if (!token) {
	console.error('PRIVATE_DIRECTUS_ADMIN_TOKEN is not set.');
	hasError = true;
}

if (hasError) process.exit(1);

execSync(
	`directus-sdk-typegen --url ${url} --token ${token} --output ./src/lib/directus/directus-schema.ts`,
	{
		stdio: 'inherit'
	}
);
