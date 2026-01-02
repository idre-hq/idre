// Path: frontend/src/pages/NotebookDashboard.tsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings2, MessageCircle, FolderOpen, CheckSquare, PenTool } from 'lucide-react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import Layout from '../components/layout/Layout';
import { useChats } from '../hooks/useChats';
import { useSse } from '../context/SseContext';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';

// Widget Components
import { ChatWidget } from '../components/dashboard/widgets/ChatWidget';
import { TasksWidget } from '../components/dashboard/widgets/TasksWidget';
import { WhiteboardWidget } from '../components/dashboard/widgets/WhiteboardWidget';
import { FilesWidget } from '../components/dashboard/widgets/FilesWidget'; // <--- IMPORT THIS

const ResponsiveGridLayout = WidthProvider(GridLayout);

// Define the layout item type manually since it's not exported
interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
}

interface WidgetConfig {
    id: string;
    title: string;
    icon: React.ReactNode;
    defaultLayout: LayoutItem;
}

const STORAGE_KEY_LAYOUT = 'dashboard-layout';
const STORAGE_KEY_WIDGETS = 'dashboard-active-widgets';

const NotebookDashboard: React.FC = () => {
    const { notebookId } = useParams<{ notebookId: string }>();

    // Shared Logic for Layout component
    const {
        chatSessions, currentChatId, loadingChats, creatingChat,
        isTyping, isAuthenticated, user, createNewChat,
        switchToChat, handleDeleteChat,
    } = useChats(notebookId);
    const { isThreadTyping } = useSse();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Widget Configurations
    const widgetConfigs = useMemo<WidgetConfig[]>(() => [
        {
            id: 'chat',
            title: 'Chat Assistant',
            icon: <MessageCircle size={16} />,
            defaultLayout: { i: 'chat', x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
        },
        {
            id: 'tasks',
            title: 'Tasks Board',
            icon: <CheckSquare size={16} />,
            defaultLayout: { i: 'tasks', x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 4 },
        },
        {
            id: 'files',
            title: 'File Explorer',
            icon: <FolderOpen size={16} />,
            defaultLayout: { i: 'files', x: 0, y: 8, w: 4, h: 6, minW: 2, minH: 3 },
        },
        {
            id: 'whiteboard',
            title: 'Whiteboard',
            icon: <PenTool size={16} />,
            defaultLayout: { i: 'whiteboard', x: 4, y: 8, w: 8, h: 6, minW: 4, minH: 4 },
        },
    ], []);

    // Load saved state from localStorage
    const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY_WIDGETS}-${notebookId}`);
            return saved ? JSON.parse(saved) : ['chat', 'tasks', 'files', 'whiteboard'];
        } catch {
            return ['chat', 'tasks', 'files', 'whiteboard'];
        }
    });

    const [layout, setLayout] = useState<LayoutItem[]>(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY_LAYOUT}-${notebookId}`);
            return saved ? JSON.parse(saved) : widgetConfigs.map(w => w.defaultLayout);
        } catch {
            return widgetConfigs.map(w => w.defaultLayout);
        }
    });

    // Save state to localStorage
    useEffect(() => {
        if (notebookId) {
            localStorage.setItem(`${STORAGE_KEY_WIDGETS}-${notebookId}`, JSON.stringify(activeWidgetIds));
        }
    }, [activeWidgetIds, notebookId]);

    useEffect(() => {
        if (notebookId) {
            localStorage.setItem(`${STORAGE_KEY_LAYOUT}-${notebookId}`, JSON.stringify(layout));
        }
    }, [layout, notebookId]);

    const handleToggleWidget = useCallback((widgetId: string) => {
        setActiveWidgetIds(prev => {
            if (prev.includes(widgetId)) {
                return prev.filter(id => id !== widgetId);
            }
            return [...prev, widgetId];
        });
    }, []);

    const handleRemoveWidget = useCallback((widgetId: string) => {
        setActiveWidgetIds(prev => prev.filter(id => id !== widgetId));
    }, []);

    const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
        setLayout(newLayout);
    }, []);

    const handleResetLayout = useCallback(() => {
        setActiveWidgetIds(['chat', 'tasks', 'files', 'whiteboard']);
        setLayout(widgetConfigs.map(w => w.defaultLayout));
    }, [widgetConfigs]);

    // Filter layout to only include active widgets
    const activeLayout = useMemo(() => {
        return layout.filter(l => activeWidgetIds.includes(l.i));
    }, [layout, activeWidgetIds]);

    // Render widget component based on ID
    const renderWidget = useCallback((widgetId: string) => {
        if (!notebookId) return null;

        switch (widgetId) {
            case 'chat':
                return <ChatWidget notebookId={notebookId} onRemove={handleRemoveWidget} />;
            case 'tasks':
                return <TasksWidget notebookId={notebookId} onRemove={handleRemoveWidget} />;
            case 'whiteboard':
                return <WhiteboardWidget notebookId={notebookId} onRemove={handleRemoveWidget} />;
            case 'files': // <--- ADD THIS CASE
                return <FilesWidget notebookId={notebookId} onRemove={handleRemoveWidget} />;
            default:
                return null;
        }
    }, [notebookId, handleRemoveWidget]);

    if (!notebookId) return null;

    return (
        <Layout
            title="Dashboard"
            notebookId={notebookId}
            chatSessions={chatSessions}
            currentChatId={currentChatId}
            loadingChats={loadingChats}
            creatingChat={creatingChat}
            isTyping={isTyping}
            isAuthenticated={isAuthenticated}
            user={user}
            createNewChat={createNewChat}
            switchToChat={switchToChat}
            handleDeleteChat={handleDeleteChat}
            isThreadTyping={isThreadTyping}
            forceRegularLayout={true}
        >
            <div className="relative h-full flex flex-col bg-background overflow-hidden">
                {/* Settings Button */}
                <div className="absolute top-4 right-4 z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2.5 rounded-xl bg-card border border-border shadow-lg hover:bg-muted transition-all"
                        title="Customize Dashboard"
                    >
                        <Settings2 size={18} />
                    </button>
                </div>

                {/* Grid Container */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {activeWidgetIds.length > 0 ? (
                        <ResponsiveGridLayout
                            className="layout"
                            layout={activeLayout}
                            cols={12}
                            rowHeight={50}
                            margin={[16, 16]}
                            containerPadding={[16, 16]}
                            onLayoutChange={handleLayoutChange}
                            draggableHandle=".widget-drag-handle"
                            isResizable={true}
                            isDraggable={true}
                            useCSSTransforms={true}
                        >
                            {activeWidgetIds.map(widgetId => (
                                <div key={widgetId} className="h-full">
                                    {renderWidget(widgetId)}
                                </div>
                            ))}
                        </ResponsiveGridLayout>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <Settings2 size={32} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Widgets Active</h3>
                            <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                                Click the settings button to add widgets to your dashboard.
                            </p>
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Add Widgets
                            </button>
                        </div>
                    )}
                </div>

                {/* Configuration Sidebar */}
                <DashboardSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    widgets={widgetConfigs}
                    activeWidgetIds={activeWidgetIds}
                    onToggleWidget={handleToggleWidget}
                    onResetLayout={handleResetLayout}
                />
            </div>
        </Layout>
    );
};

export default NotebookDashboard;