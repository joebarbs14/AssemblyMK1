"""Ad valorem rates calculator — the NSW formula.

annual_rate = max(minimum, base + UV × ad_valorem_per_dollar)

UV is unimproved (land) value in cents. ad_valorem_per_dollar is the
rate-in-the-dollar (e.g. 0.003421). Concessions (pensioner, hardship)
are deducted after the gross calc. We return the full breakdown so
both staff and residents can see how the figure was reached.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.models import Concession, RateCategory


@dataclass(frozen=True)
class RateCalc:
    land_value_cents: int
    ad_valorem_cents_per_dollar: float
    base_amount_cents: int
    minimum_cents: int
    ad_valorem_component_cents: int
    gross_cents: int
    minimum_applied: bool
    concession_cents: int
    total_cents: int

    def to_dict(self) -> dict[str, int | float | bool]:
        return {
            "land_value_cents": self.land_value_cents,
            "ad_valorem_cents_per_dollar": self.ad_valorem_cents_per_dollar,
            "base_amount_cents": self.base_amount_cents,
            "minimum_cents": self.minimum_cents,
            "ad_valorem_component_cents": self.ad_valorem_component_cents,
            "gross_cents": self.gross_cents,
            "minimum_applied": self.minimum_applied,
            "concession_cents": self.concession_cents,
            "total_cents": self.total_cents,
        }


def calculate(
    *,
    category: RateCategory,
    land_value_cents: int,
    concessions: list[Concession] | None = None,
) -> RateCalc:
    """Compute the annual rate for a property under the given category."""
    if land_value_cents < 0:
        raise ValueError("land_value_cents cannot be negative")
    # UV (cents) × rate-per-dollar → cents of rate. Round to nearest cent.
    ad_valorem_component = int(round(
        (land_value_cents / 100.0) * category.ad_valorem_cents_per_dollar * 100
    ))
    pre_minimum = category.base_amount_cents + ad_valorem_component
    minimum_applied = pre_minimum < category.minimum_cents
    gross = max(category.minimum_cents, pre_minimum)
    concession = sum(
        c.annual_value_cents or 0
        for c in (concessions or [])
        if c.status == "active"
    )
    total = max(0, gross - concession)
    return RateCalc(
        land_value_cents=land_value_cents,
        ad_valorem_cents_per_dollar=category.ad_valorem_cents_per_dollar,
        base_amount_cents=category.base_amount_cents,
        minimum_cents=category.minimum_cents,
        ad_valorem_component_cents=ad_valorem_component,
        gross_cents=gross,
        minimum_applied=minimum_applied,
        concession_cents=concession,
        total_cents=total,
    )
