import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { directusService } from "@/lib/directus";

const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh every 5 minutes
const TOKEN_CHECK_INTERVAL = 30 * 1000; // Check token validity every 30 seconds

/**
 * Hook to keep Directus token refreshed while the page is open.
 * Automatically redirects to login if token expires.
 */
export function useTokenRefresh() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    if (!directusService.isAuthenticated()) {
      return;
    }

    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const checkTokenExpiration = async () => {
      const session = directusService.getSession();
      if (!session) {
        // Session lost, redirect to login
        navigate({ to: "/login", replace: true });
        return;
      }

      // Check if token has expired
      if (session.expires_at <= Date.now()) {
        navigate({ to: "/login", replace: true });
        return;
      }

      // Check if token is expiring soon (within 1 minute) and try to refresh
      if (session.expires_at - Date.now() < 60 * 1000) {
        const refreshed = await directusService.refresh();
        if (!refreshed) {
          navigate({ to: "/login", replace: true });
        }
      }
    };

    const refreshToken = async () => {
      try {
        const session = directusService.getSession();
        if (!session) return;

        // Only refresh if not expiring very soon (refreshed recently)
        if (session.expires_at - Date.now() > 30 * 1000) {
          await directusService.refresh();
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        navigate({ to: "/login", replace: true });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear intervals
        if (refreshInterval) clearInterval(refreshInterval);
        if (checkInterval) clearInterval(checkInterval);
      } else {
        // Page is visible again, restart intervals and check token
        checkTokenExpiration();
        refreshInterval = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
        checkInterval = setInterval(checkTokenExpiration, TOKEN_CHECK_INTERVAL);
      }
    };

    // Initial check
    checkTokenExpiration();

    // Set up refresh intervals
    refreshInterval = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
    checkInterval = setInterval(checkTokenExpiration, TOKEN_CHECK_INTERVAL);

    // Listen for visibility changes (tab switch, minimize window, etc.)
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshInterval) clearInterval(refreshInterval);
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [navigate]);
}
