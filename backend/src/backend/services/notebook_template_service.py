from typing import List, Dict, Any
from datetime import date, timedelta  # Changed: import date
from sqlalchemy.ext.asyncio import AsyncSession
from backend.services.file_service import FileService
from backend.services.folder_service import FolderService
from backend.services.task_service import TaskService
from backend.models.dtos.task_dtos import TaskCreateRequest, TaskStatusEnum, TaskPriorityEnum


class NotebookTemplateService:
    """
    Service for applying templates to newly created notebooks.
    Handles creation of initial files, folders, and tasks.
    """

    def __init__(
            self,
            session: AsyncSession,
            file_service: FileService,
            folder_service: FolderService,
            task_service: TaskService
    ):
        self.session = session
        self.file_service = file_service
        self.folder_service = folder_service
        self.task_service = task_service

    async def apply_content_creation_template(
            self,
            user_id: str,
            notebook_id: str
    ) -> None:
        """
        Apply the content creation template to a notebook.
        Creates root-level files, Resources folder, and Kanban tasks.
        """
        try:
            print(f"[TEMPLATE DEBUG] Applying to notebook {notebook_id}...")

            # Step 1: Create root-level markdown files
            await self._create_root_level_files(user_id, notebook_id)
            print("[TEMPLATE DEBUG] Root files created.")

            # Step 2: Create Resources folder with links.md
            await self._create_resources_folder(user_id, notebook_id)
            print("[TEMPLATE DEBUG] Folder created.")

            # Step 3: Create template Kanban tasks
            await self._create_template_tasks(user_id, notebook_id)
            print("[TEMPLATE DEBUG] Tasks created.")

            # Ensure everything is flushed to the session before returning
            await self.session.flush()

        except Exception as e:
            # Re-raise to allow transaction rollback or logging in parent
            print(f"[TEMPLATE DEBUG] Error in service: {e}")
            raise e

    async def _create_root_level_files(
            self,
            user_id: str,
            notebook_id: str
    ) -> None:
        """Create tasks.md and voiceover.md at notebook root."""
        root_files = ["tasks.md", "voiceover.md"]

        for filename in root_files:
            unique_filename = self.file_service.generate_unique_filename(filename)
            content = self._get_template_content(filename)

            await self.file_service.create_file_record(
                user_id=user_id,
                filename=filename,
                unique_filename=unique_filename,
                content=content,
                content_type="text/markdown",
                notebook_id=notebook_id,
                folder_id=None
            )

    async def _create_resources_folder(
            self,
            user_id: str,
            notebook_id: str
    ) -> None:
        """Create Resources folder with links.md file inside."""
        folder = await self.folder_service.create_folder(
            user_id=user_id,
            notebook_id=notebook_id,
            name="Resources",
            parent_id=None
        )

        await self.session.flush()

        if not folder or not folder.id:
            print("[TEMPLATE DEBUG] Warning: Folder creation returned no object or ID")
            return

        filename = "links.md"
        unique_filename = self.file_service.generate_unique_filename(filename)
        content = self._get_template_content(filename)

        await self.file_service.create_file_record(
            user_id=user_id,
            filename=filename,
            unique_filename=unique_filename,
            content=content,
            content_type="text/markdown",
            notebook_id=notebook_id,
            folder_id=str(folder.id)
        )

    async def _create_template_tasks(
            self,
            user_id: str,
            notebook_id: str
    ) -> None:
        """Create pre-populated Kanban tasks across all columns."""
        task_definitions = self._get_template_tasks()

        for task_def in task_definitions:
            task_request = TaskCreateRequest(**task_def)

            await self.task_service.create_task(
                user_id=user_id,
                notebook_id=notebook_id,
                task_data=task_request
            )

    @staticmethod
    def _get_template_content(filename: str) -> str:
        templates = {
            "tasks.md": """# Task Planning\n\n## Project Goals\nDefine what you want to achieve with this project.\n\n## Checklist\n- [ ] Brainstorm ideas\n- [ ] Conduct research\n- [ ] Draft content\n- [ ] Review and refine\n\n## Notes\n- Deadline: TBD\n- Priority: High\n""",
            "voiceover.md": """# Voiceover Script\n\n## Introduction (0:00 - 0:30)\n**Speaker:** "Hello and welcome to..."\n\n## Key Point 1 (0:30 - 2:00)\n**Speaker:** "The most important thing to remember is..."\n\n## Conclusion (2:00 - End)\n**Speaker:** "Thank you for watching."\n""",
            "links.md": """# Resources\n\n## References\n- [Google](https://google.com)\n- [Research Paper](https://example.com)\n\n## Media Assets\n- [Images](https://unsplash.com)\n- [Icons](https://lucide.dev)\n"""
        }

        return templates.get(filename, "# New File\n")

    @staticmethod
    def _get_template_tasks() -> List[Dict[str, Any]]:
        """
        Get template task definitions for the Kanban board.
        Returns: List of task dictionaries with all required fields.
        """
        # FIX: Use date.today() instead of datetime.now()
        today = date.today()

        return [
            # --- TO DO COLUMN (3 Tasks) ---
            {
                "title": "Initial Brainstorming",
                "description": "Come up with 5 solid ideas for the content. Focus on audience engagement.",
                "status": TaskStatusEnum.TODO.value,
                "priority": TaskPriorityEnum.HIGH.value,
                "due_date": today + timedelta(days=1),  # Due tomorrow
                "tags": ["planning", "creative"],
                "position": 0
            },
            {
                "title": "Market Research",
                "description": "Analyze competitors and gather reference links in Resources/links.md.",
                "status": TaskStatusEnum.TODO.value,
                "priority": TaskPriorityEnum.MEDIUM.value,
                "due_date": today + timedelta(days=2),  # Due in 2 days
                "tags": ["research", "market-analysis"],
                "position": 1
            },
            {
                "title": "Create Outline",
                "description": "Draft the structure in tasks.md using the Checklist section.",
                "status": TaskStatusEnum.TODO.value,
                "priority": TaskPriorityEnum.MEDIUM.value,
                "due_date": today + timedelta(days=3),  # Due in 3 days
                "tags": ["planning", "structure"],
                "position": 2
            },

            # --- IN PROGRESS COLUMN (1 Task) ---
            {
                "title": "Write First Draft",
                "description": "Start writing the script in voiceover.md. Focus on the introduction first.",
                "status": TaskStatusEnum.IN_PROGRESS.value,
                "priority": TaskPriorityEnum.HIGH.value,
                "due_date": today,  # Due today (Urgent)
                "tags": ["writing", "core-work"],
                "position": 0
            },

            # --- REVIEW COLUMN (1 Task) ---
            {
                "title": "Self Review",
                "description": "Read through the draft out loud to check for flow and timing.",
                "status": TaskStatusEnum.REVIEW.value,
                "priority": TaskPriorityEnum.LOW.value,
                "due_date": today + timedelta(days=5),  # Due next week
                "tags": ["editing", "quality-control"],
                "position": 0
            },

            # --- DONE COLUMN (1 Task) ---
            {
                "title": "Setup Notebook",
                "description": "Notebook initialized with default templates and folder structure.",
                "status": TaskStatusEnum.DONE.value,
                "priority": TaskPriorityEnum.LOW.value,
                "due_date": today,  # Done today
                "tags": ["system", "setup"],
                "position": 0
            }
        ]