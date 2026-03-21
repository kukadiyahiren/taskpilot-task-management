from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

settings = get_settings()
url = settings.resolved_database_url

connect_args = {}
pool_kwargs: dict = {"pool_pre_ping": True}

if url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
elif "mysql" in url:
    pool_kwargs["pool_recycle"] = 280

engine = create_engine(url, connect_args=connect_args, **pool_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
