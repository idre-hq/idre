// Path: frontend/src/components/dashboard/widgets/WhiteboardWidget.tsx

import React from 'react';
import { PenTool } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import Whiteboard from '../../whiteboard/Whiteboard';

interface WhiteboardWidgetProps {
    notebookId: string;
    onRemove?: (id: string) => void;
}

export const WhiteboardWidget: React.FC<WhiteboardWidgetProps> = ({ notebookId, onRemove }) => {
    return (
        <WidgetWrapper
            id="whiteboard"
            title="Whiteboard"
            icon={<PenTool size={14} />}
            onRemove={onRemove}
        >
            <div className="h-full w-full">
                <Whiteboard whiteboardId={`dashboard-wb-${notebookId}`} />
            </div>
        </WidgetWrapper>
    );
};