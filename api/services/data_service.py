from sqlalchemy.orm import Session, joinedload
from api.dao.models import BibleMission, Venue, Member, EvangelicalWorker, Locale
from datetime import datetime, timedelta

def create_bible_mission(db: Session, data: dict):
    mission = BibleMission(**data)
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission

def get_bible_mission_with_venue(db: Session, event_id: int):
    return db.query(BibleMission)\
             .options(joinedload(BibleMission.venue))\
             .filter(BibleMission.event_id == event_id)\
             .first()

def list_all_missions_with_venues(db: Session):
    return db.query(BibleMission)\
             .options(joinedload(BibleMission.venue))\
             .all()

def list_recent_missions_with_venues(db: Session):
    three_months_ago = datetime.now() - timedelta(days=90)
    return db.query(BibleMission)\
             .options(joinedload(BibleMission.venue))\
             .filter(BibleMission.schedule >= three_months_ago)\
             .order_by(BibleMission.schedule.desc())\
             .all()

# ---- Venue ----
def create_venue(db: Session, data: dict):
    venue = Venue(**data)
    db.add(venue)
    db.commit()
    db.refresh(venue)
    return venue

def get_venue(db: Session, venue_id: int):
    return db.query(Venue).filter(Venue.venue_id == venue_id).first()

def update_venue(db: Session, venue_id: int, updates: dict):
    venue = get_venue(db, venue_id)
    if venue:
        for key, value in updates.items():
            setattr(venue, key, value)
        db.commit()
    return venue

def delete_venue(db: Session, venue_id: int):
    venue = get_venue(db, venue_id)
    if venue:
        db.delete(venue)
        db.commit()
    return venue

# ---- Member ----
def create_member(db: Session, data: dict):
    member = Member(**data)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

def get_member(db: Session, member_id: int):
    return db.query(Member).filter(Member.member_id == member_id).first()

def update_member(db: Session, member_id: int, updates: dict):
    member = get_member(db, member_id)
    if member:
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

# ---- EvangelicalWorker ----
def create_worker(db: Session, data: dict):
    worker = EvangelicalWorker(**data)
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker

def get_worker(db: Session, asgd_no: str):
    return db.query(EvangelicalWorker).filter(EvangelicalWorker.asgd_no == asgd_no).first()

def update_worker(db: Session, asgd_no: str, updates: dict):
    worker = get_worker(db, asgd_no)
    if worker:
        for key, value in updates.items():
            setattr(worker, key, value)
        db.commit()
    return worker

def delete_worker(db: Session, asgd_no: str):
    worker = get_worker(db, asgd_no)
    if worker:
        db.delete(worker)
        db.commit()
    return worker

# ---- Locale ----
def create_locale(db: Session, data: dict):
    locale = Locale(**data)
    db.add(locale)
    db.commit()
    db.refresh(locale)
    return locale

def get_locale(db: Session, locale_id: int):
    return db.query(Locale).filter(Locale.locale_id == locale_id).first()

def update_locale(db: Session, locale_id: int, updates: dict):
    locale = get_locale(db, locale_id)
    if locale:
        for key, value in updates.items():
            setattr(locale, key, value)
        db.commit()
    return locale

def delete_locale(db: Session, locale_id: int):
    locale = get_locale(db, locale_id)
    if locale:
        db.delete(locale)
        db.commit()
    return locale

# ---- List All Data ----

def list_all_venues(db: Session):
    return db.query(Venue).all()

def list_all_members(db: Session):
    return db.query(Member).all()

def list_all_workers(db: Session):
    return db.query(EvangelicalWorker).all()

def list_all_locales(db: Session):
    return db.query(Locale).all()