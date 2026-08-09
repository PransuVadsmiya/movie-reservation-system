from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    redis_url: str

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    seat_lock_ttl_seconds: int = 300
    report_cache_ttl_seconds: int = 60

    admin_email: str
    admin_password: str

    class Config:
        env_file = ".env"


settings = Settings()
