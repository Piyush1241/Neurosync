# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class Device(Base):
    __tablename__ = "devices"

    device_id   = Column(String, primary_key=True, index=True)
    hostname    = Column(String, nullable=False)
    user_id     = Column(String, nullable=True, index=True)
    username    = Column(String, nullable=True) 
    os          = Column(String, nullable=True)
    os_version  = Column(String, nullable=True)
    ip_address  = Column(String, nullable=True)
    mac_address = Column(String, nullable=True)
    cpu         = Column(String, nullable=True)
    ram_gb      = Column(String, nullable=True)
    status      = Column(String, default="offline")
    last_seen   = Column(DateTime, server_default=func.now(), onupdate=func.now())