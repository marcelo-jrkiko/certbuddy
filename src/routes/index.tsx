import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { directusService } from "@/lib/directus";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: directusService.isAuthenticated() ? "/dashboard" : "/login" });
  }, [navigate]);
  return null;
}
