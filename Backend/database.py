import os
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

load_dotenv()

MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "trello_db")

# Create the URL (quote user/password for @, :, etc. in passwords)
_u = quote_plus(MYSQL_USER)
if MYSQL_PASSWORD:
    _p = quote_plus(MYSQL_PASSWORD)
    SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{_u}:{_p}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
else:
    SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{_u}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
