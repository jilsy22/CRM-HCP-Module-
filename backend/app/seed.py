"""
Seed script to populate the database with sample HCP data.
Run once after starting the backend: python -m app.seed
"""
import asyncio
from app.database import AsyncSessionLocal, init_db
from app.models import HCP


SAMPLE_HCPS = [
    {"name": "Dr. Priya Sharma", "specialty": "Cardiology", "territory": "North", "email": "priya.sharma@apollo.in", "phone": "+91-9876543210", "institution": "Apollo Hospitals", "npi_number": "NPI001"},
    {"name": "Dr. Arjun Mehta", "specialty": "Oncology", "territory": "West", "email": "arjun.mehta@kokilaben.com", "phone": "+91-9871234567", "institution": "Kokilaben Hospital", "npi_number": "NPI002"},
    {"name": "Dr. Sneha Reddy", "specialty": "Endocrinology", "territory": "South", "email": "sneha.reddy@manipal.in", "phone": "+91-9898765432", "institution": "Manipal Hospital", "npi_number": "NPI003"},
    {"name": "Dr. Vikram Bose", "specialty": "Neurology", "territory": "East", "email": "vikram.bose@fortis.in", "phone": "+91-9812345678", "institution": "Fortis Healthcare", "npi_number": "NPI004"},
    {"name": "Dr. Ananya Nair", "specialty": "Pulmonology", "territory": "South", "email": "ananya.nair@aster.in", "phone": "+91-9845678901", "institution": "Aster Medcity", "npi_number": "NPI005"},
    {"name": "Dr. Rajesh Kumar", "specialty": "Diabetology", "territory": "North", "email": "rajesh.kumar@maxhealthcare.in", "phone": "+91-9711223344", "institution": "Max Super Specialty", "npi_number": "NPI006"},
    {"name": "Dr. Meera Pillai", "specialty": "Rheumatology", "territory": "West", "email": "meera.pillai@hinduja.in", "phone": "+91-9765432189", "institution": "Hinduja Hospital", "npi_number": "NPI007"},
    {"name": "Dr. Suresh Patel", "specialty": "Nephrology", "territory": "Central", "email": "suresh.patel@medanta.in", "phone": "+91-9911223345", "institution": "Medanta - The Medicity", "npi_number": "NPI008"},
    {"name": "Dr. Kavitha Ranganathan", "specialty": "Hematology", "territory": "South", "email": "kavitha.r@cmch.in", "phone": "+91-9944556677", "institution": "CMC Vellore", "npi_number": "NPI009"},
    {"name": "Dr. Ashok Gupta", "specialty": "Gastroenterology", "territory": "North", "email": "ashok.gupta@aiims.in", "phone": "+91-9810987654", "institution": "AIIMS Delhi", "npi_number": "NPI010"},
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        from sqlalchemy import select, func
        result = await db.execute(select(func.count()).select_from(HCP))
        count = result.scalar()

        if count > 0:
            print(f"Database already has {count} HCPs. Skipping seed.")
            return

        for hcp_data in SAMPLE_HCPS:
            hcp = HCP(**hcp_data)
            db.add(hcp)

        await db.commit()
        print(f"✅ Seeded {len(SAMPLE_HCPS)} HCPs successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
