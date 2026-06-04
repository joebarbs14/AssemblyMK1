from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/assembly"
    redis_url: str = "redis://localhost:6379/0"

    web_origin: str = "http://localhost:3000"
    sentry_dsn: str | None = None


settings = Settings()
