import html as _html
from datetime import datetime
from email.message import EmailMessage
from .utils import send_email
import os
import ssl
import sys
import time
import urllib.request

import certifi
from disposable_email_domains import blocklist

try:
    from MailChecker import MailChecker
except ImportError:
    MailChecker = None

LIST_URL = "https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt"
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disposable_domains_cache.txt")
CACHE_MAX_AGE = 24 * 60 * 60  # refresh once a day

EXTRA_BLOCKED = set()


def _load_big_list() -> set:
    """Return the big list, downloading at most once a day. Falls back to the cache if offline."""
    fresh = os.path.exists(CACHE_FILE) and (time.time() - os.path.getmtime(CACHE_FILE) < CACHE_MAX_AGE)
    if not fresh:
        try:
            ctx = ssl.create_default_context(cafile=certifi.where())
            with urllib.request.urlopen(LIST_URL, timeout=15, context=ctx) as r:
                data = r.read().decode("utf-8")
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                f.write(data)
        except Exception as e:
            print(f"(could not refresh disposable list: {e})", file=sys.stderr)
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, encoding="utf-8") as f:
            return {line.strip().lower() for line in f if line.strip()}
    return set()


BIG_LIST = _load_big_list()


def is_disposable_email(email: str) -> bool:
    domain = email.rsplit("@", 1)[-1].lower().strip()
    parts = domain.split(".")
    candidates = [".".join(parts[i:]) for i in range(len(parts) - 1)]  # domain + parent domains
    if any(c in EXTRA_BLOCKED or c in blocklist or c in BIG_LIST for c in candidates):
        return True
    if MailChecker is not None and not MailChecker.is_valid(email):
        return True
    return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_email.py email1 [email2 ...]")
        sys.exit(1)

    for email in sys.argv[1:]:
        email = email.strip().lower()
        if "@" not in email:
            print(f"{email} -> INVALID (no @)")
            continue
        print(f"{email} -> {'DISPOSABLE email' if is_disposable_email(email) else 'normal email'}")


GLEYO_LOGO_URL = "https://zupdpwnloewdkjqsymdm.supabase.co/storage/v1/object/public/uploads/communities/7/logos/511f4996-5748-4f1f-b74c-5d5c33f7124c.png"
GLEYO_X_URL = "https://x.com/GleyoApp"
GLEYO_TG_URL = "https://t.me/GleyoApp"

