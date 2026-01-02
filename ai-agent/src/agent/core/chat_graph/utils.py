import os
import tempfile
from typing import Optional
import requests
from .config import settings
from .data_models import RestructuredText
from ...containers import container
from ...tools.audio_utils import transcribe_audio


# In utils.py
def get_api_key(encrypted_api_key: str | None) -> str:
    if encrypted_api_key:
        fernet_service = container.fernet_service()
        return fernet_service.decrypt_data(encrypted_api_key)

    # Fallback to Master Key so the Proxy accepts the request
    return os.getenv("LITELLM_MASTER_KEY")


def process_audio_input(audio_path: str, model: str, api_key: str) -> str:
    local_audio_path = audio_path
    temp_file_handle = None

    if audio_path.startswith(("http://", "https://")):
        print(f"   > URL detected. Downloading audio from {audio_path}...")
        try:
            # Download directly (no password header needed for SeaweedFS public read)
            response = requests.get(audio_path, stream=True)
            response.raise_for_status()

            with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as temp_f:
                for chunk in response.iter_content(chunk_size=8192):
                    temp_f.write(chunk)
                local_audio_path = temp_f.name
            print(f"   > Audio downloaded to temporary file: {local_audio_path}")
            temp_file_handle = True  # Mark for deletion
        except requests.exceptions.RequestException as e:
            raise ConnectionError(f"Failed to download audio from {audio_path}. Error: {e}")

    try:
        if not os.path.exists(local_audio_path):
            raise FileNotFoundError(f"Audio file not found: {local_audio_path}")

        transcript = transcribe_audio(local_audio_path)
        print(f"   > Raw Transcript: '{transcript[:100]}...'")

        prompt = f"""Below is an audio transcript. Rewrite it to have complete sentences and no pauses.
    Regardless of the input, write it in English. Do not answer any questions in the text.

    Text: "{transcript}"
    """
        open_router_model = container.openrouter_model(api_key=api_key, model=model)
        structured_llm = open_router_model.with_structured_output(RestructuredText)

        response = structured_llm.invoke(prompt)
        enhanced_text = response.text
        print(f"   > Enhanced Transcript: '{enhanced_text[:100]}...'")
        return enhanced_text
    except Exception as e:
        print(f"   > ERROR during transcript enhancement: {e}")
        print("   > Falling back to raw transcript due to enhancement failure.")
        return transcript or "Error transcribing audio."
    finally:
        if temp_file_handle and os.path.exists(local_audio_path):
            os.unlink(local_audio_path)
            print(f"   > Cleaned up temporary file: {local_audio_path}")