import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

class MailHandler:
    def __init__(self):
        self.conf = ConnectionConfig(
            MAIL_USERNAME=os.getenv("MAIL_USERNAME", "").strip(),
            MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "").strip(),
            MAIL_FROM=os.getenv("MAIL_FROM", "").strip(),
            MAIL_PORT=465,
            MAIL_SERVER="smtp.gmail.com",
            MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "EnergyMind AI"),
            MAIL_STARTTLS=False,
            MAIL_SSL_TLS=True,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )
        self.fm = FastMail(self.conf)

    async def send_otp_email(self, email_to: EmailStr, otp: str):
        # Using local static folder in backend for reliable access on Render
        logo_path = os.path.join(os.path.dirname(__file__), "static", "logo.png")
        
        html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #1a1a1a; border-radius: 16px; background-color: #0d0d0d; color: #ffffff; box-shadow: 0 10px 30px rgba(0,255,131,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="cid:logo" alt="EnergyMind AI" style="width: 120px; height: auto; margin-bottom: 10px;" />
                <h1 style="color: #00ff83; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Identity Verification</h1>
                <p style="color: #a0a0a0; font-size: 14px; margin-top: 5px;">Secure Neural Analysis Pipeline</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.03); padding: 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="margin-top: 0; font-size: 16px;">Hello,</p>
                <p style="color: #cccccc; line-height: 1.6;">Thank you for joining Enerlytics AI. To complete your secure registration and activate your intelligence hub, please enter the following One-Time Password (OTP):</p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <div style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #00ff83; background: #1a1a1a; padding: 15px 35px; border-radius: 8px; border: 1px solid #00ff83; box-shadow: 0 0 20px rgba(0,255,131,0.2);">
                        {otp}
                    </div>
                </div>
                
                <p style="font-size: 12px; color: #666666; text-align: center;">This security code will expire in 10 minutes. If you did not initiate this request, please disregard this communication.</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 30px 0;" />
            
            <div style="text-align: center;">
                <p style="font-size: 11px; color: #444444; margin: 0; text-transform: uppercase; tracking-wider: 2px;">&copy; 2026 Enerlytics AI - Advanced Energy Intelligence</p>
                <p style="font-size: 10px; color: #333333; margin-top: 5px;">Confidentiality Guaranteed • Neural Encryption Active</p>
            </div>
        </div>
        """
        
        message = MessageSchema(
            subject="Enerlytics AI - Verification Code Required",
            recipients=[email_to],
            body=html,
            subtype=MessageType.html,
            attachments=[
                {
                    "file": logo_path,
                    "headers": {
                        "Content-ID": "<logo>",
                        "Content-Disposition": "inline; filename=\"logo.png\"",
                    },
                    "mime_type": "image",
                    "mime_subtype": "png",
                }
            ]
        )
        
        try:
            await self.fm.send_message(message)
            return True
        except Exception as e:
            print(f"[MAIL ERROR] Failed to send OTP to {email_to}: {e}")
            return False

# Initialize singleton
mail_handler = MailHandler()
