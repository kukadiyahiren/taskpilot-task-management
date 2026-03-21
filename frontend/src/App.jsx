import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import BoardPage from "./pages/BoardPage.jsx";
import MyTasksPage from "./pages/MyTasksPage.jsx";
import MembersPage from "./pages/MembersPage.jsx";
import MeetingsPage from "./pages/MeetingsPage.jsx";
import FilesPage from "./pages/FilesPage.jsx";
import AiAssistantPage from "./pages/AiAssistantPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { getAccessToken } from "./lib/authStorage.js";

function RequireAuth({ children }) {
  if (!getAccessToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/board"
        element={
          <RequireAuth>
            <BoardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/my-tasks"
        element={
          <RequireAuth>
            <MyTasksPage />
          </RequireAuth>
        }
      />
      <Route
        path="/members"
        element={
          <RequireAuth>
            <MembersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/meetings"
        element={
          <RequireAuth>
            <MeetingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/files"
        element={
          <RequireAuth>
            <FilesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/ai"
        element={
          <RequireAuth>
            <AiAssistantPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
