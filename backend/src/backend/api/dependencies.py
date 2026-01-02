# backend/api/dependencies.py

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.container import container, get_db_session
from backend.repositories.assistant_repository import AssistantRepository
from backend.repositories.chat_repository import ChatRepository
from backend.repositories.file_repository import FileRepository
from backend.repositories.folder_repository import FolderRepository
from backend.repositories.model_api_repository import ModelApiRepository
from backend.repositories.notebook_repository import NotebookRepository
from backend.repositories.proposition_repository import PropositionRepository
from backend.repositories.thread_repository import ThreadRepository
from backend.repositories.user_repository import UserRepository
from backend.repositories.notebook_model_repository import NotebookModelRepository
from backend.repositories.chat_model_repository import ChatModelRepository
from backend.repositories.generative_model_repository import GenerativeModelRepository
from backend.repositories.app_settings_repository import AppSettingsRepository
from backend.repositories.task_repository import TaskRepository
from backend.repositories.whiteboard_repository import WhiteboardRepository
from backend.services.ai_service import AIService
from backend.services.assistant_service import AssistantService
from backend.services.fernet_service import FernetService
from backend.services.file_service import FileService
from backend.services.folder_service import FolderService
from backend.services.task_service import TaskService
from backend.services.whiteboard_service import WhiteboardService
from backend.services.model_api_service import ModelApiService
from backend.services.chat_service import ChatService
from backend.services.notebook_service import NotebookService
from backend.services.notebook_model_service import NotebookModelService
from backend.services.chat_model_service import ChatModelService
from backend.services.generative_model_service import GenerativeModelService
from backend.services.app_settings_service import AppSettingsService
from backend.services.proposition_service import PropositionService
from backend.services.user_service import UserService
from backend.services.password import PasswordService
from backend.repositories.model_group_repository import ModelGroupRepository
from backend.services.model_group_service import ModelGroupService
from backend.services.litellm_service import LiteLLMService
from backend.services.notebook_template_service import NotebookTemplateService


def get_model_group_repository(
        session: AsyncSession = Depends(get_db_session)
) -> ModelGroupRepository:
    return container.model_group_repository(session=session)


def get_model_group_service(
        session: AsyncSession = Depends(get_db_session),
        model_group_repo: ModelGroupRepository = Depends(get_model_group_repository)
) -> ModelGroupService:
    return container.model_group_service(
        session=session,
        model_group_repository=model_group_repo
    )


def get_model_api_repository(
        session: AsyncSession = Depends(get_db_session)
) -> ModelApiRepository:
    return container.model_api_repository(session=session)


def get_chat_repository(
        session: AsyncSession = Depends(get_db_session)
) -> ChatRepository:
    return container.chat_repository(session=session)


def get_fernet_service() -> FernetService:
    return container.fernet_service()


def get_assistant_repository(
        session: AsyncSession = Depends(get_db_session)
) -> AssistantRepository:
    return container.assistant_repository(session=session)


def get_assistant_service(
        session: AsyncSession = Depends(get_db_session),
        assistant_repo: AssistantRepository = Depends(get_assistant_repository)
) -> AssistantService:
    return container.assistant_service(
        session=session,
        assistant_repository=assistant_repo
    )


def get_file_repository(
        session: AsyncSession = Depends(get_db_session)
) -> FileRepository:
    return container.file_repository(session=session)


def get_folder_repository(
        session: AsyncSession = Depends(get_db_session)
) -> FolderRepository:
    return container.folder_repository(session=session)


def get_file_service(
        session: AsyncSession = Depends(get_db_session),
        file_repo: FileRepository = Depends(get_file_repository),
        folder_repo: FolderRepository = Depends(get_folder_repository)
) -> FileService:
    return container.file_service(
        session=session,
        file_repository=file_repo,
        folder_repository=folder_repo
    )


