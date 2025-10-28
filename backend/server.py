from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
import json
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from fastapi.responses import StreamingResponse
import gspread
from google.oauth2.service_account import Credentials

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "icd-tuning-secret-key-change-in-production")
ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str  # "Manager" or "Mechanic"
    full_name: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    full_name: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    contact_number: str
    car_brand: str
    car_model: str
    year: int
    registration_number: str
    vin: Optional[str] = None
    kms: Optional[int] = None
    entry_date: str
    assigned_mechanic: str
    work_description: str
    estimated_delivery: str
    status: str = "Pending"  # Pending, In Progress, Done, Delivered
    photos: List[str] = []  # base64 encoded images
    invoice_amount: Optional[float] = None
    notes: Optional[str] = None
    completion_date: Optional[str] = None
    confirm_complete: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class JobCreate(BaseModel):
    customer_name: str
    contact_number: str
    car_brand: str
    car_model: str
    year: int
    registration_number: str
    vin: Optional[str] = None
    kms: Optional[int] = None
    entry_date: str
    assigned_mechanic: str
    work_description: str
    estimated_delivery: str
    invoice_amount: Optional[float] = None

class JobUpdate(BaseModel):
    customer_name: Optional[str] = None
    contact_number: Optional[str] = None
    car_brand: Optional[str] = None
    car_model: Optional[str] = None
    year: Optional[int] = None
    registration_number: Optional[str] = None
    vin: Optional[str] = None
    kms: Optional[int] = None
    entry_date: Optional[str] = None
    assigned_mechanic: Optional[str] = None
    work_description: Optional[str] = None
    estimated_delivery: Optional[str] = None
    status: Optional[str] = None
    invoice_amount: Optional[float] = None
    notes: Optional[str] = None
    confirm_complete: Optional[bool] = None

class StatusUpdate(BaseModel):
    status: str

class NoteAdd(BaseModel):
    note: str

class WhatsAppRequest(BaseModel):
    job_id: str
    message: str

class InvoiceData(BaseModel):
    labour_cost: float = 0
    parts_cost: float = 0
    tuning_cost: float = 0
    other_charges: float = 0
    custom_charges: List[dict] = []  # [{"description": "...", "amount": 0}]
    gst_rate: float = 18.0

# ===== HELPER FUNCTIONS =====

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"username": username}, {"_id": 0, "password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

def require_manager(current_user: User = Depends(get_current_user)):
    if current_user.role != "Manager":
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user

# ===== AUTHENTICATION ENDPOINTS =====

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    user_dict["password_hash"] = hash_password(password)
    user_dict["id"] = str(uuid.uuid4())
    
    await db.users.insert_one(user_dict)
    
    return User(**{k: v for k, v in user_dict.items() if k != "password_hash"})

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"username": login_data.username})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    
    user_obj = User(**{k: v for k, v in user.items() if k not in ["_id", "password_hash"]})
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )

# ===== USER/MECHANIC ENDPOINTS =====

