import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { getAliases } from "vite-aliases";
import routify from "@roxi/routify/vite-plugin"
import path from "path";
import { mdsvex } from "mdsvex";
const aliases = getAliases();
const production = process.env.NODE_ENV==="production"
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isProduction = mode === "production";
	return {
		server: {
			proxy: {
				"/api": {
					target: "http://localhost:3001",
					changeOrigin: true,
					secure: false,
					ws: true,
					configure: (proxy, _options) => {
						proxy.on("error", (err, _req, _res) => {
							console.log("[Proxy Error]", err);
						});
						proxy.on("proxyReq", (proxyReq, req, _res) => {
							const headers = proxyReq.getHeaders();
							console.log("[Proxy Request]", req.method, req.url);
							console.log("[Proxy Target]", "http://localhost:3001" + req.url);
							console.log("[Authorization]", headers["authorization"] ? "Bearer ***" : "NOT SET");
						});
						proxy.on("proxyRes", (proxyRes, req, _res) => {
							console.log("[Proxy Response]", proxyRes.statusCode, req.url);
						});
					},
				},
			},
		},
		resolve: {
			alias: {
				...aliases,
				$lib: path.resolve("./src/lib"),
			},
		},
		plugins: [
			routify({
				routesDir:{
					default:"src/routes",
					widgets:"src/widgets"
				}
			}),
			getAliases(),
			svelte({
				emitCss:true,
				compilerOptions:{
					dev:!production,
				},
				extensions:[
					".svelte",
					".md"
				],
				preprocess:[
					mdsvex({
						extension:"md"
					})
				]
			})
		],
		optimizeDeps: {
			include: ["date-fns", "chart.js", "svelte-chartjs"],
			exclude: ["recharts", "react", "react-dom", "@hello-pangea/dnd", "react-redux"],
			force: true,
		},
		build: {
			minify: isProduction,
			brotliSize: false, // To Speed Up Build
			rollupOptions: {
				// Disabled Hashing as Netlify Does Hashing for us using Etag.
				output: {
					entryFileNames: `assets/[name].js`,
					chunkFileNames: `assets/[name].js`,
					assetFileNames: `assets/[name].[ext]`,
				},
			},
		},
	};
});
//export default {
//	plugins: [
//		ViteAliases()
//	]
//};
