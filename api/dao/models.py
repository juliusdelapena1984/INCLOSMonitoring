from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# -------------------------
# Table: BIBLE_MISSION
# -------------------------
class BibleMission(Base):
    __tablename__ = 'bible_mission'

    event_id = Column(Integer, primary_key=True)
    locale_id = Column(Integer)
    schedule = Column(DateTime)
    venue_id = Column(Integer, ForeignKey('venues.venue_id'))  # <-- Foreign Key
    worker_name = Column(String(255))
    last_modified_by = Column(String(255))
    last_modified_ts = Column(DateTime)

    # Relationships
    attendees = relationship("MemberGuestAttendance", back_populates="event")
    venue = relationship("Venue", back_populates="bible_missions")  # <-- NEW

    # --- Read-only properties ---
    @property
    def date(self) -> str:
        """Returns only the date part in YYYY-MM-DD format."""
        return self.schedule.strftime('%Y-%m-%d') if self.schedule else None

    @property
    def time(self) -> str:
        """Returns time in HH:MM format (24-hour clock)."""
        return self.schedule.strftime('%H:%M') if self.schedule else None

# -------------------------
# Table: MEMBER_GUEST_ATTENDANCE
# -------------------------
class MemberGuestAttendance(Base):
    __tablename__ = 'member_guest_attendance'

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey('bible_mission.event_id'), nullable=False)
    member_id = Column(Integer, ForeignKey('members.member_id'), nullable=True)
    guests = Column(String(255))

    # Relationships
    event = relationship("BibleMission", back_populates="attendees")
    member = relationship("Member", back_populates="attendances")


# -------------------------
# Table: MEMBERS
# -------------------------
class Member(Base):
    __tablename__ = 'members'

    member_id = Column(Integer, primary_key=True)
    full_name = Column(String(255))
    area_group = Column(String(255))
    cfo = Column(String(255))
    office = Column(String(255))


# -------------------------
# Table: VENUES
# -------------------------
class Venue(Base):
    __tablename__ = 'venues'

    venue_id = Column(Integer, primary_key=True)
    code = Column(String(100))
    name = Column(String(255))
    address = Column(String(255))


# -------------------------
# Table: EVANGELICAL_WORKER
# -------------------------
class EvangelicalWorker(Base):
    __tablename__ = 'evangelical_worker'

    asgd_no = Column(String(100), primary_key=True)
    name = Column(String(255))
    image_url = Column(Text)  # Max size for URLs or base64 data