@api_router.get("/mechanics", response_model=List[User])
async def get_mechanics(current_user: User = Depends(get_current_user)):
    mechanics = await db.users.find({"role": "Mechanic"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [User(**m) for m in mechanics]

@api_router.get("/users/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# ===== JOB ENDPOINTS =====

@api_router.post("/jobs", response_model=Job)
async def create_job(job_data: JobCreate, current_user: User = Depends(require_manager)):
    job_dict = job_data.model_dump()
    job = Job(**job_dict)
    
    doc = job.model_dump()
    await db.jobs.insert_one(doc)
    
    return job

@api_router.get("/jobs", response_model=List[Job])
async def get_jobs(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    
    # Mechanics can only see their assigned jobs
    if current_user.role == "Mechanic":
        query["assigned_mechanic"] = current_user.username
    
    # Filter by status if provided
    if status and status != "All Status":
        query["status"] = status
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    # Sort by created_at descending (newest first)
    jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return [Job(**j) for j in jobs]

@api_router.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str, current_user: User = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Mechanics can only view their assigned jobs
    if current_user.role == "Mechanic" and job["assigned_mechanic"] != current_user.username:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Job(**job)

@api_router.put("/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, job_update: JobUpdate, current_user: User = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Only managers can edit all fields, mechanics can only update status and notes
    if current_user.role == "Mechanic":
        if job["assigned_mechanic"] != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied")
        # Mechanics can only update specific fields
        allowed_fields = {"status", "notes", "confirm_complete"}
        update_data = {k: v for k, v in job_update.model_dump(exclude_unset=True).items() if k in allowed_fields}
    else:
        update_data = job_update.model_dump(exclude_unset=True)
    
    # Auto-set completion_date when status becomes "Done"
    if update_data.get("status") == "Done" and job.get("status") != "Done":
        update_data["completion_date"] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.jobs.update_one({"id": job_id}, {"$set": update_data})
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return Job(**updated_job)

@api_router.post("/jobs/{job_id}/photos")
async def add_job_photo(job_id: str, photo: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Read and encode image
    image_data = await photo.read()
    base64_image = base64.b64encode(image_data).decode('utf-8')
    image_url = f"data:{photo.content_type};base64,{base64_image}"
    
    # Add to photos array
    await db.jobs.update_one(
        {"id": job_id},
        {"$push": {"photos": image_url}}
    )
    
    return {"message": "Photo added successfully", "photo_url": image_url}

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: User = Depends(require_manager)):
    result = await db.jobs.delete_one({"id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted successfully"}

# ===== STATISTICS ENDPOINT =====

@api_router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == "Mechanic":
        query["assigned_mechanic"] = current_user.username
    
    all_jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    active_count = sum(1 for j in all_jobs if j.get("status") in ["Pending", "In Progress"])
    completed_count = sum(1 for j in all_jobs if j.get("status") in ["Done", "Delivered"])
    total_count = len(all_jobs)
    
    return {
        "active": active_count,
        "completed": completed_count,
        "total": total_count
    }

# ===== NOTIFICATION ENDPOINTS (MOCK) =====

@api_router.post("/notifications/whatsapp")
async def send_whatsapp(request: WhatsAppRequest, current_user: User = Depends(require_manager)):
    # MOCK: WhatsApp Business API integration
    # TODO: Add WhatsApp Business API credentials in .env
    # WHATSAPP_API_KEY, WHATSAPP_PHONE_NUMBER_ID
    
    job = await db.jobs.find_one({"id": request.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Mock implementation - log the message
    logging.info(f"[MOCK] Sending WhatsApp to {job['contact_number']}: {request.message}")
    
    return {
        "success": True,
        "message": "WhatsApp notification queued (mock mode - add API key to enable)",
        "recipient": job['contact_number']
    }

@api_router.post("/email/invoice")
async def send_invoice_email(job_id: str, current_user: User = Depends(require_manager)):
    # MOCK: Mailchimp Transactional API integration
    # TODO: Add Mailchimp credentials in .env
    # MAILCHIMP_API_KEY
    
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    logging.info(f"[MOCK] Sending invoice email for job {job_id}")
    
    return {
        "success": True,
        "message": "Invoice email queued (mock mode - add API key to enable)",
        "recipient": job.get('customer_name')
    }

@api_router.post("/export/google-sheets")
async def export_to_sheets(current_user: User = Depends(require_manager)):
    # MOCK: Google Sheets API integration
    # TODO: Add Google Sheets credentials in .env
    # GOOGLE_SHEETS_CREDENTIALS_JSON
    
    jobs = await db.jobs.find({}, {"_id": 0}).to_list(1000)
    
    logging.info(f"[MOCK] Exporting {len(jobs)} jobs to Google Sheets")
    
    return {
        "success": True,
        "message": f"Exported {len(jobs)} jobs (mock mode - add API key to enable)",
        "job_count": len(jobs)
    }

# ===== INVOICE GENERATION =====

@api_router.post("/jobs/{job_id}/invoice")
async def generate_invoice(job_id: str, invoice_data: InvoiceData, current_user: User = Depends(require_manager)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#D32F2F'),
        alignment=TA_CENTER,
        spaceAfter=30,
        fontName='Helvetica-Bold'
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#FFFFFF'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    # Header
    elements.append(Paragraph("ICD TUNING", title_style))
    elements.append(Paragraph("Performance Tuning | ECU Remaps | Custom Builds", header_style))
    elements.append(Paragraph("Chennai, Tamil Nadu", header_style))
    elements.append(Paragraph("📞 +91 98765 43210 ✉️ icdtuning@gmail.com", header_style))
    elements.append(Spacer(1, 0.5*inch))
    
    # Invoice title
    elements.append(Paragraph("INVOICE", title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Invoice details
    invoice_number = f"ICD-{datetime.now().year}-{job_id[:8].upper()}"
    invoice_date = datetime.now().strftime("%d/%m/%Y")
    
    details_data = [
        ['Invoice No:', invoice_number, 'Date:', invoice_date],
        ['Customer:', job['customer_name'], 'Contact:', job['contact_number']],
        ['Vehicle:', f"{job['car_brand']} {job['car_model']} ({job['year']})", 'Reg No:', job['registration_number']],
    ]
    
    details_table = Table(details_data, colWidths=[1.5*inch, 2.5*inch, 1*inch, 2*inch])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1a1a1a')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D32F2F')),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Work description
    work_data = [
        ['Work Description', ''],
        [job['work_description'], ''],
    ]
    work_table = Table(work_data, colWidths=[5*inch, 2*inch])
    work_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D32F2F')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.white),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D32F2F')),
    ]))
    elements.append(work_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Charges breakdown
    subtotal = invoice_data.labour_cost + invoice_data.parts_cost + invoice_data.tuning_cost + invoice_data.other_charges
    
    # Add custom charges to subtotal
    for custom_charge in invoice_data.custom_charges:
        subtotal += custom_charge.get('amount', 0)
    
    gst_amount = subtotal * (invoice_data.gst_rate / 100)
    grand_total = subtotal + gst_amount
    
    charges_data = [
        ['Description', 'Amount (₹)'],
        ['Labour Charges', f'{invoice_data.labour_cost:,.2f}'],
        ['Parts/Materials', f'{invoice_data.parts_cost:,.2f}'],
        ['Tuning Charges', f'{invoice_data.tuning_cost:,.2f}'],
        ['Other Charges', f'{invoice_data.other_charges:,.2f}'],
    ]
    
    # Add custom charges
    for custom_charge in invoice_data.custom_charges:
        charges_data.append([
            custom_charge.get('description', 'Custom Charge'),
            f"{custom_charge.get('amount', 0):,.2f}"
        ])
    
    charges_data.extend([
        ['Subtotal', f'{subtotal:,.2f}'],
        [f'GST ({invoice_data.gst_rate}%)', f'{gst_amount:,.2f}'],
        ['GRAND TOTAL', f'₹ {grand_total:,.2f}'],
    ])
    
    charges_table = Table(charges_data, colWidths=[4*inch, 3*inch])
    charges_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D32F2F')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 1), (-1, -2), colors.white),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#D32F2F')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D32F2F')),
    ]))
    elements.append(charges_table)
    elements.append(Spacer(1, 0.5*inch))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#999999'),
        alignment=TA_CENTER,
    )
    elements.append(Paragraph("Terms & Conditions:", footer_style))
    elements.append(Paragraph("All tuning work done by ICD Tuning is tested and verified for safety and performance.", footer_style))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph("Thank you for choosing ICD Tuning!", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice_number}.pdf"}
    )

