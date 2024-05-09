/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [{ hostname: "stoic-sturgeon-730.convex.cloud" },
		{
			protocol: 'http',
			hostname: '',
			port: '',
			pathname: '',
		},
		],
	},
	
};

export default nextConfig;
