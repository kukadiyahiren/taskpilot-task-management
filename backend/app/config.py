from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # If set, overrides MYSQL_* (e.g. sqlite:///./taskpilot.db or full mysql+pymysql://…)
    database_url: str | None = Field(default=None)

    # Env: MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_DB
    mysql_user: str = "teamtask"
    mysql_password: str = "password"
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_db: str = "team-task-board"

    # Env: SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES (for JWT)
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url and str(self.database_url).strip():
            return str(self.database_url).strip()
        u = quote_plus(self.mysql_user)
        p = quote_plus(self.mysql_password)
        return (
            f"mysql+pymysql://{u}:{p}@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}?charset=utf8mb4"
        )


def get_settings() -> Settings:
    return Settings()
