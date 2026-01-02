# backend/api/routes/files_route.py

import os
import uuid
import shutil
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, constr
from typing import Optional, List

from backend.api.dependencies import get_file_service, get_ai_service
from backend.models import User, File
from backend.api.routes.auth_route import get_current_user
from backend.models.dtos.chat import SendMessageRequest
from backend.models.file import ProcessingStatus
from backend.services.ai_service import AIService
from backend.services.file_service import FileService

load_dotenv()

router = APIRouter()


class UpdateFileRequest(BaseModel):
    """
    Defines the request body for updating a file.
    All fields are optional for partial updates (PATCH).
    """
    filename: Optional[constr(min_length=1, max_length=255)] = None
    notebook_id: Optional[str] = None
    content: Optional[str] = None
    folder_id: Optional[str] = None


# Define audio MIME types
AUDIO_MIME_TYPES = {
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/flac',
    'audio/aac',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4'
}


def is_audio_file(content_type: str) -> bool:
    """Check if the file is an audio file based on content type."""
    if not content_type:
        return False
    return content_type.lower() in AUDIO_MIME_TYPES


MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


@router.post("/upload")
async def upload_file(
        file: UploadFile = FastAPIFile(...),
        notebook_id: str = None,
        transcribe: bool = True,
        voice_recording: bool = False,
        folder_id: str = None,
        target_file_id: str = None,
        current_user: User = Depends(get_current_user),
        file_service: FileService = Depends(get_file_service),
        ai_service: AIService = Depends(get_ai_service),
):
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed size"
        )

    # Temporary file tracking for cleanup
    temp_file_path = None
    temp_dir_to_remove = None

    try:
        final_filename = file.filename
        final_content_type = file.content_type
        # Default to the uploaded file stream
        file_object_to_upload = file.file

        # --- LOGIC: Handle Audio Conversion ---
        if is_audio_file(file.content_type):
            print(f"   > Detected audio upload: {file.filename} ({file.content_type})")

            # Convert to WAV using backend service
            # This returns a path on disk to the converted file
            temp_file_path, new_filename, new_content_type = await file_service.convert_to_wav(
                file.file,
                file.filename
            )

            # Identify the directory to clean up later
            if temp_file_path:
                temp_dir_to_remove = os.path.dirname(temp_file_path)

            # Update variables to point to the converted file
            final_filename = new_filename
            final_content_type = new_content_type

            # Open the converted file on disk to stream to S3
            # We must open in binary read mode
            file_object_to_upload = open(temp_file_path, "rb")
        # --------------------------------------

        unique_filename = file_service.generate_unique_filename(final_filename)

        # 1. Upload to S3 (SeaweedFS)
        s3_url = await file_service.upload_to_s3(
            file_obj=file_object_to_upload,
            object_name=unique_filename,
            content_type=final_content_type
        )

        # Close the local handle if it was a converted file
        if temp_file_path and hasattr(file_object_to_upload, 'close'):
            file_object_to_upload.close()

        # 2. Handle Content Storage for Text Files
        content_to_store = None
        if final_content_type and final_content_type.startswith('text/'):
            try:
                # If we converted, we don't have text content logic, but for safety:
                if not temp_file_path:
                    await file.seek(0)
                    file_content = await file.read()
                    content_to_store = file_content.decode('utf-8')
                else:
                    # If somehow we converted a text file (unlikely), read from s3
                    content_to_store = await file_service.get_text_content_from_s3(unique_filename)
            except Exception:
                content_to_store = await file_service.get_text_content_from_s3(unique_filename)

        # 3. Determine Initial Status
        status = ProcessingStatus.PROCESSING if (
                is_audio_file(final_content_type) and transcribe) else ProcessingStatus.COMPLETED

        file_record = None
        file_id_to_use = None

        # Only create DB record if this is NOT a temporary voice recording
        if not voice_recording:
            file_record: File | None = await file_service.create_file_record(
                user_id=str(current_user.user_id),
                filename=final_filename,  # Use the potentially new .wav name
                unique_filename=unique_filename,
                url=s3_url,
                content_type=final_content_type,
                file_size_bytes=file.size,  # Approximate size is fine
                notebook_id=notebook_id,
                processing_status=status,
                content=content_to_store,
                folder_id=folder_id
            )
            file_id_to_use = str(file_record.id)
        else:
            # Generate a temporary ID for tracking transcription
            file_id_to_use = f"temp-voice-{uuid.uuid4()}"

        if notebook_id:
            try:
                from backend.container import container
                import json

                redis_client = container.redis_client()

                event_data = {
                    "event": "file_update",
                    "data": {
                        "file_id": file_id_to_use,
                        "status": "PROCESSING",
                        "filename": final_filename,
                        "notebook_id": notebook_id,
                        "content_type": final_content_type
                    }
                }

                channel = f"sse:notebook_files:{notebook_id}"
                await redis_client.publish(channel, json.dumps(event_data))

            except Exception as e:
                print(f"Warning: Failed to publish loading event: {e}")

        # 4. Trigger AI Processing with URL
        if is_audio_file(final_content_type) and transcribe:
            await ai_service.transcribe_file(
                user_id=str(current_user.user_id),
                notebook_id=notebook_id,
                file_id=file_id_to_use,
                file_url=s3_url,
                filename=final_filename,
                content_type=final_content_type,
                target_file_id=target_file_id
            )
        elif content_to_store and file.filename.startswith("message-"):
            # Only generate name if a file record exists
            if file_record:
                await ai_service.generate_file_name(
                    notebook_id,
                    str(current_user.user_id),
                    content_to_store,
                    str(file_record.id)
                )

        return {
            "status": "success",
            "message": "File processed successfully",
            "data": {
                "file_id": file_id_to_use,
                "filename": final_filename,
                "unique_filename": file_record.unique_filename if file_record else unique_filename,
                "url": s3_url,
                "file_size": file_service.format_file_size(file.size),
                "processing_status": file_record.processing_status if file_record else status,
                "is_audio": is_audio_file(final_content_type),
                "folder_id": folder_id
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    finally:
        # Cleanup temporary conversion directory
        if temp_dir_to_remove and os.path.exists(temp_dir_to_remove):
            try:
                shutil.rmtree(temp_dir_to_remove)
            except Exception as e:
                print(f"Error cleaning up temp directory {temp_dir_to_remove}: {e}")


@router.get("/{notebook_id}")
async def get_user_files(
        notebook_id: str,
        current_user: User = Depends(get_current_user),
        file_service: FileService = Depends(get_file_service)
):
    try:
        files = await file_service.get_files_for_user(
            user_id=str(current_user.user_id),
            notebook_id=notebook_id
        )

        return {
            "status": "success",
            "message": f"Retrieved {len(files)} files",
            "data": [
                {
                    "file_id": str(file.id),
                    "filename": file.filename,
                    "unique_filename": file.unique_filename,
                    "url": file.url,
                    "content_type": file.content_type,
                    "file_size": file_service.format_file_size(file.file_size_bytes) if file.file_size_bytes else "0 B",
                    "processing_status": file.processing_status,
                    "thread_id": str(file.thread_id) if file.thread_id else None,
                    "run_id": file.run_id,
                    "created_at": file.created_at.isoformat() if file.created_at else None,
                    "updated_at": file.updated_at.isoformat() if file.updated_at else None,
                    "processing_result": file.processing_result if file.processing_result else None,
                    "content": file.content,
                    "folder_id": str(file.folder_id) if file.folder_id else None,
                }
                for file in files
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/download/{file_id}")
async def download_file_proxy(
        file_id: str,
        current_user: User = Depends(get_current_user),
        file_service: FileService = Depends(get_file_service),
):
    """
    Downloads a file by proxying the request to S3.
    This ensures we don't expose internal SeaweedFS URLs to the client.
    """
    try:
        # 1. Verify ownership
        file_record = await file_service.repo.get_by_id_and_user(
            file_id=file_id, user_id=str(current_user.user_id)
        )
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found or access denied")

        # 2. Get stream from S3 via service
        s3_stream = await file_service.get_file_stream_from_s3(file_record.unique_filename)

        # 3. Create generator for StreamingResponse
        # Note: boto3 stream is synchronous, ideally we chunk it
        def iterfile():
            # chunk size 4KB
            while True:
                chunk = s3_stream.read(4096)
                if not chunk:
                    break
                yield chunk

        # 4. Prepare headers
        media_type = file_record.content_type or "application/octet-stream"
        content_disposition = f'attachment; filename="{file_record.filename}"'

        return StreamingResponse(
            iterfile(),
            media_type=media_type,
            headers={"Content-Disposition": content_disposition}
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=f"Could not retrieve file: {str(e)}")


@router.patch("/{file_id}")
async def update_file_details(
        file_id: str,
        request: UpdateFileRequest,
        current_user: User = Depends(get_current_user),
        file_service: FileService = Depends(get_file_service)
):
    updates = request.dict(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    try:
        updated_file = await file_service.update_file(
            user_id=str(current_user.user_id),
            file_id=file_id,
            updates=updates
        )

        if not updated_file:
            raise HTTPException(status_code=404, detail="File not found or access denied")

        return {
            "status": "success",
            "message": "File updated successfully",
            "data": {
                "file_id": str(updated_file.id),
                "filename": updated_file.filename,
                "unique_filename": updated_file.unique_filename,
                "url": updated_file.url,
                "content_type": updated_file.content_type,
                "file_size": file_service.format_file_size(
                    updated_file.file_size_bytes) if updated_file.file_size_bytes else "0 B",
                "processing_status": updated_file.processing_status,
                "created_at": updated_file.created_at.isoformat() if updated_file.created_at else None,
                "updated_at": updated_file.updated_at.isoformat() if updated_file.updated_at else None,
                "folder_id": str(updated_file.folder_id) if updated_file.folder_id else None,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.post("/transcribe/{notebook_id}")
async def transcribe_file_endpoint(
        notebook_id: str,
        request: SendMessageRequest,
        current_user: User = Depends(get_current_user),
        ai_service: AIService = Depends(get_ai_service),
        file_service: FileService = Depends(get_file_service)
):
    try:
        # If the request contains a file_id, we need to fetch its URL
        if request.file_id:
            file_record = await file_service.repo.get_by_id_and_user(
                file_id=request.file_id,
                user_id=str(current_user.user_id)
            )
            if not file_record:
                raise HTTPException(status_code=404, detail="File not found")

            # Pass the S3 URL to the AI service
            await ai_service.transcribe_file(
                user_id=str(current_user.user_id),
                notebook_id=notebook_id,
                file_id=request.file_id,
                file_url=file_record.url,
                filename=file_record.filename,
                content_type=file_record.content_type
            )
        return {"status": "success", "message": "Transcription initiated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.post("/rewrite/{notebook_id}")
async def rewrite_file_content(
        notebook_id: str,
        request: SendMessageRequest,
        current_user: User = Depends(get_current_user),
        ai_service: AIService = Depends(get_ai_service),
        file_service: FileService = Depends(get_file_service)
):
    try:
        # Get the file record
        if not request.file_id:
            raise HTTPException(status_code=400, detail="file_id is required")

        file_record = await file_service.repo.get_by_id_and_user(
            file_id=request.file_id,
            user_id=str(current_user.user_id)
        )
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Get the content from the file
        original_content = file_record.content or ""
        if not original_content.strip():
            raise HTTPException(status_code=400, detail="File content is empty")

        # Initiate content rewriting
        await ai_service.rewrite_content(
            user_id=str(current_user.user_id),
            notebook_id=notebook_id,
            original_content=original_content,
            file_id=request.file_id
        )

        return {"status": "success", "message": "Content rewriting initiated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.post("/generate-tasks/{notebook_id}")
async def generate_file_tasks(
        notebook_id: str,
        request: SendMessageRequest,
        current_user: User = Depends(get_current_user),
        ai_service: AIService = Depends(get_ai_service),
        file_service: FileService = Depends(get_file_service)
):
    """
    Generate tasks from file content using AI.
    """
    try:
        # Get the file record
        if not request.file_id:
            raise HTTPException(status_code=400, detail="file_id is required")

        file_record = await file_service.repo.get_by_id_and_user(
            file_id=request.file_id,
            user_id=str(current_user.user_id)
        )
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Get the content from the file
        file_content = file_record.content or ""
        if not file_content.strip():
            raise HTTPException(status_code=400, detail="File content is empty")

        # Initiate task generation
        await ai_service.generate_tasks(
            user_id=str(current_user.user_id),
            notebook_id=notebook_id,
            file_content=file_content,
            file_id=request.file_id
        )

        return {"status": "success", "message": "Task generation initiated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.delete("/{file_id}")
async def delete_file(
        file_id: str,
        current_user: User = Depends(get_current_user),
        file_service: FileService = Depends(get_file_service)
):
    try:
        success = await file_service.delete_file(
            user_id=str(current_user.user_id),
            file_id=file_id
        )
        if not success:
            raise HTTPException(
                status_code=404,
                detail="File not found or access denied"
            )
        return {
            "status": "success",
            "message": "File deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/{notebook_id}/content")
async def get_notebook_content(
        notebook_id: str,
        current_user: User = Depends(get_current_user),
        file_service: FileService = Depends(get_file_service)
):
    try:
        content = await file_service.get_notebook_files_content(
            user_id=str(current_user.user_id),
            notebook_id=notebook_id
        )

        if not content:
            return {
                "status": "success",
                "message": "No files found or no content available",
                "data": {
                    "content": "",
                    "file_count": 0
                }
            }

        file_count = content.count("--- File:")

        return {
            "status": "success",
            "message": f"Retrieved content from {file_count} file(s)",
            "data": {
                "content": content,
                "file_count": file_count
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while retrieving content: {str(e)}"
        )


@router.post("/export/{notebook_id}")
async def export_notebook(
        notebook_id: str,
        notebook_name: str = "notebook",
        current_user: User = Depends(get_current_user),
        file_service: FileService = Depends(get_file_service)
):
    """
    Export all files in a notebook as a ZIP file.
    The ZIP file maintains the folder structure and includes all files.
    """
    try:
        # Generate ZIP file
        zip_buffer = await file_service.export_notebook_as_zip(
            user_id=str(current_user.user_id),
            notebook_id=notebook_id,
            notebook_name=notebook_name
        )

        # Prepare filename
        safe_notebook_name = file_service._sanitize_filename(notebook_name)
        filename = f"{safe_notebook_name}.zip"

        # Create streaming response
        def iterzip():
            # Read in chunks to avoid memory issues
            chunk_size = 8192
            while True:
                chunk = zip_buffer.read(chunk_size)
                if not chunk:
                    break
                yield chunk

        return StreamingResponse(
            iterzip(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export notebook: {str(e)}"
        )
