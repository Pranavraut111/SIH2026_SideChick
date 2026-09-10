import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Workspace from "./pages/WorkspaceAdvanced";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import AssessmentFlow from "./pages/AssessmentFlow";

const queryClient = new QueryClient();

/**
 * Route map.
 *
 * The whole application navigates under `/app` — landing-page CTAs, the post-signup
 * redirect, every workspace sidebar item (`/app/student/skill-dna`, …) and the
 * post-assessment redirect. Those routes previously did not exist, so every one of
 * those links fell through to the NotFound catch-all.
 *
 * `/app/:role/*` is a single wildcard because the workspace reads its active page from
 * the path itself (`pathname.split("/")[3]`) and renders the right role workspace from
 * the authenticated user's claims — a student cannot reach the industry workspace by
 * typing `/app/industry/...`, because the role comes from the token, not the URL.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Workspace */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/:role/*"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />

            {/* Assessment lives at its own full-page route. */}
            <Route
              path="/app/student/assessment"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <AssessmentFlow />
                </ProtectedRoute>
              }
            />

            {/* Legacy paths kept working so existing links and bookmarks resolve. */}
            <Route path="/workspace" element={<Navigate to="/app" replace />} />
            <Route path="/assessment" element={<Navigate to="/app/student/assessment" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
