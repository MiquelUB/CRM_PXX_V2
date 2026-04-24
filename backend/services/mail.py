import hashlib
import email
from email.policy import default
from datetime import datetime, timezone
import aioimaplib
import logging
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Interaccio

# Configuració de logging per traçabilitat en Phase C
logger = logging.getLogger(__name__)

def generate_email_hash(message_id: str, sender: str, date: datetime, subject: str) -> str:
    """Hash segur forçant UTC segons time_management.md."""
    # Forcem la conversió a UTC abans de qualsevol processament
    date_utc = date.astimezone(timezone.utc) if date.tzinfo else date.replace(tzinfo=timezone.utc)
    date_str = date_utc.isoformat()
    
    subject_hash = hashlib.md5(subject.encode()).hexdigest()
    raw_id = f"{message_id}|{sender}|{date_str}|{subject_hash}"
    return hashlib.sha256(raw_id.encode()).hexdigest()

async def upsert_email_to_interaction(session: AsyncSession, deal_id: int, email_data: dict):
    """UPSERT atòmic a PostgreSQL (Idempotent)."""
    email_hash = generate_email_hash(
        email_data['message_id'], email_data['from'], email_data['date'], email_data['subject']
    )

    # El dialecte PostgreSQL insert permet fer l'upsert natiu
    stmt = insert(Interaccio).values(
        tipus="EMAIL",
        contingut=email_data['body'],
        data_creacio=email_data['date'].astimezone(timezone.utc),
        autor=email_data['from'],
        external_id=email_hash,
        deal_id=deal_id
    ).on_conflict_do_nothing(index_elements=['external_id'])
    
    await session.execute(stmt)
    await session.commit()

async def run_mail_sync(session: AsyncSession, deal_id: int, config: dict):
    """
    Connexió real a CDmon via IMAP asíncron.
    """
    imap_client = aioimaplib.IMAP4_SSL(host=config['host'], port=993)
    
    try:
        await imap_client.wait_hello()
        await imap_client.login(config['user'], config['password'])
        await imap_client.select('INBOX')

        # Busquem tots els correus (en producció filtraríem per 'UNSEEN')
        res, messages = await imap_client.search('ALL')
        if res != 'OK':
            logger.error("Error en la cerca d'emails")
            return

        for msg_id in messages[0].split():
            res, data = await imap_client.fetch(msg_id, '(RFC822)')
            if res != 'OK': continue

            # Parseig de l'email
            raw_email = data[1]
            msg = email.message_from_bytes(raw_email, policy=default)
            
            # Extracció de dades bàsiques
            email_payload = {
                'message_id': msg.get('Message-ID', f"no-id-{msg_id}"),
                'from': msg.get('From'),
                'subject': msg.get('Subject', ''),
                'date': email.utils.parsedate_to_datetime(msg.get('Date')),
                'body': msg.get_body(preferencelist=('plain')).get_content() if msg.get_body() else ""
            }

            # Guardat segur i idempotent
            await upsert_email_to_interaction(session, deal_id, email_payload)

        await imap_client.logout()
        logger.info(f"Sincronització completada per al Deal {deal_id}")

    except Exception as e:
        logger.error(f"Fallada crítica en la sincronització IMAP: {str(e)}")
    finally:
        # Tancament net de la connexió
        if imap_client.protocol and imap_client.protocol.transport:
            imap_client.terminate()
