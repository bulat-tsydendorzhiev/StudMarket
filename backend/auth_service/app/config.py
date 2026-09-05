from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "auth-service"
    database_url: str = (
        "postgresql+psycopg://studmarket:studmarket@auth-db:5432/auth_db"
    )
    jwt_secret: str = "dev-only-secret-change-me-in-production-0123456789"
    jwt_algorithm: str = "HS256"
    jwt_access_token_minutes: int = 60 * 24
    jwt_cookie_name: str = "access_token"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()