def get_folder_service(
        session: AsyncSession = Depends(get_db_session),
        folder_repo: FolderRepository = Depends(get_folder_repository)
) -> FolderService:
    return container.folder_service(
        session=session,
        folder_repository=folder_repo
    )


def get_model_api_service(
        session: AsyncSession = Depends(get_db_session),
        model_api_repo: ModelApiRepository = Depends(get_model_api_repository),
        fernet_service: FernetService = Depends(get_fernet_service)
) -> ModelApiService:
    return container.model_api_service(
        session=session,
        model_api_repository=model_api_repo,
        fernet_service=fernet_service
    )


def get_litellm_service() -> LiteLLMService:
    return container.litellm_service()


def get_notebook_repository(
        session: AsyncSession = Depends(get_db_session)
) -> NotebookRepository:
    return container.notebook_repository(session=session)


def get_thread_repository(
        session: AsyncSession = Depends(get_db_session)
) -> ThreadRepository:
    return container.thread_repository(session=session)


def get_user_repository(
        session: AsyncSession = Depends(get_db_session)
) -> UserRepository:
    return container.user_repository(session=session)


def get_user_service(
        session: AsyncSession = Depends(get_db_session),
        user_repo: UserRepository = Depends(get_user_repository),
        fernet_service: FernetService = Depends(get_fernet_service),
        litellm_service: LiteLLMService = Depends(get_litellm_service),
        model_api_service: ModelApiService = Depends(get_model_api_service)
) -> UserService:
    return container.user_service(
        session=session,
        user_repository=user_repo,
        fernet=fernet_service,
        litellm_service=litellm_service,
        model_api_service=model_api_service
    )


def get_notebook_model_repository(
        session: AsyncSession = Depends(get_db_session)
) -> NotebookModelRepository:
    return container.notebook_model_repository(session=session)


def get_app_settings_repository(
        session: AsyncSession = Depends(get_db_session)
) -> AppSettingsRepository:
    return container.app_settings_repository(session=session)


def get_generative_model_repository(
        session: AsyncSession = Depends(get_db_session)
) -> GenerativeModelRepository:
    return container.generative_model_repository(session=session)


def get_app_settings_service(
        session: AsyncSession = Depends(get_db_session),
        repo: AppSettingsRepository = Depends(get_app_settings_repository)
) -> AppSettingsService:
    return container.app_settings_service(session=session, app_settings_repository=repo)


def get_generative_model_service(
        session: AsyncSession = Depends(get_db_session),
        repo: GenerativeModelRepository = Depends(get_generative_model_repository)
) -> GenerativeModelService:
    return container.generative_model_service(session=session, generative_model_repository=repo)


def get_proposition_repository(
        session: AsyncSession = Depends(get_db_session)
) -> PropositionRepository:
    return container.proposition_repository(session=session)


def get_proposition_service(
        session: AsyncSession = Depends(get_db_session),
        repo: PropositionRepository = Depends(get_proposition_repository)
) -> PropositionService:
    return container.proposition_service(session=session, proposition_repository=repo)


def get_notebook_model_service(
        session: AsyncSession = Depends(get_db_session),
        notebook_model_repo: NotebookModelRepository = Depends(get_notebook_model_repository),
        app_settings_service: AppSettingsService = Depends(get_app_settings_service),
        generative_model_service: GenerativeModelService = Depends(get_generative_model_service),
) -> NotebookModelService:
    return container.notebook_model_service(
        session=session,
        notebook_model_repository=notebook_model_repo,
        app_settings_service=app_settings_service,
        generative_model_service=generative_model_service,
    )


def get_chat_model_repository(
        session: AsyncSession = Depends(get_db_session)
) -> ChatModelRepository:
    return container.chat_model_repository(session=session)


def get_chat_model_service(
        session: AsyncSession = Depends(get_db_session),
        chat_model_repo: ChatModelRepository = Depends(get_chat_model_repository),
        generative_model_service: GenerativeModelService = Depends(get_generative_model_service)
) -> ChatModelService:
    return container.chat_model_service(session=session, chat_model_repository=chat_model_repo, generative_model_service=generative_model_service)


