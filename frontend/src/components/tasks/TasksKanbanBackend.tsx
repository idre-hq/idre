import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    DndContext,
    DragOverlay,
    closestCenter, type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus, Archive, AlertCircle, Loader2, Eye, EyeOff, BarChart3, LayoutGrid } from "lucide-react";

// Services
import {
    TasksService,
    TaskStatus,
    TaskPriority,
    convertTaskResponse,
    type TaskUpdateRequest
} from "../../services/tasksService";

// Components
import {type Column, COLUMN_CONFIG, type NewTaskState, type Task} from "./kanban/types";
import KanbanColumn from "./kanban/KanbanColumn";
import { TaskDragOverlay } from "./kanban/TaskCard";
import { TaskCreationModal, TaskDetailModal, TaskEditModal, ConfirmationModal } from "./kanban/TaskModals";
import ArchivedTasksPanel from "./kanban/ArchivedTasksPanel";
import GanttChartView from "./gantt/GanttChartView";
import ConfirmDialog from "../ui/ConfirmDialog";

interface TasksKanbanProps {
    notebookId: string;
    viewMode?: 'notebook' | 'all';
    isWidget?: boolean; // <--- NEW PROP
}

const TasksKanbanBackend: React.FC<TasksKanbanProps> = ({
                                                            notebookId,
                                                            viewMode = 'notebook',
                                                            isWidget = false
                                                        }) => {
    // --- State ---
    const [columns, setColumns] = useState<Column[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [activeTaskOriginalColumn, setActiveTaskOriginalColumn] = useState<TaskStatus | null>(null);

    const isAllTasksView = viewMode === 'all';

    // UI Preferences
    const [showPriorities, setShowPriorities] = useState<boolean>(() => {
        const saved = localStorage.getItem('kanban-show-priorities');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [viewDisplay, setViewDisplay] = useState<'kanban' | 'gantt'>(() => {
        const saved = localStorage.getItem('tasks-view-display');
        return saved !== null ? JSON.parse(saved) : 'kanban';
    });

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedColumnId, setSelectedColumnId] = useState<TaskStatus | null>(null);

    // Modal States
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Confirmation States
    const [taskToArchive, setTaskToArchive] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

    // Archive State
    const [isArchivedPanelOpen, setIsArchivedPanelOpen] = useState(false);
    const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
    const [archivedSearchQuery, setArchivedSearchQuery] = useState("");
    const [isLoadingArchived, setIsLoadingArchived] = useState(false);

    // Form Data
    const [newTask, setNewTask] = useState<NewTaskState>({
        title: "", description: "", priority: "medium", tags: "", dueDate: ""
    });

    const canCreate = viewMode === 'notebook';

    // --- Data Fetching ---
    const fetchTasks = useCallback(async () => {
        try {
            setError(null);
            let taskList: Task[] = [];

            if (viewMode === 'all') {
                const response = await TasksService.getAllTasks();
                taskList = response.tasks.map(t => ({ ...convertTaskResponse(t), notebook: t.notebook }));
            } else {
                const response = await TasksService.getTasksByNotebookId(notebookId);
                taskList = response.tasks.map(convertTaskResponse);
            }

            const activeTaskList = taskList.filter(task => !task.archived);
            const newColumns: Column[] = COLUMN_CONFIG.map(config => ({
                ...config,
                tasks: activeTaskList.filter(task => task.status === config.id).sort((a, b) => (a.position || 0) - (b.position || 0))
            }));
            setColumns(newColumns);
            setArchivedTasks(taskList.filter(task => task.archived));
        } catch (err) {
            console.error("Error fetching tasks:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch tasks");
        } finally {
            setIsLoading(false);
        }
    }, [notebookId, viewMode]);

    const fetchArchivedTasks = useCallback(async () => {
        try {
            setIsLoadingArchived(true);
            let taskList: Task[] = [];
            if (viewMode === 'all') {
                const response = await TasksService.getAllTasks({ includeArchived: true });
                taskList = response.tasks.map(t => ({ ...convertTaskResponse(t), notebook: t.notebook }));
            } else {
                const response = await TasksService.getTasksByNotebookId(notebookId, { includeArchived: true });
                taskList = response.tasks.map(convertTaskResponse);
            }
            setArchivedTasks(taskList.filter(task => task.archived));
        } catch (err) {
            console.error("Error fetching archived tasks:", err);
        } finally {
            setIsLoadingArchived(false);
        }
    }, [notebookId, viewMode]);

    // --- Effects ---
    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    useEffect(() => {
        if (viewMode !== 'notebook' || !notebookId) return;
        const source = TasksService.connectToTaskUpdates(
            notebookId,
            (data) => { if (!('type' in data && data.type === 'connected')) fetchTasks(); },
            (error) => console.error("SSE error:", error)
        );
        return () => source.close();
    }, [notebookId, fetchTasks, viewMode]);

    useEffect(() => { if (isArchivedPanelOpen) fetchArchivedTasks(); }, [isArchivedPanelOpen, fetchArchivedTasks]);

    // Persist UI preferences
    useEffect(() => {
        localStorage.setItem('kanban-show-priorities', JSON.stringify(showPriorities));
    }, [showPriorities]);

    useEffect(() => {
        localStorage.setItem('tasks-view-display', JSON.stringify(viewDisplay));
    }, [viewDisplay]);

    // --- Handlers ---
    const resetForm = () => setNewTask({ title: "", description: "", priority: "medium", tags: "", dueDate: "" });

    const handleCreateTask = async () => {
        if (!newTask.title.trim() || !selectedColumnId) return;
        try {
            await TasksService.createTask(notebookId, {
                title: newTask.title.trim(),
                description: newTask.description.trim() || undefined,
                priority: newTask.priority as TaskPriority,
                tags: newTask.tags ? newTask.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
                due_date: newTask.dueDate || undefined,
                status: selectedColumnId,
            });
            setShowTaskModal(false);
            resetForm();
            await fetchTasks();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create task");
        }
    };

    const handleUpdateTask = async (taskId: string, updateData: TaskUpdateRequest) => {
        setIsUpdating(true);
        try {
            await TasksService.updateTask(taskId, updateData);
            setEditingTask(null);
            await fetchTasks();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update task");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleArchiveTaskRequest = (task: Task) => setTaskToArchive(task);

    const executeArchiveTask = async () => {
        if (!taskToArchive) return;
        try {
            await TasksService.archiveTask(taskToArchive.id);
            setTaskToArchive(null);
            await fetchTasks();
        } catch (err) {
            setError("Failed to archive");
            setTaskToArchive(null);
        }
    };

    const handleUnarchiveTask = async (task: Task) => {
        try {
            await TasksService.unarchiveTask(task.id);
            await fetchTasks();
            if (isArchivedPanelOpen) await fetchArchivedTasks();
        } catch (err) { setError("Failed to unarchive"); }
    };

    const handleDeleteTaskRequest = (task: Task) => setTaskToDelete(task);

    const executeDeleteTask = async () => {
        if (!taskToDelete) return;
        try {
            await TasksService.deleteTask(taskToDelete.id);
            setTaskToDelete(null);
            await fetchTasks();
            if (isArchivedPanelOpen) await fetchArchivedTasks();
        } catch (err) {
            setError("Failed to delete task");
            setTaskToDelete(null);
        }
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const foundTask = columns.flatMap(col => col.tasks).find(task => task.id === active.id);
        if (foundTask && !foundTask.archived) {
            setActiveTask(foundTask);
            const col = columns.find(col => col.tasks.some(task => task.id === active.id));
            setActiveTaskOriginalColumn(col?.id || null);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;
        const activeCol = columns.find(c => c.tasks.some(t => t.id === activeId));
        const overCol = columns.find(c => c.id === overId) || columns.find(c => c.tasks.some(t => t.id === overId));

        if (!activeCol || !overCol || activeCol.id === overCol.id) return;

        setColumns(prev => {
            const activeTasks = [...activeCol.tasks];
            const overTasks = [...overCol.tasks];
            const activeIndex = activeTasks.findIndex(t => t.id === activeId);
            const [movedTask] = activeTasks.splice(activeIndex, 1);

            movedTask.status = overCol.id;

            const overIndex = overTasks.findIndex(t => t.id === overId);
            if (overIndex >= 0) overTasks.splice(overIndex, 0, movedTask);
            else overTasks.push(movedTask);

            return prev.map(c => {
                if (c.id === activeCol.id) return { ...c, tasks: activeTasks };
                if (c.id === overCol.id) return { ...c, tasks: overTasks };
                return c;
            });
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        const originalColId = activeTaskOriginalColumn;
        setActiveTask(null);
        setActiveTaskOriginalColumn(null);

        if (!over || !originalColId) return;

        const activeId = active.id as string;
        const overId = over.id as string;
        const targetCol = columns.find(col => col.id === overId) || columns.find(c => c.tasks.some(t => t.id === overId));

        if (!targetCol) { fetchTasks(); return; }

        try {
            if (originalColId !== targetCol.id) {
                const newPosition = targetCol.tasks.findIndex(t => t.id === activeId);
                await TasksService.moveTask(activeId, { status: targetCol.id, position: Math.max(0, newPosition) });
            } else {
                const oldIndex = targetCol.tasks.findIndex(t => t.id === activeId);
                const newIndex = targetCol.tasks.findIndex(t => t.id === overId);
                if (oldIndex !== newIndex) {
                    setColumns(prev => prev.map(c => c.id === originalColId ? { ...c, tasks: arrayMove(c.tasks, oldIndex, newIndex) } : c));
                    await TasksService.reorderTask(activeId, { position: newIndex });
                }
            }
        } catch (err) {
            console.error(err);
            fetchTasks(); // Revert on error
        }
    };

    if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin mr-2"/> Loading...</div>;
    if (error) return <div className="h-full flex items-center justify-center flex-col"><AlertCircle className="text-red-500 mb-2"/>{error}<button onClick={fetchTasks} className="mt-4 text-primary underline">Retry</button></div>;

    const selectedColumn = columns.find(col => col.id === selectedColumnId);
    const allTasks = columns.flatMap(col => col.tasks);
    const handleTaskClick = (task: Task) => setViewingTask(task);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header: Hide if we are in widget mode */}
            {!isWidget && (
                <div className="border-b border-border bg-background flex-shrink-0 hidden md:block px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="text-left">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {viewMode === 'all' ? 'All Tasks' : 'Tasks'}
                                {viewDisplay === 'gantt' && ' - Timeline'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {viewDisplay === 'gantt' ? 'Timeline view of tasks with due dates' : 'Manage your workflow'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setIsArchivedPanelOpen(true); setArchivedSearchQuery(""); }}
                                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md flex items-center gap-2 transition-colors"
                            >
                                <Archive size={16} />
                                Archived
                                {archivedTasks.length > 0 && <span className="bg-secondary-foreground/10 px-2 py-0.5 rounded-full text-xs font-medium">{archivedTasks.length}</span>}
                            </button>
                            <button
                                onClick={() => setShowPriorities(!showPriorities)}
                                className={`px-3 py-2 text-sm hover:bg-secondary rounded-md flex items-center gap-2 transition-colors ${
                                    showPriorities ? 'text-foreground' : 'text-muted-foreground'
                                }`}
                                title={showPriorities ? "Hide priorities" : "Show priorities"}
                            >
                                {showPriorities ? <EyeOff size={16} /> : <Eye size={16} />}
                                Priorities
                            </button>
                            <button
                                onClick={() => setViewDisplay(viewDisplay === 'kanban' ? 'gantt' : 'kanban')}
                                className={`px-3 py-2 text-sm hover:bg-secondary rounded-md flex items-center gap-2 transition-colors ${
                                    viewDisplay === 'gantt' ? 'text-foreground' : 'text-muted-foreground'
                                }`}
                                title={viewDisplay === 'kanban' ? "Show Gantt chart" : "Show Kanban board"}
                            >
                                {viewDisplay === 'kanban' ? <BarChart3 size={16} /> : <LayoutGrid size={16} />}
                                {viewDisplay === 'kanban' ? 'Gantt' : 'Kanban'}
                            </button>
                            {canCreate && (
                                <button
                                    onClick={() => { setSelectedColumnId(TaskStatus.TODO); setShowTaskModal(true); resetForm(); }}
                                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                    <Plus size={16} /> Add Task
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Conditional rendering: Kanban or Gantt view */}
            {viewDisplay === 'kanban' ? (
                <div className={`flex-1 overflow-x-auto overflow-y-hidden ${isWidget ? 'p-2' : 'p-6'}`}>
                    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                        <div className="flex h-full gap-6 min-w-full">
                            {columns.map((column) => (
                                <div key={column.id} className={`${isWidget ? 'w-[260px]' : 'w-[320px]'} flex-shrink-0 h-full`}>
                                    <KanbanColumn
                                        column={column}
                                        onAddTask={(id) => { setSelectedColumnId(id); setShowTaskModal(true); resetForm(); }}
                                        onViewTask={setViewingTask}
                                        onEditTask={setEditingTask}
                                        onArchiveTask={handleArchiveTaskRequest}
                                        onUnarchiveTask={handleUnarchiveTask}
                                        onDeleteTask={handleDeleteTaskRequest}
                                        isMobile={isWidget} // Reuse isMobile styling for widgets
                                        canCreate={canCreate}
                                        showPriorities={showPriorities}
                                        isAllTasksView={isAllTasksView}
                                    />
                                </div>
                            ))}
                        </div>
                        {createPortal(
                            <DragOverlay>
                                {activeTask ? (
                                    <TaskDragOverlay
                                        task={activeTask}
                                        showPriorities={showPriorities}
                                        isAllTasksView={isAllTasksView}
                                    />
                                ) : null}
                            </DragOverlay>,
                            document.body
                        )}
                    </DndContext>
                </div>
            ) : (
                <GanttChartView
                    tasks={allTasks}
                    onTaskClick={handleTaskClick}
                />
            )}

            {/* Modals - All function correctly inside widget due to fixed positioning */}
            <TaskCreationModal
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                onSubmit={handleCreateTask}
                taskData={newTask}
                onTaskDataChange={setNewTask}
                columnTitle={selectedColumn?.title}
            />
            <TaskDetailModal
                isOpen={!!viewingTask}
                task={viewingTask}
                onClose={() => setViewingTask(null)}
            />
            <TaskEditModal
                task={editingTask}
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                onUpdate={handleUpdateTask}
                isUpdating={isUpdating}
            />
            <ConfirmationModal
                isOpen={!!taskToArchive}
                onClose={() => setTaskToArchive(null)}
                onConfirm={executeArchiveTask}
                title="Archive Task"
                message={`Are you sure you want to archive "${taskToArchive?.title}"? You can view it later in the Archived folder.`}
                confirmText="Archive"
                isDestructive={true}
            />
            <ConfirmDialog
                open={!!taskToDelete}
                title="Delete Task"
                message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
                onConfirm={executeDeleteTask}
                onCancel={() => setTaskToDelete(null)}
            />
            <ArchivedTasksPanel
                isOpen={isArchivedPanelOpen}
                onClose={() => setIsArchivedPanelOpen(false)}
                archivedTasks={archivedTasks}
                isLoading={isLoadingArchived}
                searchQuery={archivedSearchQuery}
                onSearchChange={setArchivedSearchQuery}
                onUnarchive={handleUnarchiveTask}
                onViewTask={setViewingTask}
                onEditTask={setEditingTask}
            />
        </div>
    );
};

export default TasksKanbanBackend;