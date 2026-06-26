import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth(redirectOnUnauth = true) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, isError, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  useEffect(() => {
    if (redirectOnUnauth && isError) {
      setLocation("/");
    }
  }, [isError, redirectOnUnauth, setLocation]);

  return { user, isLoading, isError };
}