def get_ai_service(
        session: AsyncSession = Depends(get_db_session),
        model_api_service: ModelApiService = Depends(get_model_api_service),
        notebook_model_service: NotebookModelService = Depends(get_notebook_model_service),
        assistant_service: AssistantService = Depends(get_assistant_service)
) -> AIService:
    return container.ai_service(
        session=session,
        model_api_service=model_api_service,
        notebook_model_service=notebook_model_service,
        assistant_service=assistant_service
    )


def get_chat_service(
        session: AsyncSession = Depends(get_db_session),
        chat_repo: ChatRepository = Depends(get_chat_repository),
        thread_repo: ThreadRepository = Depends(get_thread_repository),
        notebooks_repo: NotebookRepository = Depends(get_notebook_repository),
        model_api_service: ModelApiService = Depends(get_model_api_service),
        notebook_model_service: NotebookModelService = Depends(get_notebook_model_service),
        chat_model_service: ChatModelService = Depends(get_chat_model_service),
        assistant_service: AssistantService = Depends(get_assistant_service),
        file_service: FileService = Depends(get_file_service),
        ai_service: AIService = Depends(get_ai_service)
) -> ChatService:
    return container.chat_service(
        session=session,
        chat_repository=chat_repo,
        thread_repository=thread_repo,
        notebook_repository=notebooks_repo,
        model_api_service=model_api_service,
        notebook_model_service=notebook_model_service,
        chat_model_service=chat_model_service,
        assistant_service=assistant_service,
        file_service=file_service,
        ai_service=ai_service
    )


def get_password_service() -> PasswordService:
    return container.password_service()


def get_task_repository(
        session: AsyncSession = Depends(get_db_session)
) -> TaskRepository:
    return container.task_repository(session=session)


def get_task_service(
        session: AsyncSession = Depends(get_db_session),
        task_repo: TaskRepository = Depends(get_task_repository)
) -> TaskService:
    return container.task_service(
        session=session,
        task_repository=task_repo
    )


# --- Separated Dependency for NotebookTemplateService ---
def get_notebook_template_service(
    session: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service),
    folder_service: FolderService = Depends(get_folder_service),
    task_service: TaskService = Depends(get_task_service)
) -> NotebookTemplateService:
    return container.notebook_template_service(
        session=session,
        file_service=file_service,
        folder_service=folder_service,
        task_service=task_service
    )


def get_notebook_service(
        session: AsyncSession = Depends(get_db_session),
        notebook_repo: NotebookRepository = Depends(get_notebook_repository),
        thread_repo: ThreadRepository = Depends(get_thread_repository),
        notebook_model_service: NotebookModelService = Depends(get_notebook_model_service),
        file_service: FileService = Depends(get_file_service),
        folder_service: FolderService = Depends(get_folder_service),
        task_service: TaskService = Depends(get_task_service),
        # Injected via Depends
        notebook_template_service: NotebookTemplateService = Depends(get_notebook_template_service)
) -> NotebookService:
    return container.notebook_service(
        session=session,
        notebook_repository=notebook_repo,
        thread_repository=thread_repo,
        notebook_model_service=notebook_model_service,
        file_service=file_service,
        folder_service=folder_service,
        task_service=task_service,
        notebook_template_service=notebook_template_service
    )


def get_whiteboard_repository(
        session: AsyncSession = Depends(get_db_session)
) -> WhiteboardRepository:
    return container.whiteboard_repository(session=session)


def get_whiteboard_service(
        session: AsyncSession = Depends(get_db_session),
        whiteboard_repo: WhiteboardRepository = Depends(get_whiteboard_repository)
) -> WhiteboardService:
    return container.whiteboard_service(
        session=session,
        whiteboard_repository=whiteboard_repo
    )
