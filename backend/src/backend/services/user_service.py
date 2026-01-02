# backend/services/user_service.py

import uuid
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User
from backend.repositories.user_repository import UserRepository
# ADDED IMPORTS
from backend.services.litellm_service import LiteLLMService
from backend.services.model_api_service import ModelApiService


class UserService:
    """
    Service for handling user-related business logic.
    """

    def __init__(
        self,
        session: AsyncSession,
        user_repository: UserRepository,
        fernet: Fernet,
        # INJECT NEW DEPENDENCIES
        litellm_service: LiteLLMService,
        model_api_service: ModelApiService
    ):
        self.session = session
        self.user_repo = user_repository
        self.fernet = fernet
        self.litellm_service = litellm_service
        self.model_api_service = model_api_service

    async def check_user_exist(self, user_id: uuid.UUID) -> bool:
        """Checks if a user exists based on their ID."""
        user = await self.user_repo.get_by_id(user_id)
        return user is not None

    async def get_user_by_email(self, email: str) -> User | None:
        """Retrieves a user from the database by their email address."""
        return await self.user_repo.get_by_email(email)

    async def get_user_by_username(self, username: str) -> User | None:
        """Retrieves a user from the database by their username."""
        return await self.user_repo.get_by_username(username)

    async def get_user_by_email_or_username(self, identifier: str) -> User | None:
        """Retrieves a user by either email or username for flexible login."""
        return await self.user_repo.get_by_email_or_username(identifier)

    async def get_user_by_id(self, user_id: uuid.UUID) -> User | None:
        """Retrieves a user from the database by their primary key (user_id)."""
        return await self.user_repo.get_by_id(user_id)

    async def create_user(
            self,
            email: str,
            username: str,
            password: str,
            name: str,
            surname: str,
            is_google_auth: bool = False
    ) -> User:
        # 1. Create User in DB
        new_user = User(
            email=email,
            username=username,
            hashed_password=password,
            name=name,
            surname=surname,
            is_google_auth=is_google_auth
        )
        self.user_repo.add(new_user)
        await self.session.commit()
        await self.session.refresh(new_user)

        # 2. Call LiteLLM to generate a Virtual Key (Free Tier)
        # Note: We cast UUID to str for the API call
        virtual_key = self.litellm_service.generate_key_for_user(
            user_id=str(new_user.user_id),
            plan_name="free",
            email=email
        )

        # 3. Encrypt and Save via ModelApiService
        # Since we removed BYOK, the user doesn't do this manually anymore.
        # The system does it automatically upon signup.
        if virtual_key:
            await self.model_api_service.upsert_api_key(
                user_id=str(new_user.user_id),
                raw_api_key=virtual_key
            )
            print(f"✅ Created managed AI key for user {new_user.user_id}")
        else:
            print(f"❌ Failed to generate AI key for user {new_user.user_id}")

        return new_user

    async def update_user_google_auth(self, user_id: uuid.UUID, is_google_auth: bool) -> User | None:
        """
        Updates the Google authentication flag for a user within a transaction.
        """
        user = await self.user_repo.get_by_id(user_id)
        if user:
            user.is_google_auth = is_google_auth
            await self.session.commit()
            await self.session.refresh(user)
        return user

    # --- Data Transformation Methods ---

    def encrypt_data(self, data: str) -> str:
        """Encrypts a string using the configured Fernet key."""
        encrypted_bytes = self.fernet.encrypt(data.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')

    def decrypt_data(self, data: str) -> str:
        """Decrypts a string using the configured Fernet key."""
        encrypted_bytes = data.encode('utf-8')
        return self.fernet.decrypt(encrypted_bytes).decode('utf-8')