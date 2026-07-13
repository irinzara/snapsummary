from django.conf import settings

_client = None

def get_client():
    global _client
    if _client is None:
        from groq import Groq
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client
