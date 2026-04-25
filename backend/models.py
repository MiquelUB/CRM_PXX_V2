from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, JSON
from pydantic import BaseModel, EmailStr

# --- ENUMS DE NEGOCI ---
class EstatDeal(str, Enum):
    NOU = "Nou"
    CONTACTAT = "Contactat"
    DEMO = "Demo"
    PROPOSTA = "Proposta"
    TANCAT = "Tancat"

# --- MODELS DE BASE DE DADES (SQLModel) ---

class Municipi(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    codi_ine: str = Field(unique=True, index=True)
    nom: str
    adreca_fisica: Optional[str] = None
    email_general: Optional[str] = None
    telefon_general: Optional[str] = None
    
    # Relacions
    contactes: List["Contacte"] = Relationship(back_populates="municipi")
    deal: Optional["Deal"] = Relationship(back_populates="municipi")

class Contacte(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    municipi_id: int = Field(foreign_key="municipi.id")
    nom: str
    carrec: Optional[str] = None
    email: str = Field(index=True)
    telefon: Optional[str] = None
    
    # Relacions
    municipi: Municipi = Relationship(back_populates="contactes")

class Deal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    municipi_id: int = Field(foreign_key="municipi.id", unique=True)
    pla_assignat: str 
    estat_kanban: EstatDeal = Field(default=EstatDeal.NOU)
    is_active: bool = Field(default=True) # Soft Delete
    
    # Relacions
    municipi: Municipi = Relationship(back_populates="deal")
    interaccions: List["Interaccio"] = Relationship(back_populates="deal")

class Interaccio(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deal.id", index=True)
    tipus: str = Field(index=True) # nota, email_in, email_out, calendar, ai_prompt, ai_response, system_log
    contingut: str
    # JSON real a DB utilitzant sa_column de SQLAlchemy
    metadata_json: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    data_creacio: datetime = Field(default_factory=datetime.utcnow)
    
    # Relacions
    deal: Deal = Relationship(back_populates="interaccions")

# --- ESQUEMES DE VALIDACIÓ (Pydantic per a l'API) ---

class ContacteSchema(BaseModel):
    nom: str
    carrec: Optional[str] = None
    email: EmailStr
    telefon: Optional[str] = None

class MunicipiSchema(BaseModel):
    codi_ine: str
    nom: str
    adreca_fisica: Optional[str] = None
    email_general: Optional[str] = None # Canviat a str per flexibilitat si cal, però validat com a email al frontend
    telefon_general: Optional[str] = None

class OnboardingRequest(BaseModel):
    municipi: MunicipiSchema
    contactes: List[ContacteSchema]
    pla_assignat: str = "Pla Basic"

