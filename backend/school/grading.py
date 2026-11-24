"""CBC performance levels derived from a 0–100 score.

Kindergarten and Primary use the 4-level rubric; Junior Secondary uses the
8-level scale. The score bands below are a common convention — the school
should confirm them, and they can be changed here without a migration
(stored levels are recomputed whenever a result is saved).
"""
from decimal import Decimal

# (minimum score, code, label) — checked top to bottom.
FOUR_LEVEL = [
    (Decimal(75), "EE", "Exceeding Expectations"),
    (Decimal(50), "ME", "Meeting Expectations"),
    (Decimal(25), "AE", "Approaching Expectations"),
    (Decimal(0), "BE", "Below Expectations"),
]

EIGHT_LEVEL = [
    (Decimal(90), "EE1", "Exceeding Expectations 1"),
    (Decimal(75), "EE2", "Exceeding Expectations 2"),
    (Decimal(58), "ME1", "Meeting Expectations 1"),
    (Decimal(41), "ME2", "Meeting Expectations 2"),
    (Decimal(31), "AE1", "Approaching Expectations 1"),
    (Decimal(21), "AE2", "Approaching Expectations 2"),
    (Decimal(11), "BE1", "Below Expectations 1"),
    (Decimal(0), "BE2", "Below Expectations 2"),
]

JUNIOR_SECONDARY_GRADES = {"grade-7", "grade-8", "grade-9"}
KINDERGARTEN_GRADES = {"pp1", "pp2"}


def section_for_grade(grade: str) -> str:
    if grade in KINDERGARTEN_GRADES:
        return "kindergarten"
    if grade in JUNIOR_SECONDARY_GRADES:
        return "junior-secondary"
    return "primary"


def level_for(score: Decimal, grade: str) -> tuple[str, str]:
    """Return (code, label) for a score in a class of the given grade."""
    scale = EIGHT_LEVEL if grade in JUNIOR_SECONDARY_GRADES else FOUR_LEVEL
    for minimum, code, label in scale:
        if score >= minimum:
            return code, label
    return scale[-1][1], scale[-1][2]
