import { ThemeToggle } from "../ThemeToggle";
import React, { useState, useEffect, memo, useCallback } from "react";
import type { ChatSession } from "../../types/chat";
// Added Home icon and LayoutDashboard icon
import { ChevronLeft, X, MessageCircle, FolderOpen, CheckSquare, Home } from "lucide-react";
import SettingsDropdown from "./SettingsDropdown";
import AuthDropdown from "./AuthDropdown";
import ChatHistory from "./ChatHistory";
// Note: idre logos kept in imports if needed elsewhere, but removed from header usage
import { useNavigate, useLocation } from "react-router-dom";
import { useNotebooks } from "../../hooks/useNotebooks";
import { Icon, type IconName } from "../Icon.tsx";
interface ChatSidebarProps {
notebookId?: string;
chatSessions: ChatSession[];
currentChatId: string | null;
collapsed: boolean;
onToggleCollapse: () => void;
onCreateNewChat: () => string | void;
onSwitchChat: (chatId: string) => void;
onDeleteChat: (chatId: string) => void;
onSwitchChatWithNavigation?: (chatId: string) => void;
loading?: boolean;
creatingChat?: boolean;
onSettingsClick: () => void;
user?: { name?: string; surname?: string; email?: string; username?: string };
onLogout: () => void;
isAuthenticated?: boolean;
onLoginClick: () => void;
onRegisterClick: () => void;
isThreadTyping?: (threadId: string) => boolean;
}
const ChatSidebar: React.FC<ChatSidebarProps> = ({
notebookId: propNotebookId,
chatSessions,
currentChatId,
collapsed,
onToggleCollapse,
onCreateNewChat,
onSwitchChat,
onDeleteChat,
onSwitchChatWithNavigation,
loading = false,
creatingChat = false,
onSettingsClick,
user,
onLogout,
isAuthenticated = false,
onLoginClick,
onRegisterClick,
isThreadTyping,
}) => {
const [isMobile, setIsMobile] = useState(false);
// Updated type to include "dashboard"
const [activeTab, setActiveTab] = useState<"chat" | "files" | "whiteboard" | "idea" | "tasks" | "dashboard">("chat");
const [isFetchingNotebook, setIsFetchingNotebook] = useState(false);
const navigate = useNavigate();
const location = useLocation();
const { currentNotebook, getNotebookById } = useNotebooks();

useEffect(() => {
    const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
}, []);

useEffect(() => {
    if (location.pathname.startsWith("/files/")) {
        setActiveTab("files");
    } else if (location.pathname.startsWith("/chat/")) {
        setActiveTab("chat");
    } else if (location.pathname.startsWith("/dashboard/")) {
        setActiveTab("dashboard");
    } else if (location.pathname.startsWith("/whiteboard/")) {
        setActiveTab("whiteboard");
    } else if (location.pathname.startsWith("/idea-canvas/") || location.pathname.startsWith("/idea/")) {
        setActiveTab("idea");
    } else if (location.pathname.startsWith("/tasks/")) {
        setActiveTab("tasks");
    }
}, [location.pathname]);

const getNotebookIdFromPath = useCallback(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    // Added 'dashboard' to the check list
    if (parts.length >= 2 && ['chat', 'files', 'whiteboard', 'idea', 'idea-canvas', 'tasks', 'dashboard'].includes(parts[0])) {
        return parts[1];
    }
    return null;
}, [location.pathname]);

useEffect(() => {
    const targetId = propNotebookId || getNotebookIdFromPath();
    if (targetId) {
        if (!currentNotebook || currentNotebook.id !== targetId) {
            setIsFetchingNotebook(true);
            getNotebookById(targetId).finally(() => {
                setIsFetchingNotebook(false);
            });
        }
    }
}, [propNotebookId, getNotebookIdFromPath, currentNotebook, getNotebookById]);

