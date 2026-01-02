import math

from fastapi import APIRouter, Depends, HTTPException, status, Query

from backend.api.dependencies import get_notebook_service, get_chat_service
from backend.models import User
from backend.api.routes.auth_route import get_current_user
from backend.models.dtos.chat import CreateThreadRequest
from backend.models.dtos.notebook_dtos import NotebookResponse, NotebookCreate, NotebooksListResponse, NotebookUpdate
from backend.services.chat_service import ChatService
from backend.services.notebook_service import NotebookService

router = APIRouter()


@router.post("", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
async def create_notebook(
        notebook_data: NotebookCreate,
        current_user: User = Depends(get_current_user),
        notebook_service: NotebookService = Depends(get_notebook_service),
        chat_service: ChatService = Depends(get_chat_service)
):
    """
    Create a new notebook.
    """
    try:
        notebook = await notebook_service.create_notebook(
            user_id=str(current_user.user_id),
            emoji=notebook_data.emoji,
            title=notebook_data.title,
            date=notebook_data.date,
            bg_color=notebook_data.bg_color,
            text_color=notebook_data.text_color,
        )

        await notebook_service.set_notebook_models(user_id=str(current_user.user_id), notebook_id=str(notebook.id))

        return NotebookResponse(
            id=str(notebook.id),
            emoji=notebook.emoji,
            title=notebook.title,
            date=notebook.date,
            bg_color=notebook.bg_color,
            text_color=notebook.text_color,
            created_at=notebook.created_at.isoformat() if notebook.created_at else None,
            updated_at=notebook.updated_at.isoformat() if notebook.updated_at else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.get("", response_model=NotebooksListResponse)
async def get_all_notebooks(
        page: int = Query(1, ge=1, description="Page number"),
        page_size: int = Query(20, ge=1, le=100, description="Items per page"),
        current_user: User = Depends(get_current_user),
        notebook_service: NotebookService = Depends(get_notebook_service)
):
    """
    Get paginated notebooks for the current user.
    """
    try:
        all_notebooks = await notebook_service.get_notebooks_for_user(user_id=str(current_user.user_id))

        all_notebooks.sort(
            key=lambda x: x.updated_at or x.created_at,
            reverse=True
        )

        total_items = len(all_notebooks)
        total_pages = math.ceil(total_items / page_size)

        if total_items > 0 and page > total_pages:
            page = total_pages

        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_items = all_notebooks[start_index:end_index]

        notebook_responses = [
            NotebookResponse(
                id=str(notebook.id),
                emoji=notebook.emoji,
                title=notebook.title,
                date=notebook.date,
                bg_color=notebook.bg_color,
                text_color=notebook.text_color,
                created_at=notebook.created_at.isoformat() if notebook.created_at else None,
                updated_at=notebook.updated_at.isoformat() if notebook.updated_at else None
            )
            for notebook in paginated_items
        ]

        return NotebooksListResponse(
            data=notebook_responses,
            status="success",
            message="Notebooks retrieved successfully",
            meta={
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


# --- ADDED THIS ENDPOINT ---
@router.get("/{notebook_id}", response_model=NotebookResponse)
async def get_notebook_by_id(
        notebook_id: str,
        current_user: User = Depends(get_current_user),
        notebook_service: NotebookService = Depends(get_notebook_service)
):
    """
    Get a single notebook by ID.
    """
    try:
        notebook = await notebook_service.get_notebook_by_id(notebook_id)

        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
            
        # Basic authorization check (assuming notebook has user_id field)
        if notebook.user_id != str(current_user.user_id):
             raise HTTPException(status_code=403, detail="Not authorized to access this notebook")

        return NotebookResponse(
            id=str(notebook.id),
            emoji=notebook.emoji,
            title=notebook.title,
            date=notebook.date,
            bg_color=notebook.bg_color,
            text_color=notebook.text_color,
            created_at=notebook.created_at.isoformat() if notebook.created_at else None,
            updated_at=notebook.updated_at.isoformat() if notebook.updated_at else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
# ---------------------------


@router.put("/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(
        notebook_id: str,
        notebook_data: NotebookUpdate,
        notebook_service: NotebookService = Depends(get_notebook_service)
):
    """
    Update a notebook.
    """
    try:
        notebook = await notebook_service.update_notebook(
            notebook_id=notebook_id,
            update_data={
                "emoji": notebook_data.emoji,
                "title": notebook_data.title,
                "date": notebook_data.date,
                "bg_color": notebook_data.bg_color,
                "text_color": notebook_data.text_color,
            }
        )

        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        return NotebookResponse(
            id=str(notebook.id),
            emoji=notebook.emoji,
            title=notebook.title,
            date=notebook.date,
            bg_color=notebook.bg_color,
            text_color=notebook.text_color,
            created_at=notebook.created_at.isoformat() if notebook.created_at else None,
            updated_at=notebook.updated_at.isoformat() if notebook.updated_at else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(
        notebook_id: str,
        notebook_service: NotebookService = Depends(get_notebook_service)
):
    """
    Delete a notebook.
    """
    try:
        deleted = await notebook_service.delete_notebook(notebook_id=notebook_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Notebook not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")