import React from 'react';
import TasksKanbanBackend from '../../tasks/TasksKanbanBackend';

export const KanbanWidget: React.FC<{ notebookId: string }> = ({ notebookId }) => {
    return (
        <div className="h-full w-full overflow-hidden text-xs">
            {/* We pass a prop to TasksKanban to tell it to be compact if needed, 
                or just render it as is. It scales relatively well. */}
            <TasksKanbanBackend notebookId={notebookId} viewMode="notebook" />
        </div>
    );
};