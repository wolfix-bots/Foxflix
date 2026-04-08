import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MovieDetail from "./pages/MovieDetail";
import TrendingPage from "./pages/TrendingPage";
import LatestPage from "./pages/LatestPage";
import SearchPage from "./pages/SearchPage";
import Browse from "./pages/Browse";
import StaffPage from "./pages/StaffPage";
import Profile from "./pages/Profile";
import RoomPlayer from "./pages/RoomPlayer";
import UserProfile from "./pages/UserProfile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/latest" element={<LatestPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/room/:id" element={<RoomPlayer />} />
            <Route path="/user/:username" element={<UserProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
