import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import Dashboard from "@/pages/Dashboard";
import Practice from "@/pages/Practice";
import Results from "@/pages/ResultsV2";
import Progress from "@/pages/Progress";
import Settings from "@/pages/Settings";
import Daily from "@/pages/Daily";
import Multiplayer from "@/pages/Multiplayer";
import RoomShell from "@/pages/RoomShell";
import ClassroomShell from "@/pages/ClassroomShell";
import CustomWordLists from "@/pages/CustomWordLists";
import SignIn from "@/pages/SignIn";
import ResetPassword from "@/pages/ResetPassword";
import Achievements from "@/pages/Achievements";
import Library from "@/pages/Library";
import Learn from "@/pages/Learn";
import Leaderboards from "@/pages/Leaderboards";
import "@/App.css";

function App() {
  return (
    <ErrorBoundary>
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/results" element={<Results />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/daily" element={<Daily />} />
              <Route path="/multiplayer" element={<Multiplayer />} />
              <Route path="/word-lists" element={<CustomWordLists />} />
              <Route path="/room/:code" element={<RoomShell />} />
              <Route path="/classroom/:code" element={<ClassroomShell />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/library" element={<Library />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/leaderboards" element={<Leaderboards />} />
              <Route path="*" element={<Dashboard />} />
            </Route>
          </Routes>
          <PwaInstallPrompt />
        </BrowserRouter>
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
