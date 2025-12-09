// Settings Service - Feature toggles and app configuration
import { writable, derived } from 'svelte/store';
import { openDB } from 'idb';

const SETTINGS_KEY = 'app_settings';

const DEFAULT_FEATURES = {
	multiUser: {
		enabled: true,
		label: 'Multi-user Accounts',
		description: 'Invite and manage multiple collaborators per tenant.',
		impact: 'Disabling limits access to a single administrative account.'
	},
	whiteLabelBranding: {
		enabled: true,
		label: 'White Label Branding',
		description: 'Allow tenants to customize colors, domains, and customer-facing branding.',
		impact: 'Disabling reverts all branding to QuoteFlow defaults.'
	},
	personalizedLogo: {
		enabled: true,
		label: 'Personalized Logo',
		description: 'Upload tenant-specific logos for documents and portals.',
		impact: 'Disabling hides all custom logo upload controls.'
	},
	invoices: {
		enabled: true,
		label: 'Invoices',
		description: 'Issue invoices with payment due dates, statuses, and exports.',
		impact: 'Disabling removes invoice creation and listing pages.'
	},
	invoiceTemplates: {
		enabled: true,
		label: 'Invoice Templates',
		description: 'Enable reusable invoice layouts for consistent branding.',
		impact: 'Disabling hides the template editor and selector.'
	},
	quotes: {
		enabled: true,
		label: 'Quotes',
		description: 'Prepare and share quotes with approvals and customer view links.',
		impact: 'Disabling removes quote management screens.'
	},
	products: {
		enabled: true,
		label: 'Products',
		description: 'Manage product catalogues for use in quotes and invoices.',
		impact: 'Disabling hides product listings and selectors.'
	},
	loadProducts: {
		enabled: true,
		label: 'Load Products',
		description: 'Allow syncing external catalogues into the product library.',
		impact: 'Disabling removes product import/update workflows.'
	},
	fahrrad: {
		enabled: true,
		label: 'Fahrrad Stories',
		description: 'Publish Fahrrad editorial experiences with linked merchandise.',
		impact: 'Disabling hides Fahrrad authoring and preview flows.'
	},
	blogs: {
		enabled: true,
		label: 'Blogs',
		description: 'Write and publish blog posts with featured media.',
		impact: 'Disabling removes all blogging interfaces.'
	},
	imageGallery: {
		enabled: true,
		label: 'Image Gallery',
		description: 'Host curated image galleries for marketing assets.',
		impact: 'Disabling hides gallery management and public displays.'
	},
	books: {
		enabled: true,
		label: 'Books',
		description: 'Manage and distribute digital books or catalogues.',
		impact: 'Disabling removes book listings and detail views.'
	},
	userManagement: {
		enabled: true,
		label: 'User Management',
		description: 'Admins can invite, suspend, and role-manage users.',
		impact: 'Disabling hides user list and invitation flows.'
	},
	localStorage: {
		enabled: true,
		label: 'Local Data Cache',
		description:
			'Cache data locally (localStorage + IndexedDB) for instant access and offline availability.',
		impact: 'Disabling forces all reads to hit the server (slower, requires internet).'
	},
	indexedDb: {
		enabled: true,
		label: 'IndexedDB Storage',
		description: 'Persist structured datasets in IndexedDB for offline use.',
		impact: 'Disabling clears and prevents IndexedDB writes.'
	},
	aiChat: {
		enabled: true,
		label: 'AI Chat',
		description: 'Expose conversational AI assistants within the workspace.',
		impact: 'Disabling hides chat panels tied to AI providers.'
	},
	aiConnections: {
		enabled: true,
		label: 'AI Connections',
		description: 'Manage multi-provider AI credentials and routing.',
		impact: 'Disabling hides provider configuration sections.'
	},
	onlineSales: {
		enabled: true,
		label: 'Online Sales',
		description: 'Enable e-commerce checkout flows and external storefronts.',
		impact: 'Disabling removes checkout and sales widgets.'
	},
	syncQueue: {
		enabled: true,
		label: 'Offline Operations',
		description: 'Queue changes when offline for automatic retry.',
		impact: 'Disabling will fail operations immediately when offline.'
	},
	advancedValidation: {
		enabled: true,
		label: 'Advanced Validation',
		description: 'Show detailed field-level error messages from the server.',
		impact: 'Disabling will show generic error messages only.'
	}
};

const BASE_PERFORMANCE_DEFAULTS = {
	cacheMaxSize: 10 * 1024 * 1024, // 10MB
	syncRetryDelay: 5000, // 5 seconds
	enableLogging: true
};

const cloneDefaultFeatures = () => {
	const result = {};
	Object.entries(DEFAULT_FEATURES).forEach(([key, value]) => {
		result[key] = { ...value };
	});
	return result;
};

