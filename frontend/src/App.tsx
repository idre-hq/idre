// Path: frontend/src/App.tsx

import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./App.css";

// 1. Import GoogleOAuthProvider
import { GoogleOAuthProvider } from "@react-oauth/google";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ApiKeyProvider } from "./contexts/ApiKeyContext";
import { SseProvider } from "./context/SseContext";

// Page components
import Chat from "./pages/Chat";
import MyDriveView from "./pages/MyDriveView";
import NotebooksDashboard from "./pages/NotebooksDashboard";
import CreateNotebookPage from "./pages/CreateNotebookPage";
import WelcomePage from "./pages/WelcomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import WhiteboardView from "./pages/WhiteboardView";
import IdeaCanvas from "./pages/IdeaCanvas";
import IdeaCanvasPage from "./pages/IdeaCanvasPage";
import TasksPage from "./pages/TasksPage";
import TasksKanbanAllView from "./components/tasks/TasksKanbanAllView";
import SetupApiKeyPage from "./pages/SetupApiKeyPage";
import ModelGroupsView from "./pages/ModelGroupsView";
// ADDED: Import the new Dashboard Page
import NotebookDashboard from "./pages/NotebookDashboard";

// Utility components
import ProtectedRoute from "./components/ui/ProtectedRoute";
import AppGuard from "./components/guards/AppGuard";


function App() {
    // 2. Get Client ID from env
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

    return (
        // 3. Wrap everything in GoogleOAuthProvider
        <GoogleOAuthProvider clientId={googleClientId}>
            <ThemeProvider>
                <AuthProvider>
                    <SseProvider>
                        <ApiKeyProvider>
                            <Routes>
                                {/* --- ROOT ROUTE (Redirect Logic) --- */}
                                <Route 
                                    path="/" 
                                    element={
                                        <ProtectedRoute>
                                            <Navigate to="/notebooks" replace />
                                        </ProtectedRoute>
                                    } 
                                />

                                {/* --- PUBLIC ROUTES --- */}
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />


                                {/* --- SETUP ROUTE --- */}
                                <Route
                                    path="/setup"
                                    element={
                                        <ProtectedRoute>
                                            <SetupApiKeyPage />
                                        </ProtectedRoute>
                                    }
                                />

                                {/* --- PURE KANBAN TASKS ROUTE --- */}
                                <Route
                                    path="/tasks"
                                    element={
                                        <ProtectedRoute>
                                            <AppGuard>
                                                <TasksKanbanAllView />
                                            </AppGuard>
                                        </ProtectedRoute>
                                    }
                                />

                                {/* --- PROTECTED APP ROUTES --- */}
                                <Route
                                    element={
                                        <ProtectedRoute>
                                            <AppGuard>
                                                <Outlet />
                                            </AppGuard>
                                        </ProtectedRoute>
                                    }
                                >
                                    <Route path="/model-groups" element={<ModelGroupsView />} />
                                    
                                    {/* ADDED: Modular Dashboard Route */}
                                    <Route path="/dashboard/:notebookId" element={<NotebookDashboard />} />
                                    
                                    <Route path="/chat/:notebookId" element={<Chat />} />
                                    <Route path="/files/:notebookId" element={<MyDriveView />} />
                                    <Route path="/whiteboard/:notebookId" element={<WhiteboardView />} />
                                    <Route path="/idea/:notebookId" element={<IdeaCanvas />} />
                                    <Route path="/idea-canvas/:notebookId" element={<IdeaCanvasPage />} />
                                    <Route path="/tasks/:notebookId" element={<TasksPage />} />
                                    <Route path="/notebooks" element={<NotebooksDashboard />} />
                                    <Route path="/notebooks/create" element={<CreateNotebookPage />} />
                                    <Route path="/welcome/:notebookId" element={<WelcomePage />} />

                                    <Route
                                        path="/default-models"
                                        element={<Navigate to="/notebooks" replace />}
                                    />
                                    <Route
                                        path="/model-api"
                                        element={<Navigate to="/notebooks" replace />}
                                    />
                                </Route>

                                {/* Catch all */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </ApiKeyProvider>
                    </SseProvider>
                </AuthProvider>
            </ThemeProvider>
        </GoogleOAuthProvider>
    );
}

export default App;