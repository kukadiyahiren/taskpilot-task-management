import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import BoardPage from "./pages/BoardPage.jsx";
import MyTasksPage from "./pages/MyTasksPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/my-tasks" element={<MyTasksPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
