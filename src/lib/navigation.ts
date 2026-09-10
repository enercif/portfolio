import { resolve } from '$app/paths';

export const navigationLinks = [
	{ name: 'Home', href: resolve('/') },
	{ name: 'Skills', href: resolve('/skills') },
	{ name: 'About Me', href: resolve('/about') },
	{ name: 'Contact', href: resolve('/contact') }
];
