"""
Email service using Resend for sending transactional emails.
"""

import os
import resend
from typing import Optional

# Initialize Resend with API key
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "buildwithkyle@kylepantig.site")
APP_NAME = os.getenv("APP_NAME", "E-Commerce Store")

# Initialize resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


async def send_otp_email(
    to_email: str,
    otp_code: str,
    otp_type: str = "SIGNUP"
) -> bool:
    """
    Send OTP verification email.
    
    Args:
        to_email: Recipient email address
        otp_code: 6-digit OTP code
        otp_type: Type of OTP (SIGNUP, LOGIN, PASSWORD_RESET)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    if not RESEND_API_KEY:
        print(f"[DEV MODE] OTP for {to_email}: {otp_code}")
        return True
    
    # Email subject based on type
    subjects = {
        "SIGNUP": f"Verify your email - {APP_NAME}",
        "LOGIN": f"Your login code - {APP_NAME}",
        "PASSWORD_RESET": f"Reset your password - {APP_NAME}",
    }
    subject = subjects.get(otp_type, f"Your verification code - {APP_NAME}")
    
    # Email HTML content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background-color: #18181b; padding: 32px 40px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{APP_NAME}</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
                <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
                    {"Welcome!" if otp_type == "SIGNUP" else "Your Verification Code"}
                </h2>
                
                <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                    {"Thanks for signing up! Please use the code below to verify your email address." if otp_type == "SIGNUP" else "Use the code below to complete your request."}
                </p>
                
                <!-- OTP Code Box -->
                <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #18181b; font-family: monospace;">
                        {otp_code}
                    </div>
                </div>
                
                <p style="color: #71717a; margin: 0 0 8px 0; font-size: 14px;">
                    This code will expire in <strong>10 minutes</strong>.
                </p>
                
                <p style="color: #71717a; margin: 0; font-size: 14px;">
                    If you didn't request this code, you can safely ignore this email.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
                <p style="color: #a1a1aa; margin: 0; font-size: 12px; text-align: center;">
                    &copy; 2026 {APP_NAME}. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": f"{APP_NAME} <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        
        response = resend.Emails.send(params)
        print(f"[EMAIL] OTP sent to {to_email}")
        return True
        
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {str(e)}")
        return False


async def send_welcome_email(
    to_email: str,
    full_name: Optional[str] = None
) -> bool:
    """
    Send welcome email after successful signup.
    """
    if not RESEND_API_KEY:
        print(f"[DEV MODE] Welcome email for {to_email}")
        return True
    
    name = full_name or "there"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background-color: #18181b; padding: 32px 40px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{APP_NAME}</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
                <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
                    Welcome, {name}! 🎉
                </h2>
                
                <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                    Your account has been successfully verified. You can now enjoy all the features of our store!
                </p>
                
                <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                    Here's what you can do:
                </p>
                
                <ul style="color: #52525b; margin: 0 0 24px 0; padding-left: 20px; font-size: 16px; line-height: 1.8;">
                    <li>Browse our latest products</li>
                    <li>Add items to your wishlist</li>
                    <li>Track your orders</li>
                    <li>Get exclusive deals and offers</li>
                </ul>
                
                <a href="#" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Start Shopping
                </a>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
                <p style="color: #a1a1aa; margin: 0; font-size: 12px; text-align: center;">
                    &copy; 2026 {APP_NAME}. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": f"{APP_NAME} <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": f"Welcome to {APP_NAME}! 🎉",
            "html": html_content,
        }
        
        response = resend.Emails.send(params)
        print(f"[EMAIL] Welcome email sent to {to_email}, ID: {response.get('id', 'unknown')}")
        return True
        
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send welcome email to {to_email}: {str(e)}")
        return False
