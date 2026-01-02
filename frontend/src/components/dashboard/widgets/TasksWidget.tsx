import React from 'react';
import { CheckSquare } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import TasksKanbanBackend from '../../tasks/TasksKanbanBackend';

interface TasksWidgetProps {
    notebookId: string;
    onRemove?: (id: string) => void;
}

export const TasksWidget: React.FC<TasksWidgetProps> = ({ notebookId, onRemove }) => {
    return (
        <WidgetWrapper
            id="tasks"
            title="Tasks"
            icon={<CheckSquare size={14} />}
            onRemove={onRemove}
        >
            {/*
                Wrapper to ensure correct context.
                Using text-xs will help cascade smaller fonts if your components rely on em/rem,
                though your components mostly use specific Tailwind classes.
            */}
            <div className="h-full w-full overflow-hidden text-xs">
                <TasksKanbanBackend
                    notebookId={notebookId}
                    viewMode="notebook"
                    isWidget={true} // Enables compact mode
                />
            </div>
        </WidgetWrapper>
    );
};