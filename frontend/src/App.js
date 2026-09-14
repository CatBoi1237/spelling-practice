import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import TeacherAccountGate from "@/components/TeacherAccountGate";
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
import TeacherAssignments from "@/pages/TeacherAssignments";
import TeacherClasses from "@/pages/TeacherClasses";
import TeacherClassDetail from "@/pages/TeacherClassDetail";
import StudentClass from "@/pages/StudentClass";
import Assignment from "@/pages/Assignment";
import AssignmentReport from "@/pages/AssignmentReport";
import SignIn from "@/pages/SignIn";
import ResetPassword from "@/pages/ResetPassword";
import Achievements from "@/pages/Achievements";
import Library from "@/pages/Library";
import Learn from "@/pages/Learn";
import Leaderboards from "@/pages/Leaderboards";
import "@/App.css";

function teacherPage(page) {
  return <TeacherAccountGate>{page}</TeacherAccountGate>;
}

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
              <Route path="/word-lists" element={teacherPage(<CustomWordLists />)} />
              <Route path="/saved-words" element={<SavedWords />} />
              <Route path="/teacher" element={teacherPage(<TeacherDashboard />)} />
              <Route path="/teacher/classes" element={teacherPage(<TeacherClasses />)} />
              <Route path="/teacher/classes/:code" element={teacherPage(<TeacherClassDetail />)} />
              <Route path="/assignments" element={teacherPage(<TeacherAssignments />)} />
              <Route path="/assignment/:code" element={<Assignment />} />
              <Route path="/assignments/:code/report" element={teacherPage(<AssignmentReport />)} />
              <Route path="/class/:code" element={<StudentClass />} />
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
