<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { goto } from '@roxi/routify';
	import SettingsProvider from '$lib/contexts/SettingsContext.svelte';
	import AuthProvider from '$lib/contexts/AuthContext.svelte';
	import {
		BarChart2,
		BookOpen,
		Building,
		Calendar,
		Edit3,
		FileText,
		Folder,
		GraduationCap,
		LayoutDashboard,
		LogOut,
		Mail,
		Menu,
		MessageSquare,
		Package,
		Plus,
		Receipt,
		Settings,
		Star,
		Tag,
		Users,
		UserPlus,
		X,
		Archive
	} from 'lucide-svelte';
	import { auth } from '$lib/stores/auth';
	import { currentCompany } from '$lib/stores/company';
	import { createPageUrl } from '$lib/utils';
	import ValidationErrorsFloat from '$lib/components/ui/ValidationErrorsFloat.svelte';
	import SessionTimeoutHandler from '$lib/components/auth/SessionTimeoutHandler.svelte';

	// Lightweight page store replacement (Routify 3 doesn't expose SvelteKit's $page)
	const page = writable({ path: '' });

	onMount(() => {
		const updatePath = () => page.set({ path: window.location.pathname });
		updatePath();
		window.addEventListener('popstate', updatePath);
		return () => window.removeEventListener('popstate', updatePath);
	});

	const NAVIGATION_CONFIG = [
		{
			title: 'Dashboard',
			url: createPageUrl('Dashboard'),
			icon: LayoutDashboard
		},
		{
			title: 'Administration',
			icon: Settings,
			subItems: [
				{
					title: 'User Management',
					url: createPageUrl('UserManagement'),
					icon: Users,
					permission: 'manage_users'
				},
				{
					title: 'Invoice Templates',
					url: createPageUrl('TemplateSettings'),
					icon: FileText,
					permission: 'manage_system_settings'
				},
				{
					title: 'Invoices Archived',
					url: createPageUrl('InvoicesArchived'),
					icon: Archive,
					permission: 'manage_system_settings'
				},
				{ title: 'Companies', url: createPageUrl('Companies'), icon: Building }
			]
		},
		{ title: 'Customers', url: createPageUrl('Customers'), icon: Users },
		{ title: 'Quotes', url: createPageUrl('Quotes'), icon: FileText },
		{ title: 'Invoices', url: createPageUrl('Invoices'), icon: Receipt },
		{
			title: 'Sales',
			icon: BarChart2,
			subItems: [
				{
					title: 'Sales Overview',
					url: createPageUrl('SalesDashboard'),
					icon: BarChart2
				},
				{ title: 'Leads', url: createPageUrl('Leads'), icon: UserPlus },
				{ title: 'Products', url: createPageUrl('Products'), icon: Package },
				{ title: 'Books', url: createPageUrl('Books'), icon: BookOpen },
				{ title: 'Fahrrad', url: createPageUrl('Fahrrads'), icon: Package },
				{
					title: 'Appointments',
					url: createPageUrl('Appointments'),
					icon: Calendar
				}
			]
		},
		{
			title: 'Blogs',
			icon: Edit3,
			subItems: [
				{ title: 'All Posts', url: createPageUrl('Blogs'), icon: Edit3 },
				{
					title: 'Categories',
					url: createPageUrl('BlogCategories'),
					icon: Folder
				},
				{ title: 'Tags', url: createPageUrl('BlogTags'), icon: Tag }
			]
		},
		{
			title: 'Interactions',
			icon: MessageSquare,
			subItems: [
				{ title: 'Reviews', url: createPageUrl('ReviewsManager'), icon: Star },
				{
					title: 'Comments',
					url: createPageUrl('CommentsManager'),
					icon: MessageSquare
				},
				{ title: 'Contacts', url: createPageUrl('ContactsManager'), icon: Mail }
			]
		},
		{
			title: 'Intern Certificates',
			url: createPageUrl('InternCertificates'),
			icon: GraduationCap
		},
		{ title: 'Settings', url: createPageUrl('Settings'), icon: Settings }
	];

	let sidebarOpen = false;
	let aiChatOpen = false;
	let contextData = null;
	let pageType = null;
	let expandedNavItems = {};
	let onlineStatus = {
		online: true,
		pending: 0,
		isSyncing: false,
		nextRetryIn: 0,
		failureCount: 0
	};

	// Filter navigation items based on permissions
	$: navigationItems = NAVIGATION_CONFIG.map((item) => {
		if (item.subItems) {
			const filteredSubItems = item.subItems.filter(
				(sub) => !sub.permission || $auth.permissions.has(sub.permission)
			);
			if (filteredSubItems.length === 0) {
				return null;
			}
			return { ...item, subItems: filteredSubItems };
		}
		if (item.permission && !$auth.permissions.has(item.permission)) {
			return null;
		}
		return item;
	}).filter(Boolean);

	// Initialize auth
	onMount(() => {
		auth.init();

		// Listen for AI context updates
		const handleContextUpdate = (event) => {
			contextData = event.detail.contextData;
			pageType = event.detail.pageType;
		};

		// Listen for sync status updates
		const updateOnlineStatus = () => {
			if (typeof window === 'undefined') return;
			onlineStatus = {
				...onlineStatus,
				online: navigator.onLine,
				pending: JSON.parse(localStorage.getItem('offline_queue') || '[]').length
			};
		};

		const handleSyncStatus = (event) => {
			onlineStatus = event.detail;
		};

		window.addEventListener('updateAiContext', handleContextUpdate);
		window.addEventListener('online', updateOnlineStatus);
		window.addEventListener('offline', updateOnlineStatus);
		window.addEventListener('syncStatus', handleSyncStatus);

		updateOnlineStatus();

		return () => {
			window.removeEventListener('updateAiContext', handleContextUpdate);
			window.removeEventListener('online', updateOnlineStatus);
			window.removeEventListener('offline', updateOnlineStatus);
			window.removeEventListener('syncStatus', handleSyncStatus);
		};
	});

	// Close sidebar on navigation (mobile)
	$: if ( $page?.path) {
		sidebarOpen = false;
	}

	function isNavItemActive(item) {
		const pathname = $page?.path || '';
		 if (!pathname ){
			return '';
		 }
		if (item.subItems) {
			return item.subItems.some((sub) => pathname.startsWith(sub.url));
		}
		return pathname.startsWith(item.url);
	}

	function toggleNavItem(title) {
		expandedNavItems[title] = !expandedNavItems[title];
	}

	function handleLogout() {
		auth.logout();
		window.location.href = '/login';
	}

	// Get sync status banner message
	$: statusBannerVisible = !onlineStatus.online || onlineStatus.pending > 0;
	$: statusBannerBg = !onlineStatus.online
		? 'bg-red-600'
		: onlineStatus.isSyncing
			? 'bg-blue-600'
			: 'bg-amber-500';
	$: statusBannerMessage = !onlineStatus.online
		? 'Offline — changes will sync when you are back online'
		: onlineStatus.isSyncing
			? `Syncing ${onlineStatus.pending} change${onlineStatus.pending === 1 ? '' : 's'}...`
			: onlineStatus.nextRetryIn > 0
				? (() => {
						const minutes = Math.floor(onlineStatus.nextRetryIn / 60);
						const seconds = onlineStatus.nextRetryIn % 60;
						const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
						return `${onlineStatus.pending} pending — retrying in ${timeStr}`;
					})()
				: onlineStatus.pending > 0
					? `${onlineStatus.pending} change${onlineStatus.pending === 1 ? '' : 's'} pending`
					: 'Syncing...';

	$: onlineIndicatorColor = !onlineStatus.online
		? '#dc2626'
		: onlineStatus.pending > 0
			? '#f59e0b'
			: '#16a34a';
	$: onlineIndicatorTitle = !onlineStatus.online
		? 'Offline'
		: onlineStatus.pending > 0
			? `Syncing (${onlineStatus.pending})`
			: 'Online';

	// Check if current page is a public/auth page (no sidebar needed)
	$: isAuthPage = (() => {
		// Check URL path from browser location as fallback
		const currentPath = $page?.path || (typeof window !== 'undefined' ? window.location.pathname : '');
		const authPages = [
			'/login',
			'/register',
			'/forgot-password',
			'/reset-password',
			'/public/invoice',
			'/public/quote',
			'/public/book',
			'/payment-success',
			'/payment-cancel',
			'/payment-confirmation',
			'/invoice-cart'
		];
		return authPages.some((path) => currentPath.startsWith(path));
	})();
