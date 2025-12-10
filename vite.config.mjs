import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { getAliases } from "vite-aliases";
import path from "path";
const aliases = getAliases();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isProduction = mode === "production";
	return {
		server: {
			proxy: {
				"/api": {
					target: "https://intern.intuivo.com ",
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
							console.log(
								"[Proxy Target]",
								"https://intern.intuivo.com" + req.url,
							);
							console.log("[Proxy Headers]", JSON.stringify(headers, null, 2));
							console.log(
								"[X-Company-Id]",
								headers["x-company-id"] || "NOT SET",
							);
							console.log(
								"[Authorization]",
								headers["authorization"] ? "Bearer ***" : "NOT SET",
							);
						});
						proxy.on("proxyRes", (proxyRes, req, _res) => {
							console.log("[Proxy Response]", proxyRes.statusCode, req.url);
						});
					},
				},
				"/auth": {
					target: "https://intern.intuivo.com",
					changeOrigin: true,
					secure: false,
					ws: true,
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
			getAliases(),
			svelte()
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