_EMAIL_BASE_CSS = """
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    a { text-decoration: none; }

    body { font-family: 'Lora', Georgia, serif; background-color: #0b0b12; margin: 0; padding: 0; }
    .email-wrapper { background-color: #0b0b12; padding: 48px 16px; }
    .email-card {
        background-color: #222236; border: 1px solid #2f2f4a; border-radius: 14px;
        max-width: 520px; margin: 0 auto; overflow: hidden;
    }
    .header { background-color: #0b0b12; padding: 28px 44px 24px; border-bottom: 1px solid #2f2f4a; }
    .logo-name {
        font-family: 'Bricolage Grotesque', Arial, sans-serif; font-size: 18px;
        font-weight: 600; color: #e5e7eb; letter-spacing: 0.3px;
    }
    .body-content { padding: 44px 44px 36px; }
    .eyebrow {
        font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px;
        letter-spacing: 2.5px; text-transform: uppercase; color: #6366f1; margin-bottom: 14px;
    }
    h1 {
        font-family: 'Bricolage Grotesque', Arial, sans-serif; font-size: 27px; font-weight: 600;
        color: #e5e7eb; line-height: 1.3; margin-bottom: 18px; letter-spacing: -0.2px;
    }
    .intro { font-size: 15px; color: #bbbfc7; line-height: 1.7; margin-bottom: 30px; }
    .intro strong { color: #e5e7eb; }

    .cta-wrap { text-align: center; margin-bottom: 32px; }
    .cta-btn {
        display: inline-block; padding: 13px 32px; background: #6366f1; color: #ffffff !important;
        font-family: 'Bricolage Grotesque', Arial, sans-serif; font-size: 14.5px; font-weight: 600;
        border-radius: 10px; letter-spacing: 0.2px;
    }
    .message-box {
        border: 1px solid #2f2f4a; border-radius: 12px; padding: 18px 22px;
        margin-bottom: 30px; background: #1b1b2e;
    }
    .message-box-label {
        font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10.5px;
        letter-spacing: 1.5px; text-transform: uppercase; color: #6366f1; margin-bottom: 8px;
    }
    .message-box-content {
        font-size: 15px; color: #e5e7eb; line-height: 1.6;
        white-space: pre-wrap; word-break: break-word;
    }

    /* OTP */
    .otp-block {
        background: #0b0b12; border: 1px solid #2f2f4a; border-radius: 14px;
        padding: 26px 24px 22px; text-align: center; margin-bottom: 28px;
    }
    .otp-label {
        font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10.5px;
        letter-spacing: 2.5px; text-transform: uppercase; color: #8a8fa8; margin-bottom: 16px;
    }
    .otp-digit {
        background: #222236; border: 1px solid #2f2f4a; border-radius: 10px;
        font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 28px; font-weight: bold;
        color: #a5b4fc; line-height: 52px; height: 52px; text-align: center; white-space: nowrap;
    }
    .otp-expiry {
        font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px;
        letter-spacing: 1px; color: #6a6a80; margin-top: 18px;
    }
    .otp-expiry span { color: #a5b4fc; }

    .security-box {
        border: 1px solid #2f2f4a; border-radius: 12px; padding: 16px 20px;
        margin-bottom: 28px; background: #1b1b2e;
    }
    .security-text { font-size: 13.5px; color: #bbbfc7; line-height: 1.6; }
    .security-text strong { color: #e5e7eb; }

    .separator { height: 1px; background: #2f2f4a; margin: 0 0 26px; }
    .closing { font-size: 14.5px; color: #bbbfc7; line-height: 1.7; margin-bottom: 22px; }
    .closing strong { color: #e5e7eb; }
    .signature { font-size: 14px; color: #bbbfc7; font-style: italic; }

    .footer { background: #0b0b12; padding: 26px 44px; border-top: 1px solid #2f2f4a; text-align: center; }
    .footer-text {
        font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px;
        color: #6a6a80; line-height: 1.7; text-align: center;
    }
    .social-pill {
        display: inline-block; padding: 8px 16px; border: 1px solid #2f2f4a; border-radius: 999px;
        background: #222236; color: #c7c9ff !important;
        font-family: 'Bricolage Grotesque', Arial, sans-serif; font-size: 12.5px; font-weight: 600;
    }

    @media only screen and (max-width: 540px) {
        .body-content { padding: 32px 26px 28px !important; }
        .header { padding: 24px 26px 20px !important; }
        .footer { padding: 22px 26px !important; }
        h1 { font-size: 22px !important; }
        .otp-block { padding: 22px 14px 18px !important; }
        .otp-digit { font-size: 22px !important; line-height: 44px !important; height: 44px !important; }
    }
"""


def _email_head(title: str) -> str:
    return f"""
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <title>{_html.escape(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>{_EMAIL_BASE_CSS}</style>
    """


def _email_header_html() -> str:
    # Logo sits directly on the dark header: no colored box around it.
    return f"""
    <div class="header">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td style="vertical-align: middle; padding-right: 10px;">
                    <img src="{GLEYO_LOGO_URL}" width="34" height="34" alt="Gleyo"
                         style="display:block; border:0; width:34px; height:34px;">
                </td>
                <td style="vertical-align: middle;">
                    <span class="logo-name">Gleyo</span>
                </td>
            </tr>
        </table>
    </div>
    """


def _email_footer_html(note_html: str = "") -> str:
    note = f'<p class="footer-text" style="margin-bottom:16px;">{note_html}</p>' if note_html else ""
    return f"""
    <div class="footer">
        {note}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px;">
            <tr>
                <td style="padding-right: 8px;">
                    <a class="social-pill" href="{GLEYO_X_URL}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block; padding:8px 16px; border:1px solid #2f2f4a; border-radius:999px; background:#222236; color:#c7c9ff; font-family:Arial,sans-serif; font-size:12.5px; font-weight:600; text-decoration:none;">X (Twitter)</a>
                </td>
                <td style="padding-left: 8px;">
                    <a class="social-pill" href="{GLEYO_TG_URL}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block; padding:8px 16px; border:1px solid #2f2f4a; border-radius:999px; background:#222236; color:#c7c9ff; font-family:Arial,sans-serif; font-size:12.5px; font-weight:600; text-decoration:none;">Telegram</a>
                </td>
            </tr>
        </table>
        <p class="footer-text">© {datetime.now().year} Gleyo</p>
    </div>
    """


