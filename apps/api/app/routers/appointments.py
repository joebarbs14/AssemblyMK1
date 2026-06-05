"""M3.5: appointments + completion signatures on a report.

Both kinds emit a corresponding event into the report timeline so the
shared workspace stays the single source of truth.
"""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    AppointmentStatus,
    Report,
    ReportAppointment,
    ReportEventKind,
    ReportSignature,
    User,
    UserRole,
)
from app.services.reports import append_event

router = APIRouter(tags=["appointments"])


def _staff_report(db: Session, *, user: User, report_id: int) -> Report:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")
    rep = db.get(Report, report_id)
    if rep is None or rep.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Report not found")
    return rep


def _resident_report(db: Session, *, user: User, report_id: int) -> Report:
    rep = db.get(Report, report_id)
    if rep is None or rep.council_id != user.council_id or rep.reporter_user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    return rep


# --- Schemas ---


class AppointmentIn(BaseModel):
    slot_start: datetime
    slot_end: datetime
    location_text: str | None = None
    notes: str | None = None


class AppointmentOut(BaseModel):
    id: int
    report_id: int
    slot_start: datetime
    slot_end: datetime
    location_text: str | None
    status: str
    notes: str | None
    confirmed_at: datetime | None
    completed_at: datetime | None


class SignatureRequestIn(BaseModel):
    kind: str = "resident_acknowledge"  # or staff_completion


class SignatureProvideIn(BaseModel):
    attachment_id: int | None = None  # the signed PNG, if captured client-side


class SignatureOut(BaseModel):
    id: int
    report_id: int
    kind: str
    signed_at: datetime
    attachment_id: int | None


# --- Staff: propose appointment ---


@router.post(
    "/staff/reports/{report_id}/appointments",
    response_model=AppointmentOut,
    status_code=201,
)
def propose_appointment(
    report_id: int,
    body: AppointmentIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    rep = _staff_report(db, user=user, report_id=report_id)
    if body.slot_end <= body.slot_start:
        raise HTTPException(status_code=400, detail="slot_end must be after slot_start")
    appt = ReportAppointment(
        report_id=rep.id,
        proposed_by_user_id=user.id,
        slot_start=body.slot_start,
        slot_end=body.slot_end,
        location_text=body.location_text,
        notes=body.notes,
        status=AppointmentStatus.proposed.value,
    )
    db.add(appt)
    db.flush()
    append_event(
        db,
        report=rep,
        actor=user,
        kind=ReportEventKind.appointment_proposed,
        body=body.notes,
        internal=False,
        metadata={
            "appointment_id": appt.id,
            "slot_start": appt.slot_start.isoformat(),
            "slot_end": appt.slot_end.isoformat(),
            "location_text": appt.location_text,
        },
        commit=False,
    )
    db.commit()
    db.refresh(appt)
    return _serialize_appt(appt)


# --- Resident: confirm or cancel ---


@router.post(
    "/reports/{report_id}/appointments/{appt_id}/confirm",
    response_model=AppointmentOut,
)
def confirm_appointment(
    report_id: int,
    appt_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    rep = _resident_report(db, user=user, report_id=report_id)
    appt = db.get(ReportAppointment, appt_id)
    if appt is None or appt.report_id != rep.id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status != AppointmentStatus.proposed.value:
        raise HTTPException(status_code=400, detail=f"Cannot confirm a {appt.status} appointment")
    appt.status = AppointmentStatus.confirmed.value
    appt.confirmed_at = datetime.now(UTC)
    append_event(
        db, report=rep, actor=user, kind=ReportEventKind.appointment_confirmed,
        metadata={"appointment_id": appt.id}, commit=False,
    )
    db.commit()
    db.refresh(appt)
    return _serialize_appt(appt)


@router.post(
    "/reports/{report_id}/appointments/{appt_id}/cancel",
    response_model=AppointmentOut,
)
def cancel_appointment(
    report_id: int,
    appt_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    rep = db.get(Report, report_id)
    if rep is None or rep.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Report not found")
    is_staff = user.role in (UserRole.staff.value, UserRole.admin.value)
    if not is_staff and rep.reporter_user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    appt = db.get(ReportAppointment, appt_id)
    if appt is None or appt.report_id != rep.id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = AppointmentStatus.cancelled.value
    append_event(
        db, report=rep, actor=user, kind=ReportEventKind.appointment_cancelled,
        metadata={"appointment_id": appt.id}, commit=False,
    )
    db.commit()
    db.refresh(appt)
    return _serialize_appt(appt)


# --- Staff: mark completed ---


@router.post(
    "/staff/reports/{report_id}/appointments/{appt_id}/complete",
    response_model=AppointmentOut,
)
def complete_appointment(
    report_id: int,
    appt_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    rep = _staff_report(db, user=user, report_id=report_id)
    appt = db.get(ReportAppointment, appt_id)
    if appt is None or appt.report_id != rep.id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = AppointmentStatus.completed.value
    appt.completed_at = datetime.now(UTC)
    append_event(
        db, report=rep, actor=user, kind=ReportEventKind.appointment_completed,
        metadata={"appointment_id": appt.id}, commit=False,
    )
    db.commit()
    db.refresh(appt)
    return _serialize_appt(appt)


# --- Signatures ---


@router.post(
    "/staff/reports/{report_id}/signatures/request",
    status_code=204,
)
def staff_request_signature(
    report_id: int,
    body: SignatureRequestIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    rep = _staff_report(db, user=user, report_id=report_id)
    append_event(
        db, report=rep, actor=user, kind=ReportEventKind.signature_requested,
        body=None, internal=False,
        metadata={"kind": body.kind},
    )
    return None


@router.post(
    "/reports/{report_id}/signatures",
    response_model=SignatureOut,
    status_code=201,
)
def resident_provide_signature(
    report_id: int,
    body: SignatureProvideIn,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SignatureOut:
    rep = _resident_report(db, user=user, report_id=report_id)
    sig = ReportSignature(
        report_id=rep.id,
        signer_user_id=user.id,
        kind="resident_acknowledge",
        attachment_id=body.attachment_id,
        ip_address=request.client.host if request.client else None,
        user_agent=(request.headers.get("user-agent") or "")[:255],
    )
    db.add(sig)
    db.flush()
    append_event(
        db, report=rep, actor=user, kind=ReportEventKind.signature_provided,
        metadata={"signature_id": sig.id, "kind": sig.kind}, commit=False,
    )
    db.commit()
    db.refresh(sig)
    return SignatureOut(
        id=sig.id, report_id=sig.report_id, kind=sig.kind,
        signed_at=sig.signed_at, attachment_id=sig.attachment_id,
    )


def _serialize_appt(a: ReportAppointment) -> AppointmentOut:
    return AppointmentOut(
        id=a.id,
        report_id=a.report_id,
        slot_start=a.slot_start,
        slot_end=a.slot_end,
        location_text=a.location_text,
        status=a.status,
        notes=a.notes,
        confirmed_at=a.confirmed_at,
        completed_at=a.completed_at,
    )
