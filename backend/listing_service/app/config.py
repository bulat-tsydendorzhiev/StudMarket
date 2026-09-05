from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "listing-service"
    database_url: str = (
        "postgresql+psycopg://studmarket:studmarket@listing-db:5432/listing_db"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()