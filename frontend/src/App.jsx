import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Chat from './pages/Chat';
import Upload from './pages/Upload';
import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';

import RootLayout from './components/RootLayout';
import AuthLayout from './components/AuthLayout';
import SkeletonLoader from './components/SkeletonLoader';
import { getApiUrl, apiFetch } from './api';

// Generate a stable unique key once per full page load to force fresh resets on refresh
const INITIAL_LOAD_ID = Math.random().toString(36).substring(7);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaceData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await apiFetch('/workspace/init');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.status.authenticated);
        setHasDocuments(data.status.has_documents);
        setUserProfile(data.user_profile);
        setSessions(data.sessions);
        setDocuments(data.documents);
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
        setSessions([]);
        setDocuments([]);
        setHasDocuments(false);
      }
    } catch (err) {
      console.error("Workspace sync failed:", err);
      setIsAuthenticated(false);
      setUserProfile(null);
      setSessions([]);
      setDocuments([]);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const refreshWorkspace = () => fetchWorkspaceData(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <SkeletonLoader type="full" />
      </div>
    );
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <Routes>
          {/* Main Layout Wrapper */}
          <Route element={<RootLayout />}>
            <Route path="/" element={
              isAuthenticated 
                ? (hasDocuments ? <Navigate to="/chat" /> : <Navigate to="/upload" />) 
                : <Navigate to="/login" />
            } />
            
            {/* Auth Flow with Persistent Background */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login setAuth={setIsAuthenticated} setHasDocs={setHasDocuments} />} />
              <Route path="/signup" element={<Signup setAuth={setIsAuthenticated} setHasDocs={setHasDocuments} />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            <Route path="/upload" element={
              isAuthenticated ? <Upload setAuth={setIsAuthenticated} setHasDocs={setHasDocuments} refreshWorkspace={refreshWorkspace} /> : <Navigate to="/login" />
            } />
            <Route path="/chat" element={
              isAuthenticated ? (
                <Chat 
                  key={INITIAL_LOAD_ID} // Forces fresh reset on every browser reload
                  userProfile={userProfile} 
                  setAuth={setIsAuthenticated}
                  initialSessions={sessions} 
                  initialDocs={documents}
                  refreshWorkspace={refreshWorkspace}
                />
              ) : <Navigate to="/login" />
            } />
          </Route>
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