# ===== SEED DATA ENDPOINT =====

@api_router.post("/seed")
async def seed_database():
    # Check if already seeded
    existing_users = await db.users.count_documents({})
    if existing_users > 0:
        return {"message": "Database already seeded"}
    
    # Create users
    users = [
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "role": "Manager",
            "full_name": "Admin Manager"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "rudhan",
            "password_hash": hash_password("rudhan123"),
            "role": "Mechanic",
            "full_name": "Rudhan"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "suresh",
            "password_hash": hash_password("suresh123"),
            "role": "Mechanic",
            "full_name": "Suresh Babu"
        },
    ]
    
    await db.users.insert_many(users)
    
    # Create sample jobs
    jobs = [
        {
            "id": str(uuid.uuid4()),
            "customer_name": "Arjun Menon",
            "contact_number": "+919876543210",
            "car_brand": "Hyundai",
            "car_model": "Creta 1.5 CRDi",
            "year": 2022,
            "registration_number": "TN-10-AB-1234",
            "vin": "MAXXYZZ123456789",
            "kms": 25000,
            "entry_date": "2025-10-20",
            "assigned_mechanic": "suresh",
            "work_description": "Stage 1 ECU Remap + EGR Delete + DPF Removal",
            "estimated_delivery": "2025-10-30",
            "status": "Done",
            "photos": [],
            "invoice_amount": 45000,
            "notes": "Customer wants improved fuel efficiency",
            "completion_date": "2025-10-27T10:30:00Z",
            "confirm_complete": True,
            "created_at": "2025-10-20T09:00:00Z"
        },
        {
            "id": str(uuid.uuid4()),
            "customer_name": "Vikram Singh",
            "contact_number": "+919123456789",
            "car_brand": "VW",
            "car_model": "Polo GT TSI",
            "year": 2020,
            "registration_number": "TN-09-XY-5678",
            "vin": "WVWZZZ6RZHY123456",
            "kms": 45000,
            "entry_date": "2025-10-25",
            "assigned_mechanic": "suresh",
            "work_description": "Stage 2 Tune + Cold Air Intake + Custom Exhaust",
            "estimated_delivery": "2025-11-01",
            "status": "Pending",
            "photos": [],
            "invoice_amount": None,
            "notes": None,
            "completion_date": None,
            "confirm_complete": False,
            "created_at": "2025-10-25T11:00:00Z"
        },
    ]
    
    await db.jobs.insert_many(jobs)
    
    return {"message": "Database seeded successfully", "users": len(users), "jobs": len(jobs)}

# ===== MAIN APP SETUP =====

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
