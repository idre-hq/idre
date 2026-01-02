from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.notebook import Notebook
from backend.models.thread import Thread
from backend.models.chat import Chat
from backend.models.file import File
from backend.repositories.notebook_repository import NotebookRepository
from backend.repositories.thread_repository import ThreadRepository
from backend.services.notebook_model_service import NotebookModelService


class NotebookService:
    """
    Orchestrates business logic for Notebooks and their related entities.
    """

    def __init__(
            self,
            session: AsyncSession,
            notebook_repository: NotebookRepository,
            notebook_model_service: NotebookModelService,
            thread_repository: ThreadRepository,
            file_service=None,
            folder_service=None,
            task_service=None,
            notebook_template_service=None
    ):
        self.session = session
        self.repo = notebook_repository
        self.thread_repo = thread_repository
        self.notebook_model_service = notebook_model_service
        self.file_service = file_service
        self.folder_service = folder_service
        self.task_service = task_service
        self.template_service = notebook_template_service

    async def create_notebook(self, user_id: str, emoji: str, title: str,
                              date: str, bg_color: str = '#4d4dff', text_color: str = '#ffffff') -> Notebook:
        """Creates a notebook and applies template, then commits the transaction."""
        print(f"[TEMPLATE DEBUG] Starting create_notebook for user {user_id}")

        # 1. Create notebook record
        notebook = await self.repo.create(
            user_id=user_id, emoji=emoji, title=title, date=date,
            bg_color=bg_color, text_color=text_color)

        print(f"[TEMPLATE DEBUG] Notebook created in session with ID: {notebook.id}")

        # 2. Commit immediately to ensure Notebook ID exists in DB for Foreign Keys
        await self.session.commit()
        await self.session.refresh(notebook)
        print("[TEMPLATE DEBUG] Notebook committed to DB.")

        # 3. Apply template if available
        if self.template_service:
            print("[TEMPLATE DEBUG] Template Service found. Applying template...")
            try:
                await self.template_service.apply_content_creation_template(
                    user_id=user_id,
                    notebook_id=str(notebook.id)
                )

                # Commit the template items
                await self.session.commit()
                print("[TEMPLATE DEBUG] Template applied and committed successfully.")

            except Exception as e:
                # Log error aggressively
                print(f"❌ [TEMPLATE DEBUG] ERROR: Template application failed: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("[TEMPLATE DEBUG] WARNING: No Template Service injected!")

        return notebook

    async def set_notebook_models(self, user_id: str, notebook_id: str):
        await self.notebook_model_service.get_notebook_model_by_id_and_type(
            notebook_id=notebook_id, model_type="light", user_id=user_id
        )
        await self.notebook_model_service.get_notebook_model_by_id_and_type(
            notebook_id=notebook_id, model_type="heavy", user_id=user_id
        )

    async def update_notebook(self, notebook_id: str, update_data: Dict[str, Any]) -> Optional[Notebook]:
        """Updates a notebook and commits the transaction."""
        notebook = await self.repo.update(notebook_id, update_data)
        if notebook:
            await self.session.commit()
            await self.session.refresh(notebook)
        return notebook

    async def delete_notebook(self, notebook_id: str) -> bool:
        """Deletes a notebook and commits the transaction."""
        was_deleted = await self.repo.delete_by_id(notebook_id)
        if was_deleted:
            await self.session.commit()
        return was_deleted

    async def create_thread_for_notebook(self, notebook_id: str, thread_id: str) -> Thread:
        """
        Creates a new thread for a notebook using the ThreadRepository
        and commits the transaction.
        """
        # The service orchestrates by using the appropriate repository.
        thread = await self.thread_repo.create(
            thread_id=thread_id,
            notebook_id=notebook_id
        )
        await self.session.commit()
        await self.session.refresh(thread)
        return thread

    # --- Read methods are simple pass-throughs to the repository ---

    async def get_notebook_by_id(self, notebook_id: str) -> Optional[Notebook]:
        return await self.repo.get_by_id(notebook_id)

    async def get_all_notebooks(self) -> List[Notebook]:
        return await self.repo.list_all()

    async def get_notebooks_for_user(self, user_id: str) -> List[Notebook]:
        return await self.repo.list_by_user_id(user_id)

    async def get_notebook_with_threads(self, notebook_id: str) -> Optional[Notebook]:
        return await self.repo.get_by_id_with_threads(notebook_id)

    async def get_threads_for_notebook(self, notebook_id: str) -> List[Thread]:
        return await self.repo.list_threads_for_notebook(notebook_id)

    async def get_chats_for_notebook(self, notebook_id: str) -> List[Chat]:
        return await self.repo.list_chats_for_notebook(notebook_id)

    async def get_files_for_notebook(self, notebook_id: str) -> List[File]:
        return await self.repo.list_files_for_notebook(notebook_id)