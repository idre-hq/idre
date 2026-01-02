# backend/src/backend/services/litellm_service.py

import os
import requests
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# SUBSCRIPTION CONFIGURATION
# Modify these values to change the limits for your users.
# ============================================================================
SUBSCRIPTION_PLANS = {
    "free": {
        "max_budget": 0.5,  # $1.00 Lifetime Limit (until topped up)
        "tpm_limit": 5000,  # Tokens Per Minute (Speed limit)
        "rpm_limit": 5,  # Requests Per Minute (Rate limit)
        # Restrict Free users to cheaper models only
        "models": ["*"]
    },
    "pro": {
        "max_budget": 20.00,  # $20.00 Lifetime Limit
        "tpm_limit": 200000,  # High speed limit
        "rpm_limit": 100,  # High rate limit
        "models": ["*"]  # Access to ALL models
    }
}


class LiteLLMService:
    """
    Service to interact with the internal LiteLLM Proxy Admin API.
    Handles generating keys, managing budgets, and updating plans.
    """

    def __init__(self):
        # The Master Key allows us to create/manage other keys
        self.master_key = os.getenv("LITELLM_MASTER_KEY")

        # The internal Docker URL to reach the proxy (default to port 4000)
        self.base_url = os.getenv("LITELLM_URL", "http://litellm:4000")

        if not self.master_key:
            print("WARNING: LITELLM_MASTER_KEY is not set. LiteLLMService will fail.")

    def _get_headers(self) -> Dict[str, str]:
        """Helper to get authentication headers."""
        return {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json"
        }

    def generate_key_for_user(self, user_id: str, plan_name: str = "free", email: str = None) -> Optional[str]:
        """
        Generates a Virtual Key for a user based on a specific subscription plan.
        Returns the raw key string (e.g., 'sk-litellm-...') or None on failure.
        """
        # 1. Get plan details (fallback to free if invalid plan name)
        plan = SUBSCRIPTION_PLANS.get(plan_name, SUBSCRIPTION_PLANS["free"])

        url = f"{self.base_url}/key/generate"

        # 2. Construct Payload
        payload = {
            "user_id": str(user_id),
            "metadata": {
                "user_email": email,
                "plan": plan_name
            },
            # Apply Limits from Plan
            "max_budget": plan["max_budget"],
            "tpm_limit": plan["tpm_limit"],
            "rpm_limit": plan["rpm_limit"],
            "models": plan["models"]
        }

        # 3. Call LiteLLM API
        try:
            print(f"Generating LiteLLM key for user {user_id} ({plan_name})...")
            response = requests.post(url, headers=self._get_headers(), json=payload)
            response.raise_for_status()

            data = response.json()
            # The 'key' field contains the actual string we need to save
            return data["key"]
        except Exception as e:
            print(f"Error generating LiteLLM key: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"LiteLLM Response: {e.response.text}")
            return None

    def upgrade_user_plan(self, existing_key: str, new_plan_name: str) -> bool:
        """
        Updates an existing key to match a new plan (e.g. Free -> Pro).
        This updates the max_budget and rate limits.
        """
        plan = SUBSCRIPTION_PLANS.get(new_plan_name)
        if not plan:
            print(f"Error: Plan '{new_plan_name}' does not exist.")
            return False

        url = f"{self.base_url}/key/update"

        payload = {
            "key": existing_key,
            "max_budget": plan["max_budget"],
            "tpm_limit": plan["tpm_limit"],
            "rpm_limit": plan["rpm_limit"],
            "models": plan["models"],
            "metadata": {"plan": new_plan_name}
        }

        try:
            response = requests.post(url, headers=self._get_headers(), json=payload)
            response.raise_for_status()
            print(f"Successfully upgraded key to plan: {new_plan_name}")
            return True
        except Exception as e:
            print(f"Error upgrading user plan: {e}")
            return False

    def top_up_user_budget(self, key: str, amount_to_add: float) -> Optional[float]:
        """
        Increases the max_budget for a specific key.
        Useful when a user buys a 'Top-Up' pack (e.g., $5 extra).
        Returns the NEW total budget limit.
        """
        info_url = f"{self.base_url}/key/info"
        update_url = f"{self.base_url}/key/update"

        try:
            # 1. Get current info to find the current limit
            info_response = requests.get(
                info_url,
                headers=self._get_headers(),
                params={"key": key}
            )
            info_response.raise_for_status()
            key_info = info_response.json()

            # Default to 0.0 if not set
            current_max_budget = key_info.get("max_budget") or 0.0

            # 2. Calculate new total
            new_budget = current_max_budget + amount_to_add

            # 3. Update the key
            update_payload = {
                "key": key,
                "max_budget": new_budget
            }

            requests.post(update_url, headers=self._get_headers(), json=update_payload)
            print(f"User budget increased from ${current_max_budget} to ${new_budget}")
            return new_budget

        except Exception as e:
            print(f"Error topping up budget: {e}")
            return None

    def get_user_usage(self, key: str) -> Dict[str, Any]:
        """
        Returns stats about the key: { "spend": 0.50, "max_budget": 1.00, "plan": "free" }
        Useful for showing a progress bar in the frontend.
        """
        url = f"{self.base_url}/key/info"
        try:
            response = requests.get(url, headers=self._get_headers(), params={"key": key})
            response.raise_for_status()
            data = response.json()

            return {
                "spend": data.get("spend", 0.0),
                "max_budget": data.get("max_budget", 0.0),
                "plan": data.get("metadata", {}).get("plan", "unknown")
            }
        except Exception as e:
            print(f"Error fetching usage: {e}")
            return {}