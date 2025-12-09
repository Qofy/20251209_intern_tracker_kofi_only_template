<script>
	import { FileText, Settings as SettingsIcon, Info, Eye, Pencil } from 'lucide-svelte';
	import TemplateManager from '$lib/components/templates/TemplateManager.svelte';
	import TemplatePreviewPanel from '$lib/components/templates/TemplatePreviewPanel.svelte';
	import Editor from '$lib/../editor/pages/Editor.svelte';

	let activeTab = 'templates';

	const tabs = [
		{ key: 'templates', label: 'Templates', icon: FileText },
		{ key: 'editor', label: 'Page Builder', icon: Pencil },
		{ key: 'preview', label: 'Preview', icon: Eye },
		{ key: 'about', label: 'About', icon: Info },
	];

	const features = [
		{ title: 'Multiple Layouts', description: 'Choose from professional invoice layouts (currently: Aioo)', icon: '🎨' },
		{ title: 'Multi-Language', description: 'Generate invoices in English, Swedish, and more', icon: '🌍' },
		{ title: 'QR Codes', description: 'Automatically embed QR codes for easy mobile access', icon: '📱' },
		{ title: 'Customizable', description: 'Configure colors, footer text, and display options', icon: '⚙️' },
		{ title: 'Default Template', description: 'Set a default template for quick invoice generation', icon: '⭐' },
		{ title: 'Professional Output', description: 'High-quality PDF files ready for printing or emailing', icon: '📄' },
	];
</script>

<svelte:head>
	<title>Invoice Template Settings</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 max-w-7xl">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
			<SettingsIcon class="w-8 h-8 text-primary" />
			Invoice Template Settings
		</h1>
		<p class="text-gray-600 mt-2">
			Manage invoice templates for PDF generation with klirr
		</p>
	</div>

	<!-- Tabs -->
	<div class="flex flex-wrap gap-2 mb-6 border-b border-gray-300">
		{#each tabs as { key, label, icon: Icon }}
			<button
				on:click={() => activeTab = key}
				class="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all rounded-t-lg {activeTab === key
					? 'bg-[#e0e0e0] text-primary border border-gray-300 border-b-0 shadow-inner'
					: 'text-secondary border border-transparent hover:text-primary hover:border-gray-200'}"
			>
				<svelte:component this={Icon} class="w-4 h-4" />
				{label}
			</button>
		{/each}
	</div>

	<!-- Content -->
	<div class="space-y-6">
		{#if activeTab === 'templates'}
			<TemplateManager />
		{:else if activeTab === 'editor'}
			<div class="neumorphic-card p-0 overflow-hidden min-h-[800px]">
				<Editor />
			</div>
		{:else if activeTab === 'preview'}
			<TemplatePreviewPanel />
		{:else if activeTab === 'about'}
			<!-- About Tab -->
			<div class="space-y-6">
				<!-- Overview -->
				<div class="neumorphic-card p-6">
					<h2 class="text-xl font-bold text-gray-900 mb-4">About Invoice Templates</h2>
					<div class="prose prose-sm max-w-none text-gray-600">
						<p>
							Invoice templates control how your invoices are generated as PDF files.
							The system uses <strong>klirr</strong>, a professional invoice generation
							tool that creates beautiful, localized PDFs.
						</p>
					</div>
				</div>

				<!-- Features -->
				<div class="neumorphic-card p-6">
					<h2 class="text-xl font-bold text-gray-900 mb-4">Features</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each features as { title, description, icon }}
							<div class="neumorphic-card p-4 flex gap-3">
								<div class="text-3xl">{icon}</div>
								<div>
									<h3 class="font-semibold text-gray-900 mb-1">{title}</h3>
									<p class="text-sm text-gray-600">{description}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- How it Works -->
				<div class="neumorphic-card p-6">
					<h2 class="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
					<ol class="space-y-3 text-gray-600">
						<li class="flex gap-3">
							<span class="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
							<span>
								<strong>Create a template</strong> by clicking "New Template" and configuring your preferences (layout, language, colors, etc.)
							</span>
						</li>
						<li class="flex gap-3">
							<span class="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
							<span>
								<strong>Set a default template</strong> by clicking the star icon on your preferred template
							</span>
						</li>
						<li class="flex gap-3">
							<span class="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
							<span>
								<strong>Generate PDFs</strong> from your invoices using the "Generate PDF" button - your default template will be used automatically
							</span>
						</li>
						<li class="flex gap-3">
							<span class="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
							<span>
								<strong>Share with clients</strong> - PDFs include QR codes that link directly to the invoice for easy mobile access
							</span>
						</li>
					</ol>
				</div>

				<!-- Klirr Info -->
				<div class="neumorphic-card p-6 bg-blue-50">
					<h2 class="text-xl font-bold text-gray-900 mb-4">Powered by Klirr</h2>
					<div class="prose prose-sm max-w-none text-gray-600">
						<p>
							This system uses <strong>klirr</strong>, an open-source invoice generation tool written in Rust + Typst. Klirr provides:
						</p>
						<ul class="mt-2 space-y-1">
							<li>✅ Professional, polished PDF output</li>
							<li>✅ Automatic working day calculations</li>
							<li>✅ Localized invoice labels</li>
							<li>✅ Fast generation (less than 10ms)</li>
							<li>✅ Customizable layouts via Typst templates</li>
						</ul>
						<p class="mt-3 text-sm">
							Learn more: <a href="https://github.com/Sajjon/klirr" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
								github.com/Sajjon/klirr
							</a>
						</p>
					</div>
				</div>

				<!-- Tips -->
				<div class="neumorphic-card p-6 bg-yellow-50">
					<h2 class="text-xl font-bold text-gray-900 mb-4">💡 Tips</h2>
					<ul class="space-y-2 text-gray-600 text-sm">
						<li>• Create different templates for different types of invoices (e.g., "Services", "Products", "International")</li>
						<li>• Use the same language as your client for better communication</li>
						<li>• Always set a default template to speed up PDF generation</li>
						<li>• QR codes make it easy for clients to access invoices on mobile devices</li>
						<li>• Customize the footer text with payment instructions or thank you messages</li>
					</ul>
				</div>
			</div>
		{/if}
	</div>
</div>
