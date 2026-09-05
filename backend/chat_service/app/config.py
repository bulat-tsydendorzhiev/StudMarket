from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "chat-service"
    database_url: str = (
        "postgresql+psycopg://studmarket:studmarket@chat-db:5432/chat_db"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()