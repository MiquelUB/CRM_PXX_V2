from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship
import sqlalchemy as sa

class Municipi(SQLModel, table=True):
    """Font de veritat per a dades geogràfiques i poblacionals (DIBA/Idescat)."""
    codi_ine: str = Field(primary_key=True, index=True)
    nom: str = Field(index=True)
    poblacio: Optional[int] = None
    provincia: str = Field(default="Barcelona")
    
    # Relacions
    deals: List["Deal"] = Relationship(back_populates="municipi")

class Deal(SQLModel, table=True):
    """Entitat central: Tota la informació orbita aquí."""
    id: Optional[int] = Field(default=None, primary_key=True)
    titol: str
    estat: str = Field(default="prospecte", index=True)
    data_creacio: datetime = Field(
        default_factory=datetime.utcnow, 
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False)
    )
    
    # Foreign Keys
    municipi_id: str = Field(foreign_key="municipi.codi_ine")
    
    # Relacions
    municipi: "Municipi" = Relationship(back_populates="deals")
    contactes: List["Contacte"] = Relationship(back_populates="deal")
    interaccions: List["Interaccio"] = Relationship(back_populates="deal")

class Contacte(SQLModel, table=True):
    """Persones vinculades a un Deal."""
    id: Optional[int] = Field(default=None, primary_key=True)
    nom: str
    carrec: Optional[str] = None
    email: str = Field(index=True)
    telefon: Optional[str] = None
    
    # Foreign Keys
    deal_id: int = Field(foreign_key="deal.id")
    
    # Relacions
    deal: "Deal" = Relationship(back_populates="contactes")

class Interaccio(SQLModel, table=True):
    """L'eix vertebrador: Historial cronològic unificat."""
    id: Optional[int] = Field(default=None, primary_key=True)
    tipus: str = Field(index=True) # email_in, email_out, nota, trucada, reunio, visita
    contingut: str
    data: datetime = Field(
        default_factory=datetime.utcnow, 
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False)
    )
    data_fi: Optional[datetime] = Field(
        default=None, 
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=True)
    )
    autor: Optional[str] = None
    external_id: Optional[str] = Field(default=None, unique=True, index=True, nullable=True)
    
    # Foreign Keys
    deal_id: int = Field(foreign_key="deal.id")
    
    # Relacions
    deal: "Deal" = Relationship(back_populates="interaccions")
