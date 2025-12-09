import { readable } from 'svelte/store';
import * as routify from '@roxi/routify';

// Minimal $page-like store for Routify 3 consumers (path only)
export const page = readable({ path: '' }, set => {
	if (typeof window === 'undefined') return;

	const update = () => set({ path: window.location.pathname });
	update();
	window.addEventListener('popstate', update);
	return () => window.removeEventListener('popstate', update);
});

// Re-export the rest of Routify so existing imports keep working
export const goto = routify.goto;
export const Router = routify.Router;
export const url = routify.url;
export const params = routify.params;
export const setParams = routify.setParams;
export const updateParams = routify.updateParams;
export const isActive = routify.isActive;
export const isActiveFragment = routify.isActiveFragment;
export const AddressReflector = routify.AddressReflector;
export const LocalStorageReflector = routify.LocalStorageReflector;
export const InternalReflector = routify.InternalReflector;
export const createRouter = routify.createRouter;
export const RouterClass = routify.RouterClass;
export const appInstance = routify.appInstance;
export const Component = routify.Component;