</script>

<svelte:head>
	<style>
		.neumorphic-card {
			background: #e0e0e0;
			border-radius: 20px;
			box-shadow:
				8px 8px 16px #bebebe,
				-8px -8px 16px #ffffff;
		}
		.neumorphic-inset {
			background: #e0e0e0;
			border-radius: 15px;
			box-shadow:
				inset 4px 4px 8px #bebebe,
				inset -4px -4px 8px #ffffff;
		}
		.neumorphic-button {
			background: #e0e0e0;
			border-radius: 12px;
			box-shadow:
				4px 4px 8px #bebebe,
				-4px -4px 8px #ffffff;
			transition: all 0.2s ease;
			border: none;
		}
		.neumorphic-button:hover {
			box-shadow:
				2px 2px 4px #bebebe,
				-2px -2px 4px #ffffff;
		}
		.neumorphic-button:active {
			box-shadow:
				inset 2px 2px 4px #bebebe,
				inset -2px -2px 4px #ffffff;
		}
		.neumorphic-button-active {
			box-shadow:
				inset 3px 3px 6px #bebebe,
				inset -3px -3px 6px #ffffff;
		}
		.neumorphic-nav-active {
			box-shadow:
				inset 3px 3px 6px #bebebe,
				inset -3px -3px 6px #ffffff;
		}
		.shadow-inner-intense {
			box-shadow:
				inset 6px 6px 12px #bebebe,
				inset -6px -6px 12px #ffffff;
		}
		.text-primary {
			color: #4a4a4a;
		}
		.text-secondary {
			color: #6a6a6a;
		}
		.text-muted {
			color: #8a8a8a;
		}
		.status-draft,
		.status-pending {
			background: #d4d4d4;
			color: #6a6a6a;
		}
		.status-sent,
		.status-approved,
		.status-active,
		.status-published,
		.status-new {
			background: #c8d4e8;
			color: #4a6ba8;
		}
		.status-paid {
			background: #c8e8d4;
			color: #4a8a6b;
		}
		.status-overdue,
		.status-rejected,
		.status-cancelled,
		.status-expired,
		.status-inactive,
		.status-sold_out,
		.status-archived {
			background: #e8c8c8;
			color: #a84a4a;
		}
		* {
			-webkit-font-smoothing: antialiased;
			-moz-osx-font-smoothing: grayscale;
		}
	</style>