def _otp_cells(code: str) -> str:
    """One fixed-width cell per digit so the code can never wrap, whatever its length."""
    digits = [c for c in str(code) if not c.isspace()]
    width = round(100 / max(len(digits), 1), 2)
    cells = "".join(
        f'<td align="center" width="{width}%" style="padding:0 3px;">'
        f'<div class="otp-digit">{_html.escape(d)}</div></td>'
        for d in digits
    )
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="table-layout:fixed;"><tr>{cells}</tr></table>'
    )


def send_email_code(email: str, code: str) -> None:
    """Send OTP using HTML-styled EmailMessage."""
    msg = EmailMessage()
    msg["Subject"] = "Your Gleyo verification code"
    msg["To"] = email

    text_content = (
        f"Your Gleyo verification code is: {code}\n\n"
        "It expires in 2 minutes. Never share this code with anyone.\n"
        "If you didn't request it, you can safely ignore this email.\n\n"
        "— Gleyo"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>{_email_head("Your Verification Code")}</head>
    <body>
    <div class="email-wrapper">
    <div class="email-card">

        {_email_header_html()}

        <div class="body-content">
            <p class="eyebrow">Security Verification</p>
            <h1>Your one-time<br>passcode is ready.</h1>
            <p class="intro">
                We received a sign-in request for your account. Use the code below to finish
                verifying. It's only valid for <strong>2 minutes</strong>.
            </p>

            <div class="otp-block">
                <p class="otp-label">Verification code</p>
                {_otp_cells(code)}
                <p class="otp-expiry">Expires in <span>2 minutes</span></p>
            </div>

            <div class="security-box">
                <p class="security-text">
                    <strong>Didn't request this?</strong> You can safely ignore this email.
                    Someone may have entered your address by mistake. Your account remains secure.
                </p>
            </div>

            <div class="separator"></div>

            <p class="closing">
                Never share this code with anyone. <strong>Our team will never ask for it.</strong>
                It's single-use and expires automatically.
            </p>
            <p class="signature">— Gleyo</p>
        </div>

        {_email_footer_html()}

    </div>
    </div>
    </body>
    </html>
    """

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")

    send_email(msg)


def build_mention_email(to_email, username, community_name, tagger_username, message_content, target_url):
    tagger_display = tagger_username[:1].upper() + tagger_username[1:] if tagger_username else "Someone"

    msg = EmailMessage()
    msg["Subject"] = f"{community_name} • {tagger_display} tagged you"
    msg["From"] = "Gleyo <noreply@gleyo.app>"
    msg["To"] = to_email

    # keep the plain-text preview short/safe even if content is huge
    preview_text = (message_content or "").strip()
    if len(preview_text) > 500:
        preview_text = preview_text[:500] + "…"

    text_content = (
        f"Hey {username},\n\n"
        f"{tagger_display} tagged you in {community_name}:\n\n"
        f"\"{preview_text}\"\n\n"
        f"View it here: {target_url}\n\n"
        f"— Gleyo"
    )

    # Escape everything user-controlled before it goes into HTML
    safe_preview = _html.escape(preview_text) if preview_text else "📎 Sent an attachment"
    safe_tagger = _html.escape(tagger_display)
    safe_username = _html.escape(str(username))
    safe_community = _html.escape(str(community_name))
    safe_url = _html.escape(str(target_url), quote=True)

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>{_email_head("You were tagged")}</head>
    <body>
    <div class="email-wrapper">
    <div class="email-card">

        {_email_header_html()}

        <div class="body-content">
            <p class="eyebrow">You Were Tagged</p>
            <h1>{safe_tagger} tagged<br>you in {safe_community}.</h1>
            <p class="intro">
                Hey {safe_username} — <strong>{safe_tagger}</strong> mentioned you in a message.
                Here's what they said:
            </p>

            <div class="message-box">
                <p class="message-box-label">Message</p>
                <p class="message-box-content">{safe_preview}</p>
            </div>

            <div class="cta-wrap">
                <a href="{safe_url}" class="cta-btn">View Message</a>
            </div>

            <div class="separator"></div>

            <p class="signature">— Gleyo</p>
        </div>

        {_email_footer_html(f"You're receiving this because {safe_tagger} tagged you in {safe_community} on Gleyo.")}

    </div>
    </div>
    </body>
    </html>
    """

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")
    return msg