"""HTML-printable rates notice + section 603 certificate.

We generate semantic HTML that prints cleanly to PDF via the browser
(Cmd-P → Save as PDF). No reportlab / weasyprint dependency — keeps the
container slim and FOSS-only.
"""
from __future__ import annotations

from datetime import date
from typing import Any


def _money(cents: int | None) -> str:
    if cents is None:
        return "—"
    return f"${cents / 100:,.2f}"


_CSS = """
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
       sans-serif; color: #22303C; max-width: 720px; margin: 1.5rem auto;
       padding: 0 1rem; line-height: 1.4; }
h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
h2 { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
     color: #555; margin: 1.25rem 0 0.5rem; border-bottom: 1px solid #eee;
     padding-bottom: 0.25rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
th, td { padding: 0.375rem 0.5rem; text-align: left; border-bottom: 1px solid #f0f0f0; }
th { color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
.right { text-align: right; }
.muted { color: #666; }
.tag { display: inline-block; padding: 0.125rem 0.5rem; background: #f4f4f4;
       border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
.big { font-size: 1.75rem; font-weight: 700; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.box { background: #fafafa; border-radius: 8px; padding: 1rem; }
.brand { background: #22303C; color: #fff; padding: 0.875rem 1rem;
         border-radius: 8px; margin: 0 0 1rem; }
.brand h1 { color: #fff; }
.brand p { margin: 0.125rem 0; opacity: 0.85; font-size: 0.875rem; }
@media print { body { max-width: none; margin: 0; padding: 0.5cm; } }
"""


def render_rates_notice(
    *, council_name: str, council_brand: str,
    property_data: dict[str, Any], account: dict[str, Any],
    valuation: dict[str, Any], category_label: str,
    ad_valorem_component_cents: int, base_cents: int, minimum_cents: int,
    minimum_applied: bool, gross_cents: int, levies: list[dict[str, Any]],
    concession_cents: int, total_cents: int,
    instalments: list[dict[str, Any]],
    payment_methods: dict[str, str | None],
    fiscal_year: int, issued_on: date,
) -> str:
    """Returns a complete HTML document for an annual rates notice."""
    inst_rows = "".join(
        f"<tr><td>{i['period_label']}</td><td>{i['due_date']}</td>"
        f"<td class='right'>{_money(i['amount_cents'])}</td>"
        f"<td>{i['status']}</td></tr>" for i in instalments
    ) or "<tr><td colspan='4' class='muted'>No instalments scheduled.</td></tr>"
    levy_rows = "".join(
        f"<tr><td>{lv['label']}</td><td>{lv['kind']}</td>"
        f"<td class='right'>{_money(lv['amount_cents'])}</td></tr>"
        for lv in levies
    ) or "<tr><td colspan='3' class='muted'>None.</td></tr>"
    bpay_block = ""
    if payment_methods.get("bpay_crn"):
        bpay_block = f"""
        <div class='box'>
            <p class='muted' style='margin:0'>BPAY®</p>
            <p style='margin:0;font-weight:600'>Biller code {payment_methods.get('bpay_biller', '—')}</p>
            <p style='margin:0;font-family:monospace'>Ref {payment_methods['bpay_crn']}</p>
        </div>"""
    return f"""<!doctype html>
<html lang='en'>
<head><meta charset='utf-8'>
<title>Rates notice — {property_data['address']}</title>
<style>{_CSS}</style></head>
<body>
<header class='brand' style='background:{council_brand}'>
  <h1>{council_name}</h1>
  <p>Annual rates notice · FY{fiscal_year}/{fiscal_year + 1}</p>
  <p>Issued {issued_on.isoformat()}</p>
</header>

<section>
  <h2>Property</h2>
  <p style='margin:0;font-weight:600'>{property_data['address']}</p>
  <p class='muted' style='margin:0'>
    {property_data.get('suburb') or ''}
    {f"· {property_data.get('property_type')}" if property_data.get('property_type') else ''}
    {f"· {property_data.get('land_size_sqm')} m²" if property_data.get('land_size_sqm') else ''}
    {f"· zone {property_data.get('zone')}" if property_data.get('zone') else ''}
  </p>
</section>

<section>
  <h2>Account</h2>
  <div class='grid'>
    <div class='box'>
      <p class='muted' style='margin:0'>Account no.</p>
      <p style='margin:0;font-family:monospace;font-weight:600'>{account.get('number') or '—'}</p>
    </div>
    <div class='box'>
      <p class='muted' style='margin:0'>Annual rate</p>
      <p class='big' style='margin:0'>{_money(total_cents)}</p>
    </div>
  </div>
</section>

<section>
  <h2>Calculation</h2>
  <table>
    <tr><td>Unimproved value (UV) · {valuation.get('year', '—')}</td>
        <td class='right'>{_money(valuation.get('land_value_cents'))}</td></tr>
    <tr><td>× <strong>{category_label}</strong> ad valorem rate</td>
        <td class='right'>{_money(ad_valorem_component_cents)}</td></tr>
    <tr><td>+ Base amount</td>
        <td class='right'>{_money(base_cents)}</td></tr>
    {"<tr><td class='muted'>Minimum applied (" + _money(minimum_cents) +
     ")</td><td class='right'>" + _money(minimum_cents) + "</td></tr>"
     if minimum_applied else ""}
    <tr><td><strong>Gross general rate</strong></td>
        <td class='right'><strong>{_money(gross_cents)}</strong></td></tr>
  </table>
</section>

<section>
  <h2>Additional charges</h2>
  <table>
    <thead><tr><th>Levy</th><th>Kind</th><th class='right'>Amount</th></tr></thead>
    <tbody>{levy_rows}</tbody>
  </table>
</section>

{f"<section><h2>Concessions</h2>"
 f"<p style='margin:0'>−{_money(concession_cents)}</p></section>"
 if concession_cents > 0 else ""}

<section>
  <h2>Total payable</h2>
  <p class='big' style='margin:0'>{_money(total_cents)}</p>
</section>

<section>
  <h2>Instalments</h2>
  <table>
    <thead><tr><th>Period</th><th>Due</th><th class='right'>Amount</th><th>Status</th></tr></thead>
    <tbody>{inst_rows}</tbody>
  </table>
</section>

<section>
  <h2>How to pay</h2>
  <div class='grid'>
    {bpay_block}
    <div class='box'>
      <p class='muted' style='margin:0'>Online</p>
      <p style='margin:0;font-weight:600'>{payment_methods.get('online_url', '—')}</p>
    </div>
  </div>
</section>

<p class='muted' style='margin:1.5rem 0 0;font-size:0.75rem'>
  Interest accrues at the NSW gazetted rate on amounts unpaid after the
  due date (Local Govt Act sect.566). Pensioner concessions are credited
  on receipt of the Department of Communities &amp; Justice evidence.
</p>
</body></html>
"""


