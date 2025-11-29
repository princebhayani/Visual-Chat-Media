/** @type {import('next').NextConfig} */

const nextConfig = {
	transpilePackages: ["firebase", "@firebase/auth", "@firebase/app"],
	webpack: (config) => {
		config.resolve.alias = {
			...(config.resolve.alias ?? {}),
			undici: false,
		};
		return config;
	},
	images: {
		remotePatterns: [
			{ hostname: "stoic-sturgeon-730.convex.cloud" },
			{ hostname: "oaidalleapiprodscus.blob.core.windows.net" },
		],
	},
};

export default nextConfig;
