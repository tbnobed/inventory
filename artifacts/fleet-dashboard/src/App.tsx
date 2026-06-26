import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import SubnetsPage from "@/pages/subnets";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 10000,
    },
  },
});

function AuthGate() {
  const { data: me, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() },
  });

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0b0e14" }}
      >
        <span className="label-upper" style={{ color: "#7d8aa3" }}>
          Loading...
        </span>
      </div>
    );
  }

  if (!me) {
    return (
      <Switch>
        <Route path="*" component={LoginPage} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard">
        <DashboardPage
          userId={me.id}
          username={me.username}
          role={me.role}
        />
      </Route>
      <Route path="/users">
        {me.role === "admin" ? (
          <UsersPage username={me.username} role={me.role} />
        ) : (
          <Redirect to="/dashboard" />
        )}
      </Route>
      <Route path="/subnets">
        {me.role === "admin" ? (
          <SubnetsPage username={me.username} role={me.role} />
        ) : (
          <Redirect to="/dashboard" />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