// Updated type definition
const handleTabChange = (e: React.MouseEvent, tab: "chat" | "files" | "whiteboard" | "idea" | "tasks" | "dashboard") => {
    e.stopPropagation();
    setActiveTab(tab);
    const targetId = propNotebookId || getNotebookIdFromPath();

    if (targetId) {
        try {
            localStorage.setItem(`notebook-last-tab-${targetId}`, tab);
        } catch (error) {
            console.warn("Could not save last active tab to localStorage", error);
        }
    }

    if (tab === "dashboard") {
        navigate(targetId ? `/dashboard/${targetId}` : '/notebooks');
    } else if (tab === "files") {
        navigate(targetId ? `/files/${targetId}` : '/notebooks');
    } else if (tab === "tasks") {
        navigate(targetId ? `/tasks/${targetId}` : '/notebooks');
    } else if (tab === "chat") {
        if (targetId) {
            navigate(`/chat/${targetId}`, { state: { forceTemporaryChat: true } });
        } else {
            navigate("/notebooks");
        }
    }
};

const sidebarClasses = [
    "h-full flex flex-col flex-shrink-0 bg-sidebar-background border-r border-sidebar-border transition-[width,transform] duration-300 ease-in-out",
    "md:relative fixed top-0 left-0 z-50",
    isMobile ? "w-[280px]" : (collapsed ? "w-[60px]" : "w-[260px]"),
    isMobile && !collapsed ? "translate-x-0 shadow-2xl" : "",
    isMobile && collapsed ? "-translate-x-full" : "",
    !isMobile ? "translate-x-0" : ""
].join(" ");

const activeNotebookId = propNotebookId || getNotebookIdFromPath();

