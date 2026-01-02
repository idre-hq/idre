import React, { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import DriveBrowser from '../../drive/DriveBrowser.tsx';
import { NotebookService } from '../../../services/notebooksService';

interface FilesWidgetProps {
    notebookId: string;
    onRemove?: (id: string) => void;
}

export const FilesWidget: React.FC<FilesWidgetProps> = ({ notebookId, onRemove }) => {
    const [notebookName, setNotebookName] = useState<string>('Notebook');

    useEffect(() => {
        const fetchNotebook = async () => {
            try {
                const notebook = await NotebookService.getNotebookById(notebookId);
                setNotebookName(notebook.title || 'Notebook');
            } catch (error) {
                console.error('Failed to fetch notebook:', error);
            }
        };

        fetchNotebook();
    }, [notebookId]);

    return (
        <WidgetWrapper
            id="files"
            title="File Explorer"
            icon={<FolderOpen size={14} />}
            onRemove={onRemove}
        >
            {/*
                We use relative positioning here so that absolute positioned modals
                inside DriveBrowser stay contained within the widget boundaries
                (or use fixed in backend component if you prefer them to break out).
            */}
            <div className="h-full w-full relative">
                <DriveBrowser
                    notebookId={notebookId}
                    notebookName={notebookName}
                    isWidget={true}
                />
            </div>
        </WidgetWrapper>
    );
};
