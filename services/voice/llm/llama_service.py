# UNTESTED — requires GPU deployment and real call verification

import os
from typing import Optional


def _env(name: str, fallback: Optional[str] = None) -> str:
    val = os.getenv(name)
    if val is None or val == "":
        if fallback is None:
            raise RuntimeError(f"Missing required environment variable: {name}")
        return fallback
    return val


def create_llama_llm_service(*, temperature: float = 0.35):
    """
    Create an OpenAI-compatible LLM service pointing at a local vLLM endpoint.

    We keep this as a separate module so Phase 2 can route between local Llama
    and Claude without duplicating configuration in `pipecat-server.py`.
    """
    # vLLM/OpenAI-compatible endpoint. Example:
    #   VLLM_BASE_URL=http://llm:8000/v1
    base_url = _env("VLLM_BASE_URL")
    api_key = os.getenv("VLLM_API_KEY", "")  # OpenAI-compatible servers may ignore it.
    model = os.getenv("VLLM_MODEL", "llama-3.3-8b-instruct")

    # Imported here so the module can be imported safely even if Pipecat
    # OpenAI extras aren't installed in non-voice environments.
    from pipecat.services.openai.llm import OpenAILLMService

    return OpenAILLMService(
        api_key=api_key,
        base_url=base_url,
        model=model,
        settings=OpenAILLMService.Settings(temperature=temperature),
    )

