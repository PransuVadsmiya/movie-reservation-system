import uuid
from pydantic import BaseModel, ConfigDict


class TheaterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    address: str
    admin_id: uuid.UUID
