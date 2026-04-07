# emails.py
import os, smtplib, threading
from email.message import EmailMessage

def _send_email_task(data):
    smtp_user = os.getenv("MAIL_USER", "okiringozi4@gmail.com")
    smtp_pass = os.getenv("MAIL_PASS", "ajndhjarvfrwxase")

    msg = EmailMessage()
    msg["From"] = smtp_user
    msg["To"] = data["email"]
    msg["Subject"] = f"✅ Payment Successful – Ref: {data['reference_code']}"

    msg.set_content(f"""
Hi {data['fullname']},

We’ve successfully received your payment of **${data['budget']}**.  
Your payment reference **{data['reference_code']}** is now marked as **Paid** ✅.

🚀 Your community **{data['community_name']}** is now upgraded to **Premium**!  
That means you now have access to all the tools, features, and perks to grow faster and unlock more opportunities.  

If you need a receipt or have any questions, just hit reply — our team is here for you.  

Thanks for choosing us to power your community — let’s build something amazing together! 💡  

Cheers,  
The [Your Company Name] Team
""")

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(smtp_user, smtp_pass)
            s.send_message(msg)

        print(f"✅ Payment confirmation email sent to {data['email']}")
    except Exception as e:
        print(f"❌ Error sending payment email: {e}")


def send_payment_confirmation_email(request_entry):
    # 👇 Resolve relationship while still inside app context
    try:
        community_name = (
            request_entry.community.name if request_entry.community else "Your Community"
        )
    except Exception:
        community_name = "Your Community"

    # 👇 Now build a plain dict — no SQLAlchemy objects!
    data = {
        "email": request_entry.email,
        "fullname": request_entry.fullname,
        "budget": float(request_entry.budget),   # ensure it's a primitive
        "reference_code": request_entry.reference_code,
        "community_name": community_name,
    }

    # 👇 Thread gets only plain dict, no ORM, no lazy loading
    threading.Thread(target=_send_email_task, args=(data,)).start()
