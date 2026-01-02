import os
import boto3
from botocore.client import Config
from cryptography.fernet import Fernet
from dependency_injector import containers, providers
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from agent.services.fernet_service import FernetService
from agent.tools.kokoroko_utils import TTSService

load_dotenv()


def create_fernet():
    """Factory function to create Fernet instance with environment validation"""
    load_dotenv()
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        raise ValueError("ENCRYPTION_KEY environment variable is not set.")
    return Fernet(encryption_key.encode())


def create_s3_client():
    """Factory function to create S3/SeaweedFS client"""
    load_dotenv()
    return boto3.client(
        's3',
        endpoint_url=os.getenv("S3_ENDPOINT_URL", "http://seaweedfs:8333"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "any"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "any"),
        config=Config(signature_version='s3v4'),
        region_name='us-east-1'
    )


# In ai-agent/src/agent/containers.py

def create_openrouter_model(api_key: str, model: str):
    # If no key provided, use Master Key from env (for testing Phase 2)
    final_key = api_key or os.getenv("LITELLM_MASTER_KEY")

    return ChatOpenAI(
        api_key=final_key,
        # CHANGED: Point to the Docker service name "litellm"
        base_url="http://litellm:4000",
        model=model
    )


def create_openai_model(api_key: str, model: str):
    """Factory function to create OpenAI ChatOpenAI instance"""
    if not api_key:
        raise ValueError("API key is required for OpenAI model")
    return ChatOpenAI(
        api_key=api_key,
        model=model
    )


class Container(containers.DeclarativeContainer):
    # Core Dependencies
    fernet = providers.Singleton(create_fernet)
    s3_client = providers.Singleton(create_s3_client)

    # Services
    fernet_service = providers.Factory(
        FernetService,
        fernet=fernet
    )

    tts_service = providers.Factory(
        TTSService,
        s3_client=s3_client
    )

    # Models
    openrouter_model = providers.Factory(create_openrouter_model)
    openai_model = providers.Factory(create_openai_model)


container = Container()