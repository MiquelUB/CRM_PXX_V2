"""
Script de reparació directa de l'ENUM 'estatdeal' a PostgreSQL.
Executa via la terminal del backend a Easypanel:
  python3 scripts/fix_enum.py
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def fix_enum():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL no definida")
        return

    print(f"Connectant a: {url.split('@')[-1]}")

    # AUTOCOMMIT és obligatori per a ALTER TYPE a PostgreSQL
    engine = create_async_engine(url, isolation_level="AUTOCOMMIT")

    try:
        async with engine.connect() as conn:
            # Verificar valors actuals de l'ENUM
            result = await conn.execute(text("""
                SELECT enumlabel FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = 'estatdeal'
                ORDER BY enumsortorder;
            """))
            current_values = [row[0] for row in result.fetchall()]
            print(f"Valors actuals de l'ENUM 'estatdeal': {current_values}")

            # Afegir valors que falten
            for value in ["Perdut", "Hivernant"]:
                if value not in current_values:
                    await conn.execute(text(
                        f"ALTER TYPE estatdeal ADD VALUE IF NOT EXISTS '{value}'"
                    ))
                    print(f"✅ Afegit: '{value}'")
                else:
                    print(f"ℹ️  Ja existia: '{value}'")

            # Verificació final
            result2 = await conn.execute(text("""
                SELECT enumlabel FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = 'estatdeal'
                ORDER BY enumsortorder;
            """))
            final_values = [row[0] for row in result2.fetchall()]
            print(f"\nValors finals de l'ENUM: {final_values}")
            print("\n✅ Reparació completada. Reinicia el backend.")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_enum())
