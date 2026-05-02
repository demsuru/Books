from pydantic import BaseSettings


class Settings(BaseSettings):
    secret: str
    database_url: str
    mongo_url: str

    class Config:
        env_file = ".env"


settings = Settings()
