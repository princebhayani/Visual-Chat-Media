/**
 * Media Query Hook
 * 
 * React hook for responsive design based on media queries
 */

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const media = window.matchMedia(query);
		
		// Set initial value
		setMatches(media.matches);

		// Create event listener
		const listener = (event: MediaQueryListEvent) => {
			setMatches(event.matches);
		};

		// Modern browsers
		if (media.addEventListener) {
			media.addEventListener("change", listener);
			return () => media.removeEventListener("change", listener);
		} else {
			// Legacy browsers
			media.addListener(listener);
			return () => media.removeListener(listener);
		}
	}, [query]);

	return matches;
}

