from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from models import Base, BibleMission, MemberGuestAttendance, EvangelicalWorker, Venue, Member

# SQLite (change to PostgreSQL as needed)
DATABASE_URL = "sqlite:///./my_local_db.sqlite"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# ---- CRUD for BibleMission ----

def create_bible_mission(db: Session, mission_data: dict):
    mission = BibleMission(**mission_data)
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission

def get_bible_mission(db: Session, event_id: int):
    return db.query(BibleMission).filter(BibleMission.event_id == event_id).first()

def update_bible_mission(db: Session, event_id: int, updates: dict):
    mission = get_bible_mission(db, event_id)
    if not mission:
        return None
    for key, value in updates.items():
        setattr(mission, key, value)
    db.commit()
    return mission

def delete_bible_mission(db: Session, event_id: int):
    mission = get_bible_mission(db, event_id)
    if mission:
        db.delete(mission)
        db.commit()
    return mission


# ---- CRUD for Member ----

def create_member(db: Session, member_data: dict):
    member = Member(**member_data)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

def get_member(db: Session, member_id: int):
    return db.query(Member).filter(Member.member_id == member_id).first()

def update_member(db: Session, member_id: int, updates: dict):
    member = get_member(db, member_id)
    if not member:
        return None
    for key, value in updates.items():
        setattr(member, key, value)
    db.commit()
    return member

def delete_member(db: Session, member_id: int):
    member = get_member(db, member_id)
    if member:
        db.delete(member)
        db.commit()
    return member


# ---- CRUD for MemberGuestAttendance ----

def create_attendance(db: Session, attendance_data: dict):
    attendance = MemberGuestAttendance(**attendance_data)
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance

def get_attendance(db: Session, attendance_id: int):
    return db.query(MemberGuestAttendance).filter(MemberGuestAttendance.id == attendance_id).first()

def update_attendance(db: Session, attendance_id: int, updates: dict):
    attendance = get_attendance(db, attendance_id)
    if not attendance:
        return None
    for key, value in updates.items():
        setattr(attendance, key, value)
    db.commit()
    return attendance

def delete_attendance(db: Session, attendance_id: int):
    attendance = get_attendance(db, attendance_id)
    if attendance:
        db.delete(attendance)
        db.commit()
    return attendance

# ---- CRUD for Venue ----

def create_venue(db: Session, venue_data: dict):
    venue = Venue(**venue_data)
    db.add(venue)
    db.commit()
    db.refresh(venue)
    return venue

# ---- CRUD for EvangelicalWorker ----

def create_evangelical_worker(db: Session, worker_data: dict):
    worker = EvangelicalWorker(**worker_data)
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker
