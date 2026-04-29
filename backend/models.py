import sqlalchemy as sa
from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, JSON
from pydantic import BaseModel, EmailStr, Field as PydanticField

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
    provincia: Optional[str] = None
    poblacio: Optional[int] = None
    adreca_fisica: Optional[str] = None
    email_general: Optional[str] = None
    telefon_general: Optional[str] = None
    
    # Relacions
    contactes: List["Contacte"] = Relationship(back_populates="municipi", sa_relationship_kwargs={"cascade": "all, delete"})
    deals: List["Deal"] = Relationship(back_populates="municipi", sa_relationship_kwargs={"cascade": "all, delete"})

class Contacte(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    municipi_id: int = Field(foreign_key="municipi.id")
    deal_id: Optional[int] = Field(
        default=None, 
        sa_column=sa.Column(sa.Integer, sa.ForeignKey("deal.id", ondelete="SET NULL"), nullable=True)
    )
    nom: str
    carrec: Optional[str] = None
    email: str = Field(index=True)
    telefon: Optional[str] = None
    
    # Relacions
    municipi: Municipi = Relationship(back_populates="contactes")
    deal: Optional["Deal"] = Relationship(back_populates="contactes")

class Deal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    municipi_id: int = Field(foreign_key="municipi.id")
    pla_assignat: str # Legacy field
    pla_saas: str = Field(default="Pla de Venda") # New consistent field
    estat_kanban: EstatDeal = Field(default=EstatDeal.NOU)
    is_active: bool = Field(default=True) # Soft Delete
    data_creacio: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False)
    )

    # Camps gestionats per l'Agent IA (nullable per compatibilitat amb registres preexistents)
    proper_pas: Optional[str] = Field(default=None, sa_column=sa.Column(sa.Text, nullable=True))
    data_seguiment: Optional[datetime] = Field(
        default=None,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=True)
    )

    # Relacions
    municipi: Municipi = Relationship(back_populates="deals")
    accions: List["Interaccio"] = Relationship(back_populates="deal", sa_relationship_kwargs={"cascade": "all, delete"})
    contactes: List["Contacte"] = Relationship(back_populates="deal")
    calendari_events: List["CalendariEvent"] = Relationship(back_populates="deal", sa_relationship_kwargs={"cascade": "all, delete"})

    # Context d'IA
    municipality_context: Optional[str] = Field(default=None)

class CalendariEvent(SQLModel, table=True):
    __tablename__ = "calendari_event"
    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deal.id", index=True)
    municipi_id: Optional[int] = Field(default=None, foreign_key="municipi.id")
    data_inici: datetime = Field(
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False)
    )
    data_fi: Optional[datetime] = Field(
        default=None,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=True)
    )
    tipus: str = Field(default="seguiment")  # seguiment, demo, reunio, renovacio, general
    descripcio: Optional[str] = Field(default=None)
    completat: bool = Field(default=False)
    es_tasca: bool = Field(default=False) # True per a Checklist, False per a Calendari pur

    # Relacions
    deal: Deal = Relationship(back_populates="calendari_events")

class GlobalKnowledge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    content: str

class Interaccio(SQLModel, table=True):
    __tablename__ = "interaccio"
    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deal.id", index=True)
    tipus: str = Field(index=True) # nota, email_in, email_out, calendar, ai_prompt, ai_response, system_log
    contingut: str
    metadata_json: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    is_completed: bool = Field(default=False)
    data: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False)
    )
    
    # Relacions
    deal: Deal = Relationship(back_populates="accions")

# --- ESQUEMES DE VALIDACIÓ (Pydantic per a l'API) ---

class ContacteRead(BaseModel):
    id: int
    nom: str
    carrec: Optional[str] = None
    email: str
    telefon: Optional[str] = None
    municipi_id: int
    deal_id: Optional[int] = None

class MunicipiRead(BaseModel):
    id: int
    codi_ine: str
    nom: str
    provincia: Optional[str] = None
    poblacio: Optional[int] = None
    adreca_fisica: Optional[str] = None
    email_general: Optional[str] = None
    telefon_general: Optional[str] = None

class DealRead(BaseModel):
    id: int
    municipi_id: int
    pla_assignat: Optional[str] = "Pla de Venda"
    pla_saas: Optional[str] = "Pla de Venda"
    estat_kanban: Optional[EstatDeal] = EstatDeal.NOU
    is_active: bool = True
    data_creacio: datetime
    municipality_context: Optional[str] = None
    proper_pas: Optional[str] = None
    data_seguiment: Optional[datetime] = None

class InteraccioRead(BaseModel):
    id: int
    deal_id: int
    tipus: str
    contingut: str
    metadata_json: Optional[Dict[str, Any]] = None
    is_completed: bool = False
    data: datetime

# --- ESQUEMES COMPOSTOS (Per a relacions carregades) ---

class MunicipiReadWithDeals(MunicipiRead):
    deals: List[DealRead] = []

class ContacteReadWithMunicipi(ContacteRead):
    municipi: Optional[MunicipiRead] = None

class CalendariEventRead(BaseModel):
    id: int
    deal_id: int
    municipi_id: Optional[int] = None
    data_inici: datetime
    data_fi: Optional[datetime] = None
    tipus: str
    descripcio: Optional[str] = None
    completat: bool
    es_tasca: bool

    model_config = {"from_attributes": True}

# ⚡ Schema LLEUGER per al Kanban: Completament aïllat de relacions pesades.
class DealKanbanRead(SQLModel):
    id: int
    municipi_id: int
    pla_saas: str
    estat_kanban: EstatDeal
    proper_pas: Optional[str] = None
    data_seguiment: Optional[datetime] = None
    is_active: bool = True
    
    # Incloem el municipi bàsic ja que el Kanban el necessita per al títol
    municipi: Optional[MunicipiRead] = None

    model_config = {"from_attributes": True}

# 📦 Schema COMPLET per a l'Epicentre (GET /deals/{id}):
# Conté tot el context per a la UI i l'agent IA.
class DealReadWithMunicipi(DealRead):
    municipi: Optional[MunicipiRead] = None
    contactes: List[ContacteRead] = []
    accions: List[InteraccioRead] = []
    calendari_events: List[CalendariEventRead] = []

    model_config = {"from_attributes": True}

class InteraccioReadWithContext(InteraccioRead):
    deal: Optional[DealReadWithMunicipi] = None

class ContacteSchema(BaseModel):
    nom: str
    carrec: Optional[str] = None
    email: EmailStr
    telefon: Optional[str] = None
    deal_id: Optional[int] = None

class MunicipiSchema(BaseModel):
    codi_ine: str
    nom: str
    provincia: Optional[str] = None
    poblacio: Optional[int] = None
    adreca_fisica: Optional[str] = None
    email_general: Optional[str] = None
    telefon_general: Optional[str] = None

class OnboardingRequest(BaseModel):
    municipi: MunicipiSchema
    contactes: List[ContacteSchema]
    pla_assignat: str = "Pla de Venda"

class DealUpdate(BaseModel):
    municipality_context: Optional[str] = None
    pla_saas: Optional[str] = None
    pla_assignat: Optional[str] = None
    estat_kanban: Optional[EstatDeal] = None
    proper_pas: Optional[str] = None
    data_seguiment: Optional[datetime] = None

class GlobalKnowledgeRead(BaseModel):
    id: int
    key: str
    content: str

class KnowledgeUpdate(BaseModel):
    content: str = PydanticField(..., max_length=50000)

