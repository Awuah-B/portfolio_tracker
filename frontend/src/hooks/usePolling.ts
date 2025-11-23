import { useEffect, useRef } from 'react';

/**
 * Hook for polling data at regular intervals with Page Visibility API support.
 * Automatically pauses when the tab is hidden to save resources.
 * 
 * @param callback - Function to call on each poll
 * @param interval - Polling interval in milliseconds
 * @param enabled - Whether polling is enabled
 */
export function usePolling(
    callback: () => void,
    interval: number,
    enabled: boolean = true
) {
    const callbackRef = useRef(callback);
    const intervalRef = useRef<number | null>(null);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) {
            // Clear any existing interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial call
        callbackRef.current();

        // Set up polling
        const startPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            intervalRef.current = setInterval(() => {
                // Pause when tab is hidden (Page Visibility API)
                if (document.hidden) {
                    return;
                }

                callbackRef.current();
            }, interval);
        };

        // Handle visibility change
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // Tab became visible again, refresh immediately
                callbackRef.current();
            }
        };

        startPolling();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [interval, enabled]);
}
