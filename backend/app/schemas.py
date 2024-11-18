from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LeagueBase(BaseModel):
    name: str

class LeagueCreate(LeagueBase):
    pass

class LeagueUpdate(BaseModel):
    name: Optional[str] = None

class LeagueInDB(LeagueBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class League(LeagueInDB):
    pass