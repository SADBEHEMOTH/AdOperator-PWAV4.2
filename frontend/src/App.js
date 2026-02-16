import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import AnalysisFlow from "@/pages/AnalysisFlow";
import ResultPage from "@/pages/ResultPage";
import PublicResultPage from "@/pages/PublicResultPage";
import CompetitorAnalysisPage from "@/pages/CompetitorAnalysisPage";
import MarketComparePage from "@/pages/MarketComparePage";
import "@/App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#09090b]" />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#09090b] relative">
          <div className="noise-overlay" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/public/:token" element={<PublicResultPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/analysis/new" element={<ProtectedRoute><AnalysisFlow /></ProtectedRoute>} />
            <Route path="/analysis/:id" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
            <Route path="/analysis/:id/market" element={<ProtectedRoute><MarketComparePage /></ProtectedRoute>} />
            <Route path="/competitor" element={<ProtectedRoute><CompetitorAnalysisPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#121212',
                border: '1px solid #27272a',
                color: '#EDEDED',
              },
            }}
          />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
