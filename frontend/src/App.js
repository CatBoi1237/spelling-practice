import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";
import Dashboard from "@/pages/Dashboard";
import Practice from "@/pages/Practice";
import Results from "@/pages/ResultsV2";
import Progress from "@/pages/Progress";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Daily from "@/pages/Daily";
import MultiplayerShell from "@/pages/MultiplayerShell";
import Join from "@/pages/Join";
import RoomShell from "@/pages/RoomShell";
import ClassroomShell from "@/pages/ClassroomShell";
import ClassroomProjector from "@/pages/ClassroomProjector";
import CustomWordLists from "@/pages/CustomWordLists";
import SavedWords from "@/pages/SavedWords";
import TeacherDashboard from "@/pages/TeacherDashboard";
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
            <Route path="/classroom/:code/projector" element={<ClassroomProjector />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/results" element={<Results />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/daily" element={<Daily />} />
              <Route path="/multiplayer" element={<MultiplayerShell />} />
              <Route path="/join" element={<Join />} />
              <Route path="/word-lists" element={<CustomWordLists />} />
              <Route path="/saved-words" element={<SavedWords />} />
              <Route path="/teacher" element={<TeacherDashboard />} />
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
          <PwaUpdatePrompt />
        </BrowserRouter>
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
