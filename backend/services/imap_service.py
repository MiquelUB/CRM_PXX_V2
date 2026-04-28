import imaplib
import email
from email.header import decode_header
import os
import logging
import re
import asyncio
from datetime import datetime, timezone
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from models import Interaccio, Contacte, Deal
from database import async_session_maker

# Configuració de logs
logger = logging.getLogger("imap_service")
logger.setLevel(logging.INFO)

def clean_html(raw_html):
    """Neteja tags HTML bàsics per deixar el text en pla."""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext.strip()

async def get_deal_id_by_email(session: AsyncSession, sender_email: str):
    """Busca el deal_id associat a un correu electrònic."""
    # Busquem el contacte pel seu email
    statement = select(Contacte).where(Contacte.email == sender_email)
    result = await session.execute(statement)
    contacte = result.scalar_one_or_none()
    
    if contacte and contacte.deal_id:
        return contacte.deal_id
    
    # Si no trobem el contacte directe, podríem buscar per domini o municipi, 
    # però per ara mantenim el matching estricte per seguretat.
    return None

async def process_unseen_emails():
    """Connecta a IMAP i processa correus no llegits."""
    IMAP_SERVER = os.getenv("IMAP_SERVER")
    IMAP_USER = os.getenv("IMAP_USER")
    IMAP_PASSWORD = os.getenv("IMAP_PASSWORD")
    IMAP_PORT = int(os.getenv("IMAP_PORT", 993))

    if not all([IMAP_SERVER, IMAP_USER, IMAP_PASSWORD]):
        logger.warning("IMAP: Variables d'entorn no configurades. Escolta passiva desactivada.")
        return

    try:
        # Connexió SSL
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(IMAP_USER, IMAP_PASSWORD)
        mail.select("inbox")

        # Cercar correus no llegits
        status, messages = mail.search(None, 'UNSEEN')
        if status != 'OK':
            return

        for num in messages[0].split():
            # Descarregar el correu
            status, data = mail.fetch(num, '(RFC822)')
            if status != 'OK':
                continue

            for response_part in data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    # 1. Extreure Subject
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else "utf-8")
                    
                    # 2. Extreure From (Email)
                    from_ = msg.get("From")
                    sender_email = re.search(r'[\w\.-]+@[\w\.-]+', from_).group(0)
                    
                    # 3. Extreure Cos
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                body = part.get_payload(decode=True).decode()
                                break
                            elif content_type == "text/html" and "attachment" not in content_disposition:
                                body = clean_html(part.get_payload(decode=True).decode())
                    else:
                        body = msg.get_payload(decode=True).decode()

                    # 4. Vincular amb la base de dades
                    async with async_session_maker() as session:
                        deal_id = await get_deal_id_by_email(session, sender_email)
                        
                        if deal_id:
                            nova_interaccio = Interaccio(
                                deal_id=deal_id,
                                tipus="email",
                                contingut=f"ASSUMPTE: {subject}\n\n{body}",
                                data=datetime.now(timezone.utc),
                                metadata_json={
                                    "from": from_,
                                    "sender_email": sender_email,
                                    "subject": subject,
                                    "source": "imap_listener"
                                }
                            )
                            session.add(nova_interaccio)
                            await session.commit()
                            logger.info(f"IMAP: Correu de {sender_email} vinculat al Deal {deal_id}")
                        else:
                            logger.info(f"IMAP: Correu de {sender_email} rebut però no s'ha trobat cap Deal vinculat.")

        mail.logout()
    except Exception as e:
        logger.error(f"IMAP Error: {str(e)}")

async def start_imap_scheduler():
    """Bucle infinit per executar l'escolta cada 5 minuts."""
    logger.info("IMAP: Iniciant scheduler d'escolta passiva (5 minuts)...")
    while True:
        await process_unseen_emails()
        await asyncio.sleep(300) # 300 segons = 5 minuts
