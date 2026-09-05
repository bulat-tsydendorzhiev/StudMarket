from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "api-gateway"
    cors_origins: str = "http://localhost:5173"
    auth_service_url: str = "http://auth-service:8000"
    listing_service_url: str = "http://listing-service:8000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


def get_cors_origins() -> list[str]:
    return [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]