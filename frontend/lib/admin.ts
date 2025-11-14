import { apiFetch, withQuery } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/types";

export type AdminUserSummary = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  roles: string[];
};

export const fetchAdminUsers = async (
  token: string,
  params?: { page?: number; limit?: number; search?: string; role?: string; sort?: string }
) =>
  apiFetch<PaginatedResponse<AdminUserSummary>>(withQuery("/admin/users", params), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const updateUserRole = async (token: string, userId: string, role: string, op: "grant" | "revoke") =>
  apiFetch<{ user_id: string; roles: string[] }>(`/admin/roles/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role, op }),
  });
