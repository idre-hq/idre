// frontend/src/components/drive/DriveBrowser.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus } from 'lucide-react';
import SidebarExplorer from './SidebarExplorer';
import { useDriveLogic } from '../../hooks/useDriveLogic';
import ConfirmDialog from '../ui/ConfirmDialog';
import { type FileData } from '../../services/filesService';

interface DriveBrowserProps {
    notebookId: string;
    notebookName?: string;
    isWidget?: boolean;
    className?: string;
}

const DriveBrowser: React.FC<DriveBrowserProps> = ({ notebookId, isWidget = false, className = "" }) => {
    const navigate = useNavigate();

    const {
        files, folders, currentFolderId, setCurrentFolderId, fetchFiles,
        activeFileId, isFileDirty,
        isCreateModalOpen, setIsCreateModalOpen,
        newFileName, setNewFileName,
        fileToDelete, setFileToDelete,
        confirmDialog, setConfirmDialog,
        handleOpenFile, createFolder, moveFile,
        initiateCreateFile, confirmCreateFile,
        confirmDeleteFile, confirmDelete,
        onUploadInputChange, onFileDelete, onFileRename,
        onFileDownload, onFolderDelete, onFolderRename,
        onBulkDelete, onBulkDownload
    } = useDriveLogic(notebookId);

    const handleDoubleClick = (file: FileData) => {
        if (isWidget) {
            navigate(`/files/${notebookId}?file=${file.file_id}`);
        } else {
            handleOpenFile(file);
        }
    };

    return (
        <div className={`h-full w-full flex flex-col bg-background relative overflow-hidden ${className}`}>

            <SidebarExplorer
                files={files}
                folders={folders}
                activeFileId={activeFileId}
                currentFolderId={currentFolderId}
                setCurrentFolderId={setCurrentFolderId}
                onFileClick={handleOpenFile}
                onFileDoubleClick={handleDoubleClick}
                onUpload={onUploadInputChange}
                onCreateFile={initiateCreateFile}
                onCreateFolder={createFolder}
                onRefresh={fetchFiles}
                onCloseSidebar={() => {}}
                isFileDirty={isFileDirty}
                onMoveFile={moveFile}
                onFileDelete={onFileDelete}
                onFileRename={onFileRename}
                onFileDownload={onFileDownload}
                onFolderDelete={onFolderDelete}
                onFolderRename={onFolderRename}
                onBulkDelete={onBulkDelete}
                onBulkDownload={onBulkDownload}
            />

            {/* Create File Modal - Mobile Optimized */}
            {isCreateModalOpen && (
                <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[1px] p-0 sm:p-4">
                    <div
                        className="bg-popover border border-border shadow-xl rounded-t-2xl sm:rounded-lg w-full sm:max-w-[320px] p-5 sm:p-4 animate-in slide-in-from-bottom sm:zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 mb-4 sm:mb-3">
                            <div className="p-2 sm:p-1.5 bg-primary/10 rounded-md text-primary">
                                <FilePlus size={20} className="sm:w-4 sm:h-4" />
                            </div>
                            <span className="font-semibold text-base sm:text-sm">New File</span>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); confirmCreateFile(e); }}>
                            <input
                                type="text"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                placeholder="Name..."
                                className="w-full bg-background border border-input rounded px-3 sm:px-2 py-2.5 sm:py-1.5 text-base sm:text-sm mb-4 sm:mb-3 focus:ring-1 focus:ring-primary outline-none"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3 sm:gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="text-sm sm:text-xs px-4 sm:px-2 py-2 sm:py-1 hover:bg-muted rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newFileName.trim()}
                                    className="text-sm sm:text-xs px-4 sm:px-2 py-2 sm:py-1 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete File Modal - Mobile Optimized */}
            {fileToDelete && (
                <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[1px] p-0 sm:p-4">
                    <div
                        className="bg-popover border border-border shadow-xl rounded-t-2xl sm:rounded-lg w-full sm:max-w-[320px] p-5 sm:p-4 animate-in slide-in-from-bottom sm:zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="font-semibold text-base sm:text-sm mb-2">Delete File?</h3>
                        <p className="text-sm sm:text-xs text-muted-foreground mb-5 sm:mb-4">Delete "{fileToDelete.filename}"?</p>
                        <div className="flex justify-end gap-3 sm:gap-2">
                            <button
                                onClick={() => setFileToDelete(null)}
                                className="text-sm sm:text-xs px-4 sm:px-2 py-2 sm:py-1 hover:bg-muted rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteFile}
                                className="text-sm sm:text-xs px-4 sm:px-2 py-2 sm:py-1 bg-destructive text-destructive-foreground rounded hover:opacity-90"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmDialog.isOpen}
                title={confirmDialog.type === 'file' ? 'Delete File' : 'Delete Folder'}
                message={confirmDialog.type === 'file' ? `Delete "${confirmDialog.name}"?` : `Delete folder "${confirmDialog.name}"?`}
                confirmText="Delete"
                type="danger"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, type: 'file', id: null, name: null })}
            />
        </div>
    );
};

export default DriveBrowser;