</svelte:head>

<SettingsProvider>
<AuthProvider>

<div class="min-h-screen" style="background-color: #e0e0e0">
	<!-- Session Timeout Handler - needed on all pages -->
	<SessionTimeoutHandler />

	{#if isAuthPage}
		<!-- Auth pages: no sidebar, just content -->
		<slot />
	{:else}
		<!-- Regular pages: full layout with sidebar -->
		<div class="relative flex h-screen">
			<!-- Mobile Menu Button -->
			<button
				on:click={() => (sidebarOpen = !sidebarOpen)}
				class="fixed z-50 p-3 shadow-lg lg:hidden top-4 left-4 neumorphic-button"
			>
				{#if sidebarOpen}
					<X class="w-5 h-5 text-primary" />
				{:else}
					<Menu class="w-5 h-5 text-primary" />
				{/if}
			</button>

			<!-- Mobile Overlay -->
			{#if sidebarOpen}
				<div
					class="fixed inset-0 z-30 bg-black lg:hidden bg-opacity-40"
					on:click={() => (sidebarOpen = false)}
					role="presentation"
				></div>
			{/if}

			<!-- Sidebar -->
			<aside
				class="{sidebarOpen
					? 'translate-x-0'
					: '-translate-x-full'} lg:translate-x-0 fixed lg:static w-64 h-full p-4 flex-shrink-0 transition-transform duration-300 ease-in-out z-40 bg-[#e0e0e0]"
				style="overflow-y: auto"
			>
			<div class="p-6 mb-6 neumorphic-card">
				<div class="text-center">
					<div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 neumorphic-inset">
						<Receipt class="w-8 h-8 text-primary" />
					</div>
					<h1 class="mb-1 text-xl font-bold text-primary">QuoteFlow</h1>
					<p class="text-sm text-secondary">Business Management</p>
				</div>
				<div class="pt-4 mt-4 border-t border-gray-300">
					<p class="mb-2 text-xs tracking-wider text-center uppercase text-secondary">
						Current Company
					</p>
					<a
						href={createPageUrl('Companies')}
						on:click|preventDefault={() => $goto(createPageUrl('Companies'))}
						class="neumorphic-button w-full text-center p-2.5 block hover:shadow-none transition-all"
					>
						{#if $currentCompany}
							<div class="flex items-center justify-center gap-2">
								<Building class="w-4 h-4 text-primary" />
								<span class="font-semibold truncate text-primary">{$currentCompany.name}</span>
							</div>
						{:else}
							<div class="flex items-center justify-center gap-2 text-red-500">
								<Building class="w-4 h-4" />
								<span class="font-semibold">Select Company</span>
							</div>
						{/if}
					</a>
				</div>
			</div>

			<div class="p-4 neumorphic-card">
				<nav class="space-y-2">
					{#each navigationItems as item}
						{#if item.subItems}
							<div>
								<button
									on:click={() => toggleNavItem(item.title)}
									class="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 {isNavItemActive(
										item
									)
										? 'neumorphic-nav-active text-primary'
										: 'text-secondary hover:text-primary'}"
								>
									<div class="flex items-center gap-3">
										<svelte:component this={item.icon} class="w-5 h-5" />
										<span class="font-medium">{item.title}</span>
									</div>
									<svg
										class="w-4 h-4 transition-transform {expandedNavItems[item.title]
											? 'rotate-180'
											: ''}"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
								{#if expandedNavItems[item.title]}
									<div class="pl-6 mt-2 space-y-2">
										{#each item.subItems as subItem}
											<a
												href={subItem.url}
												on:click|preventDefault={() => $goto(subItem.url)}
												class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 {($page?.path || '').startsWith(
													subItem.url
												)
													? 'neumorphic-nav-active text-primary'
													: 'text-secondary hover:text-primary'}"
											>
												<svelte:component this={subItem.icon} class="w-4 h-4" />
												<span class="text-sm font-medium">{subItem.title}</span>
											</a>
										{/each}
									</div>
								{/if}
							</div>
						{:else}
							<a
								href={item.url}
								on:click|preventDefault={() => $goto(item.url)}
								class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {isNavItemActive(
									item
								)
									? 'neumorphic-nav-active text-primary'
									: 'text-secondary hover:text-primary'}"
							>
								<svelte:component this={item.icon} class="w-5 h-5" />
								<span class="font-medium">{item.title}</span>
							</a>
						{/if}
					{/each}
				</nav>

				<div class="pt-6 mt-6" style="border-top: 1px solid #d4d4d4">
					<a
						href={createPageUrl('CreateBlog')}
						on:click|preventDefault={() => $goto(createPageUrl('CreateBlog'))}
						class="flex items-center justify-center w-full gap-2 py-3 mb-2 font-medium neumorphic-button text-primary"
					>
						<Plus class="w-5 h-5" /> New Blog Post
					</a>
					<a
						href={createPageUrl('CreateBook')}
						on:click|preventDefault={() => $goto(createPageUrl('CreateBook'))}
						class="flex items-center justify-center w-full gap-2 py-3 mb-2 font-medium neumorphic-button text-primary"
					>
						<Plus class="w-5 h-5" /> New Book
					</a>
					<a
						href={createPageUrl('CreateQuote')}
						on:click|preventDefault={() => $goto(createPageUrl('CreateQuote'))}
						class="flex items-center justify-center w-full gap-2 py-3 mb-6 font-medium neumorphic-button text-primary"
					>
						<Plus class="w-5 h-5" /> New Quote
					</a>

					<!-- Logout Button -->
					<button
						on:click={handleLogout}
						class="flex items-center justify-center w-full gap-2 py-3 font-medium text-red-600 neumorphic-button hover:text-red-700"
					>
						<LogOut class="w-5 h-5" /> Logout
					</button>
				</div>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 p-6 overflow-y-auto lg:ml-0">
			<!-- Online Indicator -->
			<div title={onlineIndicatorTitle} style="position: fixed; top: 12px; right: 12px; z-index: 50">
				<div
					style="width: 12px; height: 12px; border-radius: 9999px; background: {onlineIndicatorColor}; box-shadow: 0 0 0 2px rgba(0,0,0,0.05)"
				></div>
			</div>

			<!-- Status Banner -->
			{#if statusBannerVisible}
				<div
					class="fixed top-4 left-1/2 -translate-x-1/2 {statusBannerBg} text-white px-4 py-2 rounded shadow-lg z-50 flex items-center gap-2"
					style="box-shadow: 0 8px 16px rgba(0,0,0,0.15)"
				>
					<span
						class="inline-block w-2 h-2 rounded-full bg-white {onlineStatus.isSyncing
							? 'animate-pulse'
							: ''}"
					></span>
					<span class="text-sm font-medium">{statusBannerMessage}</span>
				</div>
			{/if}

			<!-- AI Assistant Toggle Button (placeholder for future) -->
			<button
				on:click={() => (aiChatOpen = !aiChatOpen)}
				class="fixed z-30 flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-lg right-4 top-4 neumorphic-button"
			>
				<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
				<span class="text-primary">AI Assistant</span>
				{#if pageType}
					<span class="hidden text-xs text-secondary sm:inline">
						{pageType.charAt(0).toUpperCase() + pageType.slice(1)} Context
					</span>
				{/if}
			</button>

			<div class="mx-auto max-w-7xl">
				<slot />
			</div>
		</main>
		</div>

		<!-- Validation Errors Float -->
		<ValidationErrorsFloat />
	{/if}
</div>
</AuthProvider>
</SettingsProvider>
