from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=12, max_length=128)


class PasswordLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class MagicLinkRequestIn(BaseModel):
    email: EmailStr


class MagicLinkVerifyIn(BaseModel):
    token: str = Field(min_length=10)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class CouncilOut(BaseModel):
    id: int
    slug: str
    name: str
    brand_color: str


class MeOut(BaseModel):
    id: int
    email: str
    name: str | None
    role: str
    council: CouncilOut
