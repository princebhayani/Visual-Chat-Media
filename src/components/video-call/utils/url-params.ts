/**
 * URL Parameters Utility
 * 
 * Helper functions for extracting URL parameters
 */

/**
 * Get URL parameters from current window location or provided URL
 */
export function getUrlParams(url = window.location.href): URLSearchParams {
	const urlStr = url.split("?")[1];
	if (!urlStr) return new URLSearchParams();
	return new URLSearchParams(urlStr);
}

/**
 * Get specific URL parameter value
 */
export function getUrlParam(key: string, defaultValue?: string): string | null {
	const params = getUrlParams();
	return params.get(key) || defaultValue || null;
}

