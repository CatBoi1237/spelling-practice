import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Practice from "@/pages/Practice";
import Results from "@/pages/Results";
import Progress from "@/pages/Progress";
import Settings from "@/pages/Settings";
import "@/App.css";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/results" element={<Results />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" richColors position="top-right" />
    </AppProvider>
  );
}

export default App;
