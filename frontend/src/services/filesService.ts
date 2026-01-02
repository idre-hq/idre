// src/services/filesService.ts

import {API_CONFIG} from "./api.ts";

export interface FolderData {
    id: string;
    name: string;
    parent_id: string | null;
}

export interface ProcessingResult {
    transcription?: string;
    language?: string;
    duration?: number;

    [key: string]: any; // Allow additional fields
}

export interface FileUploadResponse {
    filename: string;
    file_id: string;
    url: string; // This is the internal S3 URL (http://seaweedfs:8333/...)
    processing_status: string;
    is_audio: boolean;
}

export interface FileData {
    file_id: string;
    filename: string;
    unique_filename: string;
    url: string;
    content_type: string;
    file_size: string;
    processing_status: string;
    content: string;
    thread_id: string | null;
    run_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    processing_result: ProcessingResult | null;
    folder_id: string | null;
}

export interface FileListResponse {
    status: string;
    message: string;
    data: Array<FileData>;
}

export interface UpdateFilePayload {
    filename?: string;
    notebook_id?: string;
    content?: string;
    content_type?: string;
    folder_id?: string | null;
}

export interface UpdatedFileData {
    file_id: string;
    filename: string;
    unique_filename: string;
    url: string;
    content_type: string | null;
    file_size: string;
    processing_status: string;
    created_at: string | null;
    updated_at: string | null;
    folder_id: string | null;
}

export interface UpdateFileApiResponse {
    status: string;
    message: string;
    data: UpdatedFileData;
}

// Configuration
const FILE_BACKEND_SERVICE_URL = API_CONFIG.getApiUrl() + '/files'

// Upload service
export const fileService = {
    /**
     * Get Folders
     */
    getFolders: async (notebook_id: string): Promise<FolderData[]> => {
        const response = await fetch(`${API_CONFIG.getApiUrl()}/folders/${notebook_id}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error("Failed to fetch folders");
        const res = await response.json();
        return res.data;
    },

    createFolder: async (notebook_id: string, name: string, parent_id: string | null = null): Promise<FolderData> => {
        const response = await fetch(`${API_CONFIG.getApiUrl()}/folders/`, {
            method: 'POST',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({notebook_id, name, parent_id})
        });
        if (!response.ok) throw new Error("Failed to create folder");
        const res = await response.json();
        return res.data;
    },

    moveFile: async (file_id: string, folder_id: string | null): Promise<void> => {
        // We reuse the update endpoint
        await fileService.updateFile(file_id, {folder_id});
    },

    /**
     * Upload a file
     * Updated to accept targetFileId
     */
    uploadFile: async (
        file: File,
        notebook_id?: string,
        transcribe: boolean = true,
        voice_recording: boolean = false,
        folder_id: string | null = null,
        targetFileId: string | null = null // <--- ADDED PARAMETER
    ): Promise<FileUploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);

        let uploadUrl = `${FILE_BACKEND_SERVICE_URL}/upload`;
        const params = new URLSearchParams();
        if (notebook_id) {
            params.append('notebook_id', notebook_id);
        }
        params.append('transcribe', transcribe.toString());
        params.append('voice_recording', voice_recording.toString());

        if (folder_id) {
            params.append('folder_id', folder_id);
        }

        // <--- ADDED QUERY PARAM LOGIC
        if (targetFileId) {
            params.append('target_file_id', targetFileId);
        }

        if (params.toString()) {
            uploadUrl += `?${params.toString()}`;
        }

        const response = await fetch(uploadUrl, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`File upload failed: ${response.statusText} (${errorText})`);
        }

        const result = await response.json();
        return {
            filename: result.data.filename,
            file_id: result.data.file_id,
            url: result.data.url,
            processing_status: result.data.processing_status,
            is_audio: result.data.is_audio
        };
    },

    /**
     * Get user files for a notebook
     */
    getUserFiles: async (notebook_id: string): Promise<FileListResponse> => {
        const response = await fetch(`${FILE_BACKEND_SERVICE_URL}/${notebook_id}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch files: ${response.statusText} (${errorText})`);
        }

        return response.json();
    },

    /**
     * Transcribe an audio file
     */
    transcribeFile: async (notebook_id: string, audio_path: string, file_id: string): Promise<void> => {
        const response = await fetch(`${FILE_BACKEND_SERVICE_URL}/transcribe/${notebook_id}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audio_path,
                file_id
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Transcription failed: ${response.statusText} (${errorText})`);
        }
    },

    /**
     * Update a file's details.
     */
    updateFile: async (file_id: string, updates: UpdateFilePayload): Promise<UpdateFileApiResponse> => {
        const response = await fetch(`${FILE_BACKEND_SERVICE_URL}/${file_id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update file: ${response.statusText} (${errorText})`);
        }

        return response.json();
    },

    /**
     * Download a file by file_id
     */
    downloadFile: async (file_id: string): Promise<Blob> => {
        const response = await fetch(`${FILE_BACKEND_SERVICE_URL}/download/${file_id}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`File download failed: ${response.statusText} (${errorText})`);
        }

        return response.blob();
    },

    /**
     * Delete a file
     */
    deleteFile: async (file_id: string): Promise<void> => {
        const response = await fetch(`${FILE_BACKEND_SERVICE_URL}/${file_id}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`File deletion failed: ${response.statusText} (${errorText})`);
        }
    },

    /**
     * Delete a folder
     */
    deleteFolder: async (folder_id: string): Promise<void> => {
        const response = await fetch(`${API_CONFIG.getApiUrl()}/folders/${folder_id}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Folder deletion failed: ${response.statusText} (${errorText})`);
        }
    },

    /**
     * Update a folder's details
     */
    updateFolder: async (folder_id: string, updates: { name?: string }): Promise<FolderData> => {
        const response = await fetch(`${API_CONFIG.getApiUrl()}/folders/${folder_id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update folder: ${response.statusText} (${errorText})`);
        }

        const res = await response.json();
        return res.data;
    },

    /**
     * Rewrite content of a file
     */
    rewriteContent: async (notebook_id: string, file_id: string): Promise<void> => {
        const response = await fetch(`${FILE_BACKEND_SERVICE_URL}/rewrite/${notebook_id}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_id: file_id,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Content rewriting failed: ${response.statusText} (${errorText})`);
        }
    },

    /**
     * Generate tasks from file content
     */
    generateTasks: async (notebook_id: string, file_id: string): Promise<void> => {
        const response = await fetch(`${FILE_BACKEND_SERVICE_URL}/generate-tasks/${notebook_id}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_id: file_id,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Task generation failed: ${response.statusText} (${errorText})`);
        }
    },

    /**
     * Export notebook as ZIP file
     */
    exportNotebookAsZip: async (notebook_id: string, notebook_name: string): Promise<void> => {
        const url = `${FILE_BACKEND_SERVICE_URL}/export/${notebook_id}`;
        const params = new URLSearchParams();
        params.append('notebook_name', notebook_name);
        
        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Export failed: ${response.statusText} (${errorText})`);
        }

        // Get the blob and create download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${notebook_name.replace(/[^a-z0-9]/gi, '_')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    },
};
