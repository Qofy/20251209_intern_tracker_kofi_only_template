// Utility Functions

// Create page URL (maintain compatibility with React version)
export function createPageUrl(pageName, params = {}) {
	// Map of page names to routes
	const pageRoutes = {
		Dashboard: '/dashboard',
		Customers: '/customers',
		AddEditCustomer: '/customers',
		Leads: '/leads',
		Companies: '/companies',
		Quotes: '/quotes',
		CreateQuote: '/quotes/create',
		EditQuote: '/quotes/edit',
		QuoteDetails: '/quote-details',
		Invoices: '/invoices',
		CreateInvoice: '/invoices/create',
		EditInvoice: '/invoices/edit',
		InvoiceDetails: '/invoice-details',
		InvoicesArchived: '/invoices/archived',
		InternCertificates: '/certificates',
		CreateInternCertificate: '/certificates/create',
		EditInternCertificate: '/certificates/edit',
		CertificateDetails: '/certificates',
		Products: '/products',
		CreateProduct: '/products/create',
		EditProduct: '/products/edit',
		Blogs: '/blogs',
		CreateBlog: '/blogs/create',
		EditBlog: '/blogs/edit',
		BlogDetails: '/blogs',
		BlogCategories: '/blogs/categories',
		CreateBlogCategory: '/blogs/categories/create',
		EditBlogCategory: '/blogs/categories/edit',
		BlogTags: '/blogs/tags',
		CreateBlogTag: '/blogs/tags/create',
		EditBlogTag: '/blogs/tags/edit',
		Books: '/books',
		CreateBook: '/books/create',
		EditBook: '/books/edit',
		BookDetails: '/books',
		Fahrrads: '/fahrrads',
		CreateFahrrad: '/fahrrads/create',
		EditFahrrad: '/fahrrads/edit',
		FahrradDetails: '/fahrrads',
		FahrradPreview: '/fahrrad-preview',
		Appointments: '/appointments',
		ReviewsManager: '/reviews-manager',
		CommentsManager: '/comments-manager',
		ContactsManager: '/contacts-manager',
		SalesDashboard: '/sales-dashboard',
		Settings: '/settings',
		AdvancedSettings: '/settings/advanced',
		TemplateSettings: '/settings/templates',
		UserManagement: '/user-management',
		Login: '/login',
		Register: '/register',
		ForgotPassword: '/forgot-password',
		ResetPassword: '/reset-password',
		Profile: '/profile',
		PublicQuoteView: '/public/quote',
		PublicInvoiceView: '/public/invoice',
		PublicBookView: '/public/book',
		InvoiceView: '/invoice-view',
		InvoiceCart: '/invoice-cart',
		PaymentConfirmation: '/payment-confirmation',
		PaymentSuccess: '/payment-success',
		PaymentCancel: '/payment-cancel'
	};

	let route = pageRoutes[pageName] || `/${pageName.toLowerCase()}`;

        // Add remaining params as query parameters
        const queryString = new URLSearchParams(params).toString();
        return queryString ? `${route}?${queryString}` : route;
}

// Format currency
export function formatCurrency(amount, currency = 'USD') {
	if (typeof amount !== 'number') return '$0.00';
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency
	}).format(amount);
}

// Format date
export function formatDate(date, format = 'short') {
	if (!date) return '';
	const d = new Date(date);
	if (isNaN(d.getTime())) return '';

	const formats = {
		short: { year: 'numeric', month: 'short', day: 'numeric' },
		long: { year: 'numeric', month: 'long', day: 'numeric' },
		time: { hour: '2-digit', minute: '2-digit' },
		full: {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}
	};

	return new Intl.DateTimeFormat('en-US', formats[format] || formats.short).format(d);
}

// Debounce function
export function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// Throttle function
export function throttle(func, limit) {
	let inThrottle;
	return function executedFunction(...args) {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

// Generate unique ID
export function generateId() {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Deep clone object
export function deepClone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

// Check if online
export function isOnline() {
	return typeof window !== 'undefined' ? navigator.onLine : true;
}

// Safe JSON parse
export function safeJSONParse(str, fallback = null) {
	try {
		return JSON.parse(str);
	} catch {
		return fallback;
	}
}

// Truncate string
export function truncate(str, length = 50, suffix = '...') {
	if (!str || str.length <= length) return str;
	return str.substring(0, length) + suffix;
}

// Capitalize first letter
export function capitalize(str) {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// Sleep/delay
export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get file extension
export function getFileExtension(filename) {
	if (!filename) return '';
	return filename.split('.').pop().toLowerCase();
}

// Check if valid email
export function isValidEmail(email) {
	const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return re.test(email);
}

// Generate initials from name
export function getInitials(name) {
	if (!name) return '';
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

// Calculate percentage
export function calculatePercentage(value, total) {
	if (!total || total === 0) return 0;
	return Math.round((value / total) * 100);
}
