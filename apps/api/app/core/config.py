from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/assembly"
    redis_url: str = "redis://localhost:6379/0"

    web_origin: str = "http://localhost:3000"
    public_app_url: str = "http://localhost:3000"
    sentry_dsn: str | None = None

    # Auth
    jwt_private_key: str = ""  # RS256 private key (PEM). Auto-generated in dev if blank.
    jwt_public_key: str = ""
    jwt_issuer: str = "assembly"
    jwt_access_ttl_seconds: int = 60 * 60 * 24  # 24h for v1; refresh added later

    magic_link_ttl_seconds: int = 60 * 15  # 15 min
    magic_link_secret: str = "dev-magic-link-secret-change-me"

    # Email
    resend_api_key: str | None = None
    resend_sender_domain: str | None = None
    email_from: str = "Assembly <noreply@assembly.local>"

    # Cloudflare R2 (S3-compatible)
    r2_account_id: str | None = None
    r2_access_key: str | None = None
    r2_secret_key: str | None = None
    r2_bucket_media: str = "assembly-media-dev"
    r2_public_base: str | None = None  # https://media.assembly.app — for signed GETs


settings = Settings()
