import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { directusService } from "@/lib/directus";

const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000;
const TOKEN_VALIDATE_INTERVAL = 60 * 1000;

/**
 * Hook to keep Directus token refreshed while the page is open.
 * Automatically redirects to login if token expires.
 */
export function useTokenRefresh() {
  const navigate = useNavigate();
  const isHandlingExpiryRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const isValidatingRef = useRef(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!directusService.isAuthenticated()) {
      return;
    }

    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let validateInterval: ReturnType<typeof setInterval> | null = null;

    const handleExpiredSession = async () => {
      if (isHandlingExpiryRef.current) return;
      isHandlingExpiryRef.current = true;

      try {
        await directusService.logout();
      } catch {
        // Ignore logout errors and proceed to sign-out flow.
      }

      window.alert("Your session expired. Please sign in again.");
      await navigate({ to: "/login", replace: true });
    };

    const refreshToken = async () => {
      if (isRefreshingRef.current || isHandlingExpiryRef.current) return;
      isRefreshingRef.current = true;

      try {
        const session = directusService.getSession();
        if (!session) {
          await handleExpiredSession();
          return;
        }

        const refreshed = await directusService.refresh();
        if (!refreshed) {
          await handleExpiredSession();
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        await handleExpiredSession();
      } finally {
        isRefreshingRef.current = false;
      }
    };

    const validateToken = async () => {
      if (isValidatingRef.current || isHandlingExpiryRef.current) return;
      isValidatingRef.current = true;

      try {
        const session = directusService.getSession();
        if (!session) {
          await handleExpiredSession();
          return;
        }

        await directusService.getCurrentUser();
      } catch {
        const refreshed = await directusService.refresh();
        if (!refreshed) {
          await handleExpiredSession();
          return;
        }

        try {
          await directusService.getCurrentUser();
        } catch {
          await handleExpiredSession();
        }
      } finally {
        isValidatingRef.current = false;
      }
    };

    const startIntervals = () => {
      if (!refreshInterval) {
        refreshInterval = setInterval(() => {
          void refreshToken();
        }, TOKEN_REFRESH_INTERVAL);
      }

      if (!validateInterval) {
        validateInterval = setInterval(() => {
          void validateToken();
        }, TOKEN_VALIDATE_INTERVAL);
      }
    };

    const clearIntervals = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }

      if (validateInterval) {
        clearInterval(validateInterval);
        validateInterval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearIntervals();
        return;
      }

      void validateToken();
      startIntervals();
    };

    void validateToken();
    startIntervals();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearIntervals();
    };
  }, [navigate]);
}
