// Blog Service - Blog API calls and caching (localStorage-backed)

const CACHE_KEY = 'cache_blogs';

const nowIso = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function sortBy(list, sort) {
	if (!sort) return list;
	let field = sort;
	let dir = 1;
	if (sort.startsWith('-')) {
		field = sort.slice(1);
		dir = -1;
	}
	return [...list].sort((a, b) =>
		a[field] > b[field] ? dir : a[field] < b[field] ? -dir : 0
	);
}

function getCache() {
	try {
		return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
	} catch {
		return [];
	}
}

function setCache(data) {
	localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
}

function upsertCache(rec) {
	const list = getCache();
	const idx = list.findIndex((r) => r.id === rec.id);
	if (idx >= 0) list[idx] = { ...list[idx], ...rec };
	else list.push(rec);
	setCache(list);
}

function deleteFromCache(id) {
	const list = getCache().filter((r) => r.id !== id);
	setCache(list);
}

export const Blog = {
	async list(sort, limit) {
		const data = getCache();
		const sorted = sort ? sortBy(data, sort) : data;
		return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
	},

	async filter(criteria = {}, sort) {
		const all = await this.list();
		const filtered = all.filter((item) =>
			Object.entries(criteria).every(([k, v]) => item[k] === v)
		);
		return sort ? sortBy(filtered, sort) : filtered;
	},

	async get(id) {
		const data = getCache();
		return data.find((r) => r.id === id) || null;
	},

	async create(payload) {
		const rec = {
			id: uid(),
			created_date: nowIso(),
			last_updated: nowIso(),
			...payload
		};
		upsertCache(rec);
		return rec;
	},

	async update(id, data) {
		const rec = { id, ...data, last_updated: nowIso() };
		upsertCache(rec);
		return rec;
	},

	async delete(id) {
		deleteFromCache(id);
		return true;
	}
};

// Helper to create entity with localStorage backend
function makeLocalEntity(key) {
	const cacheKey = `cache_${key}`;

	function getEntityCache() {
		try {
			return JSON.parse(localStorage.getItem(cacheKey) || '[]');
		} catch {
			return [];
		}
	}

	function setEntityCache(data) {
		localStorage.setItem(cacheKey, JSON.stringify(data || []));
	}

	function upsertEntityCache(rec) {
		const list = getEntityCache();
		const idx = list.findIndex((r) => r.id === rec.id);
		if (idx >= 0) list[idx] = { ...list[idx], ...rec };
		else list.push(rec);
		setEntityCache(list);
	}

	function deleteFromEntityCache(id) {
		const list = getEntityCache().filter((r) => r.id !== id);
		setEntityCache(list);
	}

	return {
		async list(sort, limit) {
			const data = getEntityCache();
			const sorted = sort ? sortBy(data, sort) : data;
			return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
		},
		async filter(criteria = {}, sort) {
			const all = await this.list();
			const filtered = all.filter((item) =>
				Object.entries(criteria).every(([k, v]) => item[k] === v)
			);
			return sort ? sortBy(filtered, sort) : filtered;
		},
		async get(id) {
			const data = getEntityCache();
			return data.find((r) => r.id === id) || null;
		},
		async create(payload) {
			const rec = {
				id: uid(),
				created_date: nowIso(),
				last_updated: nowIso(),
				...payload
			};
			upsertEntityCache(rec);
			return rec;
		},
		async update(id, data) {
			const rec = { id, ...data, last_updated: nowIso() };
			upsertEntityCache(rec);
			return rec;
		},
		async delete(id) {
			deleteFromEntityCache(id);
			return true;
		}
	};
}

// BlogCategory and BlogTag entities
export const BlogCategory = makeLocalEntity('blog_categories');
export const BlogTag = makeLocalEntity('blog_tags');
