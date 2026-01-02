# backend/services/file_service.py

import os
import uuid
import time
import asyncio
import shutil
import tempfile
import subprocess
import zipfile
from io import BytesIO
from typing import List, Optional, Dict, Any, BinaryIO, Tuple

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.file import File, ProcessingStatus
from backend.repositories.file_repository import FileRepository
from backend.repositories.folder_repository import FolderRepository

load_dotenv()

# Configuration
S3_ENDPOINT = os.getenv("S3_ENDPOINT_URL", "http://seaweedfs:8333")
BUCKET_NAME = os.getenv("BUCKET_NAME", "my-local-bucket")


class FileService:
    """
    Service for handling file-related business logic, including S3 storage orchestration.
    """

    def __init__(self, session: AsyncSession, file_repository: FileRepository, s3_client=None, folder_repository=None):
        self.session = session
        self.repo = file_repository
        self.s3_client = s3_client
        self.folder_repo = folder_repository

    @staticmethod
    def format_file_size(size_bytes: int) -> str:
        """Format file size in bytes to human-readable format."""
        if size_bytes is None or size_bytes < 0:
            return "0 B"
        if size_bytes == 0:
            return "0 B"

        size_names = ["B", "KB", "MB", "GB", "TB"]
        size_index = 0
        size = float(size_bytes)

        while size >= 1024 and size_index < len(size_names) - 1:
            size /= 1024
            size_index += 1

        formatted_size = f"{size:.1f}".rstrip('0').rstrip('.')
        return f"{formatted_size} {size_names[size_index]}"

    def generate_unique_filename(self, original_filename: str) -> str:
        """Generate a unique filename for storage."""
        extension = ""
        if '.' in original_filename:
            extension = original_filename.rsplit('.', 1)[1].lower()

        unique_id = f"{int(time.time())}_{uuid.uuid4().hex}"
        return f"{unique_id}.{extension}" if extension else unique_id

    async def convert_to_wav(self, file_obj: BinaryIO, original_filename: str) -> Tuple[str, str, str]:
        """
        Converts input audio stream to a standard WAV format (16kHz, Mono, PCM).
        Returns: (path_to_converted_file, new_filename, content_type)
        """
        # Create a temporary directory for processing
        temp_dir = tempfile.mkdtemp()

        try:
            # 1. Save original stream to disk
            original_ext = os.path.splitext(original_filename)[1] or ".tmp"
            input_path = os.path.join(temp_dir, f"input{original_ext}")

            with open(input_path, "wb") as f:
                # Reset file pointer if needed (UploadFile.file is usually a SpooledTemporaryFile)
                if hasattr(file_obj, 'seek'):
                    file_obj.seek(0)
                shutil.copyfileobj(file_obj, f)

            # 2. Define output path
            output_filename = os.path.splitext(original_filename)[0] + ".wav"
            output_path = os.path.join(temp_dir, output_filename)

            # 3. Run FFmpeg conversion
            # -y: overwrite output files
            # -i: input file url
            # -ar 16000: set audio sampling rate to 16kHz (Ideal for Whisper)
            # -ac 1: set number of audio channels to 1 (Mono)
            # -c:a pcm_s16le: set audio codec to PCM signed 16-bit little-endian
            command = [
                "ffmpeg", "-y", "-i", input_path,
                "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
                output_path
            ]

            # Run in executor to avoid blocking async event loop
            loop = asyncio.get_running_loop()
            try:
                await loop.run_in_executor(
                    None,
                    lambda: subprocess.run(
                        command,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.PIPE,
                        check=True
                    )
                )
                print(f"   > Converted audio to WAV: {output_path}")
                return output_path, output_filename, "audio/wav"
            except subprocess.CalledProcessError as e:
                print(f"   > FFmpeg conversion failed: {e}")
                # If conversion fails, return the input path as a fallback
                return input_path, original_filename, "application/octet-stream"

        except Exception as e:
            print(f"   > Error in audio conversion: {e}")
            # Ensure cleanup happens later by caller or OS, but return input as fallback
            return input_path if 'input_path' in locals() else "", original_filename, "application/octet-stream"

    async def upload_to_s3(self, file_obj: BinaryIO, object_name: str, content_type: str) -> str:
        """
        Uploads a file object to S3 (SeaweedFS).
        Returns to internal URL.
        """
        if not self.s3_client:
            raise ValueError("S3 Client not configured")

        def _upload_sync():
            # 1. Ensure bucket exists (idempotent-ish)
            try:
                self.s3_client.head_bucket(Bucket=BUCKET_NAME)
            except Exception:
                try:
                    self.s3_client.create_bucket(Bucket=BUCKET_NAME)
                except Exception as e:
                    print(f"Error creating bucket (might already exist): {e}")

            # 2. Upload file
            # Note: upload_fileobj automatically handles multipart uploads for large files
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

            self.s3_client.upload_fileobj(
                file_obj,
                BUCKET_NAME,
                object_name,
                ExtraArgs={'ContentType': content_type}
            )

        # Run synchronous boto3 code in a separate thread to not block the async event loop
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _upload_sync)

        # Construct the URL (Internal Docker URL)
        # We store this URL so the AI agent (running in Docker) can reach it.
        file_url = f"{S3_ENDPOINT}/{BUCKET_NAME}/{object_name}"
        return file_url

    async def get_file_stream_from_s3(self, unique_filename: str):
        """
        Returns a stream (Body) of the file from S3.
        Useful for proxying downloads to the frontend.
        """
        if not self.s3_client:
            raise ValueError("S3 Client not configured")

        def _get_sync():
            return self.s3_client.get_object(Bucket=BUCKET_NAME, Key=unique_filename)

        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, _get_sync)
        return response['Body']

    async def get_file_bytes_from_s3(self, unique_filename: str) -> bytes:
        """
        Downloads a file from S3 and returns it as bytes.
        Safe for use in loops as it runs IO in executor.
        """
        if not self.s3_client:
            return b""

        def _read_sync():
            try:
                obj = self.s3_client.get_object(Bucket=BUCKET_NAME, Key=unique_filename)
                return obj['Body'].read()
            except Exception as e:
                # Log error but don't crash, return empty bytes so export can continue
                print(f"Error reading bytes from S3 ({unique_filename}): {e}")
                return b""

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _read_sync)

    async def get_text_content_from_s3(self, unique_filename: str) -> str:
        """
        Downloads a text file from S3 and returns it as a string.
        """
        if not self.s3_client:
            return ""

        def _read_sync():
            try:
                obj = self.s3_client.get_object(Bucket=BUCKET_NAME, Key=unique_filename)
                return obj['Body'].read().decode('utf-8')
            except Exception as e:
                print(f"Error reading text from S3 ({unique_filename}): {e}")
                return ""

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _read_sync)

    async def create_file_record(
            self,
            user_id: str,
            filename: str,
            unique_filename: str,
            url: Optional[str] = None,
            content_type: Optional[str] = None,
            file_size_bytes: Optional[int] = None,
            notebook_id: Optional[str] = None,
            processing_status: Optional[ProcessingStatus] = ProcessingStatus.PENDING,
            content: Optional[str] = None,
            folder_id: Optional[str] = None,
    ) -> File:
        """Create a file record in the database."""
        file_record = await self.repo.create(
            user_id=user_id,
            filename=filename,
            unique_filename=unique_filename,
            url=url,
            content_type=content_type,
            file_size_bytes=file_size_bytes,
            notebook_id=notebook_id,
            processing_status=processing_status,
            content=content,
            folder_id=folder_id
        )
        await self.session.commit()
        await self.session.refresh(file_record)
        return file_record

    async def get_files_for_user(self, user_id: str, notebook_id: Optional[str] = None) -> List[File]:
        """Retrieve all files for a user."""
        return await self.repo.list_by_user_id(user_id=user_id, notebook_id=notebook_id)

    async def update_file(
            self,
            user_id: str,
            file_id: str,
            updates: Dict[str, Any],
            merge_processing_result: bool = False,
    ) -> Optional[File]:
        """Update a file record."""
        file_to_update = await self.repo.get_by_id_and_user(file_id=file_id, user_id=user_id)
        if not file_to_update:
            return None
        file_record = await self.repo.update(
            file_id=file_id,
            updates=updates,
            merge_processing_result=merge_processing_result
        )

        if file_record:
            await self.session.commit()
            await self.session.refresh(file_record)

        return file_record

    async def delete_file(self, user_id: str, file_id: str) -> bool:
        """Delete a file record and S3 object."""
        file_record = await self.repo.get_by_id_and_user(file_id=file_id, user_id=user_id)
        if not file_record:
            return False

        # 1. Delete from S3 (Best effort)
        if self.s3_client and file_record.unique_filename:
            try:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.s3_client.delete_object(Bucket=BUCKET_NAME, Key=file_record.unique_filename)
                )
            except Exception as e:
                print(f"Warning: Failed to delete S3 object {file_record.unique_filename}: {e}")

        # 2. Delete from DB
        success = await self.repo.delete(file_id=file_id)
        if success:
            await self.session.commit()
        return success

    async def get_notebook_files_content(self, user_id: str, notebook_id: str) -> str:
        """
        Retrieve and concatenate all file contents for a given notebook.
        Fetches text directly from S3, or transcriptions from the DB.
        """
        files = await self.repo.list_by_user_id(user_id=user_id, notebook_id=notebook_id)
        if not files:
            return ""

        content_parts = []
        for file in files:
            try:
                # Text files: fetch content from S3
                if file.content_type and file.content_type.startswith('text/'):
                    text_content = await self.get_text_content_from_s3(file.unique_filename)
                    if text_content:
                        content_parts.append(f"--- File: {file.filename} ---\n{text_content}")

                # Audio files: use stored transcription
                elif file.content_type and file.content_type.startswith('audio/'):
                    if file.processing_result and isinstance(file.processing_result, dict):
                        transcription = file.processing_result.get('transcription')
                        if transcription:
                            content_parts.append(f"--- File: {file.filename} (Transcription) ---\n{transcription}")

            except Exception as e:
                print(f"Error processing file {file.filename} for notebook context: {str(e)}")
                continue

        return "\n\n".join(content_parts)

    async def export_notebook_as_zip(self, user_id: str, notebook_id: str, notebook_name: str) -> BytesIO:
        """
        Export all files in a notebook as a ZIP file, maintaining folder structure.
        Returns a BytesIO object containing the ZIP file.
        """
        # Fetch all files and folders for the notebook
        files = await self.repo.list_by_user_id(user_id=user_id, notebook_id=notebook_id)

        # Create a BytesIO buffer for the ZIP
        zip_buffer = BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Create a folder with the notebook name
            safe_notebook_name = self._sanitize_filename(notebook_name or "notebook")
            base_folder = f"{safe_notebook_name}/"

            # Fetch all folders to build folder structure
            folders = []
            if self.folder_repo:
                folders = await self.folder_repo.list_by_notebook(user_id=user_id, notebook_id=notebook_id)

            # Create folder structure in ZIP
            for folder in folders:
                folder_path = self._get_folder_path(folder, folders)
                zip_path = f"{base_folder}{folder_path}/"
                zipf.writestr(zip_path, "")  # Create empty directory entry

            # Add files to ZIP
            for file in files:
                try:
                    file_content = b""

                    # 1. Try DB content first (Source of truth for text/template files)
                    if file.content:
                        if isinstance(file.content, str):
                            file_content = file.content.encode('utf-8')
                        else:
                            file_content = file.content

                    # 2. If DB content is empty, try S3 (Images, Audio, or legacy text)
                    # Only try if we have a unique_filename, which implies a backing file
                    elif file.unique_filename:
                        try:
                            file_content = await self.get_file_bytes_from_s3(file.unique_filename)
                        except Exception as s3_err:
                            print(f"S3 fetch failed for {file.filename}: {s3_err}")
                            # Fallback to empty if S3 fails
                            file_content = b""

                    # Determine the path within the ZIP
                    if file.folder_id:
                        # Find the folder safely using string comparison for UUIDs
                        folder = next((f for f in folders if str(f.id) == str(file.folder_id)), None)
                        if folder:
                            folder_path = self._get_folder_path(folder, folders)
                            zip_path = f"{base_folder}{folder_path}/{file.filename}"
                        else:
                            # Folder not found, put in root
                            zip_path = f"{base_folder}{file.filename}"
                    else:
                        # No folder, put in root
                        zip_path = f"{base_folder}{file.filename}"

                    # Add file to ZIP
                    zipf.writestr(zip_path, file_content)

                except Exception as e:
                    print(f"Error adding file {file.filename} to ZIP: {e}")
                    continue

        # Reset buffer position
        zip_buffer.seek(0)
        return zip_buffer

    def _get_folder_path(self, folder: Any, all_folders: List[Any], path: str = "") -> str:
        """
        Recursively build folder path by traversing parent folders.
        """
        current_path = folder.name if not path else f"{folder.name}/{path}"

        # Find parent folder
        if folder.parent_id:
            parent = next((f for f in all_folders if str(f.id) == str(folder.parent_id)), None)
            if parent:
                return self._get_folder_path(parent, all_folders, current_path)

        return current_path

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename for safe file system usage.
        """
        # Remove or replace invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        return filename.strip()