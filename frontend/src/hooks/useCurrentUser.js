import { useQuery } from "@tanstack/react-query";
import * as authApi from "../api/auth.js";
import { getAccessToken } from "../lib/authStorage.js";

export const authMeQueryKey = ["auth", "me"];

export function useCurrentUser() {
  return useQuery({
    queryKey: authMeQueryKey,
    queryFn: () => authApi.me(),
    enabled: typeof window !== "undefined" && !!getAccessToken(),
    staleTime: 60_000,
  });
}
