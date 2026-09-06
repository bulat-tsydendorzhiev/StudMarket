from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "listing-service"
    database_url: str = (
        "postgresql+psycopg://studmarket:studmarket@listing-db:5432/listing_db"
    )
    jwt_secret: str = "dev-only-secret-change-me-in-production-0123456789"
    jwt_algorithm: str = "HS256"
    jwt_cookie_name: str = "access_token"
    upload_dir: str = "/uploads"
    max_image_size_bytes: int = 5 * 1024 * 1024
    listing_expiration_days: int = 7
    expiration_check_interval_seconds: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()