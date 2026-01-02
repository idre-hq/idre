# backend/services/model_api_service.py

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.model_api import ModelApi
from .fernet_service import FernetService
from ..repositories.model_api_repository import ModelApiRepository


class ModelApiService:
    """
    Service class for managing ModelApi records.
    It handles the encryption of API keys before saving and decryption upon retrieval.
    """

    def __init__(
            self,
            session: AsyncSession,
            model_api_repository: ModelApiRepository,
            fernet_service: FernetService
    ):
        self.session = session
        self.repo = model_api_repository
        self.fernet_service = fernet_service

    async def upsert_api_key(self, user_id: str, raw_api_key: str) -> ModelApi:
        """
        Encrypts and then creates or updates an API key for a given user.
        """
        # Business Logic: Encrypt the key
        encrypted_value = self.fernet_service.encrypt_data(raw_api_key)

        # Delegate to repository
        model_api = await self.repo.upsert(user_id, encrypted_value)

        # Control the transaction
        await self.session.commit()
        await self.session.refresh(model_api)

        return model_api

    async def get_api_key_by_user_id(self, user_id: str) -> Optional[ModelApi]:
        """
        Retrieves the ModelApi record for a user (value remains encrypted).
        """
        return await self.repo.get_by_user_id(user_id)

    async def get_decrypted_api_key_value(self, user_id: str) -> Optional[str]:
        """
        Retrieves and decrypts the API key for a given user.
        """
        model_api = await self.repo.get_by_user_id(user_id)

        if not model_api or not model_api.value:
            return None

        # Business Logic: Decrypt the key
        try:
            return self.fernet_service.decrypt_data(model_api.value)
        except Exception as e:
            # Log this error appropriately in a real application
            print(f"Error decrypting API key for user {user_id}: {e}")
            return None

    async def require_api_key(self, user_id: str) -> str:
        """
        Requires an API key for the given user. Returns the decrypted API key
        or raises an exception if no API key is found.
        """
        api_key = await self.get_decrypted_api_key_value(user_id)
        if not api_key:
            raise ValueError("API key is required to use this application. Please set up your API key in the settings.")
        return api_key

    async def has_api_key(self, user_id: str) -> bool:
        """
        Checks if a user has an API key set up.
        """
        model_api = await self.repo.get_by_user_id(user_id)
        return model_api is not None and model_api.value is not None

    async def delete_api_key(self, user_id: str) -> bool:
        """
        Deletes the API key record for a given user and commits the transaction.
        """
        was_deleted = await self.repo.delete_by_user_id(user_id)

        if was_deleted:
            await self.session.commit()

        return was_deleted