return (
    <aside className={sidebarClasses} onClick={collapsed && isMobile ? onToggleCollapse : undefined}>
        <div className={`flex flex-col h-full ${collapsed && !isMobile ? "p-2 overflow-hidden" : "p-2"}`}>

            {/* Refactored Header */}
            <header className={`flex items-center gap-2 mb-4 ${collapsed && !isMobile ? "flex-col py-2" : "px-1 py-3"}`}>

                {/* Home Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate("/notebooks");
                    }}
                    className="flex items-center justify-center p-2 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-primary transition-colors"
                    title="Back to Notebooks"
                >
                    <Home size={20} />
                </button>

                {/* Notebook Display (Center) */}
                {activeNotebookId && (
                    <div className={`flex items-center gap-2 min-w-0 flex-1 ${collapsed && !isMobile ? "justify-center" : ""}`}>
                        {currentNotebook ? (
                            <>
                                <div
                                    className="flex-shrink-0 p-1.5 rounded-md bg-background border border-sidebar-border shadow-sm"
                                    title={collapsed ? currentNotebook.title : undefined}
                                >
                                    <Icon
                                        name={(currentNotebook.emoji as IconName) || 'book'}
                                        style={{ color: currentNotebook.bg_color || 'inherit' }}
                                        className="w-4 h-4"
                                    />
                                </div>
                                {!collapsed && (
                                    <span className="text-sm font-bold truncate leading-tight" style={{ color: currentNotebook.bg_color || 'inherit' }}>
                                        {currentNotebook.title}
                                    </span>
                                )}
                            </>
                        ) : isFetchingNotebook && (
                            <div className="animate-pulse bg-sidebar-border rounded-md w-8 h-8" />
                        )}
                    </div>
                )}

                {/* Toggle/Close Button */}
                <button
                    className={`flex items-center justify-center p-2 rounded-md text-muted-foreground hover:bg-sidebar-accent transition-all ${
                        collapsed && !isMobile ? "rotate-180" : ""
                    }`}
                    onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    {isMobile ? <X size={20} /> : <ChevronLeft size={18} />}
                </button>
            </header>

            <div className="flex-grow flex flex-col gap-3 bg-background min-h-0 items-start">
                {/* Navigation Tabs */}
                <section className="flex flex-col gap-1 flex-shrink-0 w-full">
                    {/*<button*/}
                    {/*    className={`flex items-center gap-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${*/}
                    {/*        activeTab === "dashboard"*/}
                    {/*            ? "bg-sidebar-accent text-sidebar-primary font-semibold border border-sidebar-border"*/}
                    {/*            : "text-sidebar-foreground hover:bg-sidebar-accent"*/}
                    {/*    } ${collapsed && !isMobile ? "justify-center" : ""}`}*/}
                    {/*    onClick={(e) => handleTabChange(e, "dashboard")}*/}
                    {/*>*/}
                    {/*    <LayoutDashboard size={16} />*/}
                    {/*    {!collapsed && <span>Dashboard</span>}*/}
                    {/*</button>*/}
                    <button
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                            activeTab === "chat" ? "bg-sidebar-accent text-sidebar-primary font-semibold border border-sidebar-border" : "text-sidebar-foreground hover:bg-sidebar-accent"
                        } ${collapsed && !isMobile ? "justify-center" : ""}`}
                        onClick={(e) => handleTabChange(e, "chat")}
                    >
                        <MessageCircle size={16} />
                        {!collapsed && <span>Chat</span>}
                    </button>
                    <button
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                            activeTab === "files" ? "bg-sidebar-accent text-sidebar-primary font-semibold border border-sidebar-border" : "text-sidebar-foreground hover:bg-sidebar-accent"
                        } ${collapsed && !isMobile ? "justify-center" : ""}`}
                        onClick={(e) => handleTabChange(e, "files")}
                    >
                        <FolderOpen size={16} />
                        {!collapsed && <span>Files</span>}
                    </button>
                    <button
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                            activeTab === "tasks" ? "bg-sidebar-accent text-sidebar-primary font-semibold border border-sidebar-border" : "text-sidebar-foreground hover:bg-sidebar-accent"
                        } ${collapsed && !isMobile ? "justify-center" : ""}`}
                        onClick={(e) => handleTabChange(e, "tasks")}
                    >
                        <CheckSquare size={16} />
                        {!collapsed && <span>Tasks</span>}
                    </button>
                </section>

                {/* Chat History List */}
                {(!collapsed || isMobile) && (
                    <>
                        <div className="w-full border-t border-sidebar-border my-1"></div>
                        <div className="flex flex-col flex-1 min-h-0 w-full">
                            <ChatHistory
                                chatSessions={chatSessions}
                                currentChatId={currentChatId}
                                onSwitchChat={onSwitchChat}
                                onDeleteChat={onDeleteChat}
                                onSwitchChatWithNavigation={onSwitchChatWithNavigation}
                                loading={loading}
                                creatingChat={creatingChat}
                                onCreateNewChat={onCreateNewChat}
                                onToggleCollapse={onToggleCollapse}
                                isAuthenticated={isAuthenticated}
                                isThreadTyping={isThreadTyping}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-auto pt-4 border-t border-sidebar-border">
                <div className="flex flex-col gap-2">
                    <SettingsDropdown
                        collapsed={collapsed}
                        onToggleCollapse={onToggleCollapse}
                        onSettingsClick={onSettingsClick}
                    />
                    <div className={`flex items-center ${collapsed && !isMobile ? "flex-col justify-center gap-4 py-2" : "justify-between p-2"}`}>
                        <AuthDropdown
                            collapsed={collapsed}
                            user={user}
                            onLogout={onLogout}
                            onToggleCollapse={onToggleCollapse}
                            isAuthenticated={isAuthenticated}
                            onLoginClick={onLoginClick}
                            onRegisterClick={onRegisterClick}
                        />
                        <ThemeToggle />
                    </div>
                </div>
            </footer>
        </div>
    </aside>
);
};
const ChatSidebarMemo = memo(ChatSidebar, (prevProps, nextProps) => {
return (
prevProps.notebookId === nextProps.notebookId &&
prevProps.chatSessions === nextProps.chatSessions &&
prevProps.currentChatId === nextProps.currentChatId &&
prevProps.loading === nextProps.loading &&
prevProps.creatingChat === nextProps.creatingChat &&
prevProps.collapsed === nextProps.collapsed &&
prevProps.isAuthenticated === nextProps.isAuthenticated
);
});
export default ChatSidebarMemo;