const createDefaultSettings = () => ({
	features: cloneDefaultFeatures(),
	performance: { ...BASE_PERFORMANCE_DEFAULTS }
});

const ensureFeatureDefinition = (featureName, definition = {}) => {
	const defaults = DEFAULT_FEATURES[featureName];
	if (!defaults) {
		return {
			enabled: definition.enabled ?? false,
			label: definition.label || featureName,
			description: definition.description || '',
			impact: definition.impact || ''
		};
	}
	return {
		...defaults,
		...definition,
		enabled: definition.enabled ?? defaults.enabled
	};
};

const mergeFeaturesWithDefaults = (incoming = {}) => {
	const merged = cloneDefaultFeatures();
	Object.entries(incoming).forEach(([key, value]) => {
		merged[key] = ensureFeatureDefinition(key, value);
	});
	return merged;
};

// Load initial settings from localStorage
const loadSettings = () => {
	const base = createDefaultSettings();
	try {
		const stored = localStorage.getItem(SETTINGS_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return {
				...base,
				...parsed,
				features: mergeFeaturesWithDefaults(parsed.features),
				performance: { ...base.performance, ...(parsed.performance || {}) }
			};
		}
	} catch (error) {
		console.error('Error loading settings:', error);
	}
	return base;
};

// Create the settings store
const settingsStore = writable(loadSettings());

// Subscribe to save changes to localStorage
settingsStore.subscribe((value) => {
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
	} catch (error) {
		console.error('Error saving settings:', error);
	}
});

// Helper functions
export const isFeatureEnabled = (featureName) => {
	let result = false;
	settingsStore.subscribe((settings) => {
		if (!featureName) {
			result = false;
			return;
		}
		if (featureName in settings.features) {
			result = settings.features[featureName]?.enabled ?? false;
		} else {
			result = DEFAULT_FEATURES[featureName]?.enabled ?? false;
		}
	})();
	return result;
};

export const toggleFeature = (featureName) => {
	settingsStore.update((prev) => {
		const current = prev.features[featureName];
		const currentValue =
			current?.enabled ?? DEFAULT_FEATURES[featureName]?.enabled ?? false;
		return {
			...prev,
			features: {
				...prev.features,
				[featureName]: ensureFeatureDefinition(featureName, {
					...current,
					enabled: !currentValue
				})
			}
		};
	});
};

export const updateSetting = (path, value) => {
	settingsStore.update((prev) => {
		const newSettings = { ...prev };
		const keys = path.split('.');
		let current = newSettings;

		for (let i = 0; i < keys.length - 1; i++) {
			current[keys[i]] = { ...current[keys[i]] };
			current = current[keys[i]];
		}

		current[keys[keys.length - 1]] = value;
		return newSettings;
	});
};

export const resetToDefaults = () => {
	settingsStore.set(createDefaultSettings());
};

export const getCacheSize = () => {
	try {
		let totalSize = 0;
		for (let key in localStorage) {
			if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
				totalSize += localStorage[key].length + key.length;
			}
		}
		return totalSize;
	} catch {
		return 0;
	}
};

export const clearCache = async () => {
	try {
		const keysToRemove = [];
		for (let key in localStorage) {
			if (
				key.startsWith('cache_') ||
				key.startsWith('alias_') ||
				key.startsWith('draft_') ||
				key === 'offline_queue' ||
				key === 'validation_errors' ||
				key === 'sync_state'
			) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach((key) => localStorage.removeItem(key));

		try {
			const db = await openDB('app-db', 3);

			if (db.objectStoreNames.contains('products')) {
				const tx1 = db.transaction('products', 'readwrite');
				await tx1.store.clear();
				await tx1.done;
			}

			if (db.objectStoreNames.contains('users')) {
				const tx2 = db.transaction('users', 'readwrite');
				await tx2.store.clear();
				await tx2.done;
			}

			db.close();
		} catch (idbError) {
			console.warn('IndexedDB clear failed (may not exist):', idbError);
		}

		window.dispatchEvent(new CustomEvent('cacheCleared'));
		window.dispatchEvent(new CustomEvent('syncStatus'));

		return true;
	} catch (error) {
		console.error('Error clearing cache:', error);
		return false;
	}
};

export const getPendingQueueSize = () => {
	try {
		const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
		return queue.length;
	} catch {
		return 0;
	}
};

// Export a function that returns all the settings utilities
// This mimics the useSettings() hook from React
export const useSettings = () => {
	return {
		settings: settingsStore,
		isFeatureEnabled,
		toggleFeature,
		updateSetting,
		resetToDefaults,
		getCacheSize,
		clearCache,
		getPendingQueueSize
	};
};

// Also export the store directly
export const settings = settingsStore;
