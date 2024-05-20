/** @type {import('next').NextConfig} */

const nextConfig = {
	images: {
		remotePatterns: [
			{ hostname: "stoic-sturgeon-730.convex.cloud" },
			{ hostname: "oaidalleapiprodscus.blob.core.windows.net" },
		],
	},
};

export default nextConfig;
