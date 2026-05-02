from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    secret: SecretStr
    database_url: str
    mongo_url: str
    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
