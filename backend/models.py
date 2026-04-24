from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import datetime

class TipusPlaSaaS(str, Enum):
    ROURE = "roure"
    MIRADOR = "mirador"
    TERRITORI = "territori"

class Contacte(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nom: str
    carrec: Optional[str] = None 
    telefon: Optional[str] = None
    email: str = Field(index=True)
    municipi_id: str = Field(foreign_key="municipi.codi_ine")
    
    # Relacions
    municipi: "Municipi" = Relationship(back_populates="contactes")
    interaccions: List["Interaccio"] = Relationship(back_populates="contacte")

class Interaccio(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deal.id")
    contacte_id: Optional[int] = Field(default=None, foreign_key="contacte.id")
    tipus: str # 'EMAIL', 'NOTA_MANUAL', 'SISTEMA'
    contingut: str
    data_creacio: datetime = Field(default_factory=datetime.utcnow)
    external_id: Optional[str] = Field(default=None, unique=True, index=True)
    
    # Relacions
    deal: "Deal" = Relationship(back_populates="interaccions")
    contacte: Optional["Contacte"] = Relationship(back_populates="interaccions")

class Esdeveniment(SQLModel, table=True):
    """Necessari per al Function Calling de l'Agent IA"""
    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deal.id")
    titol: str
    data_hora: datetime
    creat_per_ia: bool = Field(default=False)
    
    # Relacions
    deal: "Deal" = Relationship(back_populates="esdeveniments")

class Deal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    municipi_id: str = Field(foreign_key="municipi.codi_ine", unique=True) # 1:1 Restricció
    estat: str = Field(default="Obert")
    
    # Financeres / SaaS Plan
    pla_tipus: Optional[TipusPlaSaaS] = None
    preu_acordat: Optional[float] = None
    
    # Relacions
    municipi: "Municipi" = Relationship(back_populates="deals")
    interaccions: List["Interaccio"] = Relationship(back_populates="deal")
    esdeveniments: List["Esdeveniment"] = Relationship(back_populates="deal")

class Municipi(SQLModel, table=True):
    codi_ine: str = Field(primary_key=True)
    nom: str
    provincia: Optional[str] = None
    poblacio: Optional[int] = None
    adreça: Optional[str] = None
    email_general: Optional[str] = None
    telefon_general: Optional[str] = None
    
    # Relacions
    deals: List["Deal"] = Relationship(back_populates="municipi")
    contactes: List["Contacte"] = Relationship(back_populates="municipi")