def render_certificate(
    *, council_name: str, council_brand: str, reference: str,
    snapshot: dict[str, Any], requester_name: str | None,
    fee_cents: int, valid_until: date | None, issued_on: date,
) -> str:
    """Section 603 certificate as printable HTML."""
    chg_rows = "".join(
        f"<tr><td>{c['period_start']} → {c['period_end']}</td>"
        f"<td>{c['category']}</td>"
        f"<td class='right'>{_money(c['amount_cents'])}</td></tr>"
        for c in snapshot.get("rate_charges", [])
    ) or "<tr><td colspan='3' class='muted'>None on record.</td></tr>"
    prop = snapshot.get("property", {})
    val = snapshot.get("valuation", {})
    acct = snapshot.get("account", {})
    interest = snapshot.get("outstanding_interest_cents", 0)
    return f"""<!doctype html>
<html lang='en'><head><meta charset='utf-8'>
<title>Certificate of outstanding rates — {prop.get('address', '')}</title>
<style>{_CSS}</style></head><body>
<header class='brand' style='background:{council_brand}'>
  <h1>{council_name}</h1>
  <p>Section 603 / 735A certificate</p>
  <p>Reference {reference} · issued {issued_on.isoformat()}
     {f"· valid until {valid_until.isoformat()}" if valid_until else ""}</p>
</header>

{f"<p><span class='tag'>Requested by</span> {requester_name}</p>" if requester_name else ""}

<section>
  <h2>Property</h2>
  <p style='margin:0;font-weight:600'>{prop.get('address') or '—'}</p>
  <p class='muted' style='margin:0'>
    {prop.get('suburb') or ''}
    {prop.get('postcode') or ''}
    {f"· {prop.get('property_type')}" if prop.get('property_type') else ''}
    {f"· {prop.get('land_size_sqm')} m²" if prop.get('land_size_sqm') else ''}
  </p>
</section>

<section>
  <h2>Valuation</h2>
  <table>
    <tr><td>Land value (UV)</td><td class='right'>{_money(val.get('land_value_cents'))}</td></tr>
    <tr><td>Capital value</td><td class='right'>{_money(val.get('capital_value_cents'))}</td></tr>
    <tr><td>Valuation year</td><td class='right'>{val.get('year') or '—'}</td></tr>
  </table>
</section>

<section>
  <h2>Account</h2>
  <table>
    <tr><td>Account number</td><td class='right' style='font-family:monospace'>{acct.get('number') or '—'}</td></tr>
    <tr><td>Balance outstanding</td><td class='right'><strong>{_money(acct.get('balance_cents'))}</strong></td></tr>
    <tr><td>Next due date</td><td class='right'>{acct.get('next_due_date') or '—'}</td></tr>
    <tr><td>Interest on overdue</td><td class='right'>{_money(interest)}</td></tr>
  </table>
</section>

<section>
  <h2>Rate charges on file</h2>
  <table>
    <thead><tr><th>Period</th><th>Category</th><th class='right'>Amount</th></tr></thead>
    <tbody>{chg_rows}</tbody>
  </table>
</section>

<section>
  <h2>Certificate fee</h2>
  <p style='margin:0'>{_money(fee_cents)} (statutory)</p>
</section>

<p class='muted' style='margin:1.5rem 0 0;font-size:0.75rem'>
  This certificate is issued under sections 603 and 735A of the Local
  Government Act 1993 (NSW). It is a true and correct statement of rates,
  charges, interest and amounts of arrears as at the date shown. It does
  not constitute a guarantee of correctness for any subsequent valuation
  or strike of rates.
</p>
</body></html>
"""


__all__ = ["render_certificate", "render_rates_notice"]
