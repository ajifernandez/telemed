import os

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


class EmailService:
    def __init__(self):
        self.api_key = os.getenv("SENDGRID_API_KEY")
        self.from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@tuclinica.com")
        self.from_name = os.getenv("FROM_NAME", "Tu Clínica Médica")

    def send_consultation_confirmation(self, to_email: str, full_name: str, consultation):
        message = Mail(from_email=(self.from_email, self.from_name), to_emails=to_email)
        message.template_id = "d-consultation-confirmation-template"
        message.dynamic_template_data = {
            "full_name": full_name,
            "scheduled_at": getattr(consultation, "scheduled_at", None),
            "specialty": getattr(consultation, "specialty", ""),
            "jitsi_room_url": getattr(consultation, "jitsi_room_url", ""),
            "support_email": "soporte@tuclinica.com",
        }

        try:
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            return {"success": True, "status_code": response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_temporary_password_email(
        self, to_email: str, full_name: str, temporary_password: str
    ):
        """Send temporary password email to new medical professional"""
        message = Mail(from_email=(self.from_email, self.from_name), to_emails=to_email)

        message.template_id = (
            "d-temp-password-template"  # TODO: Create template in SendGrid
        )

        message.dynamic_template_data = {
            "full_name": full_name,
            "temporary_password": temporary_password,
            "login_url": "https://tuclinica.com/login",
            "support_email": "soporte@tuclinica.com",
        }

        try:
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            return {"success": True, "status_code": response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_password_reset_email(
        self, to_email: str, full_name: str, reset_token: str
    ):
        """Send password reset email"""
        message = Mail(from_email=(self.from_email, self.from_name), to_emails=to_email)

        message.template_id = (
            "d-password-reset-template"  # TODO: Create template in SendGrid
        )

        reset_url = f"https://tuclinica.com/reset-password?token={reset_token}"

        message.dynamic_template_data = {
            "full_name": full_name,
            "reset_url": reset_url,
            "support_email": "soporte@tuclinica.com",
        }

        try:
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            return {"success": True, "status_code": response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_welcome_email(self, to_email: str, full_name: str):
        """Send welcome email after successful registration"""
        message = Mail(from_email=(self.from_email, self.from_name), to_emails=to_email)

        message.template_id = "d-welcome-template"  # TODO: Create template in SendGrid

        message.dynamic_template_data = {
            "full_name": full_name,
            "dashboard_url": "https://tuclinica.com/dashboard",
            "support_email": "soporte@tuclinica.com",
        }

        try:
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            return {"success": True, "status_code": response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}


# Email templates for development (when SendGrid is not configured)
class DevEmailService:
    @staticmethod
    def send_consultation_confirmation(to_email: str, full_name: str, consultation):
        body = DevEmailService.get_consultation_confirmation_template(full_name, consultation)
        print("\n--- DEV EMAIL (consultation confirmation) ---")
        print(f"To: {to_email}")
        print(body)
        print("--- END DEV EMAIL ---\n")

    @staticmethod
    def get_temporary_password_template(full_name: str, temporary_password: str) -> str:
        return f"""
        Hola {full_name},

        Bienvenido a Tu Clínica Médica. Tu cuenta ha sido creada exitosamente.

        Tu contraseña temporal es: {temporary_password}

        Por favor, inicia sesión y cambia tu contraseña inmediatamente por seguridad.

        URL de acceso: https://tuclinica.com/login

        Esta contraseña temporal expirará en 24 horas.

        Si tienes alguna pregunta, contacta a soporte@tuclinica.com

        Saludos,
        El equipo de Tu Clínica Médica
        """

    @staticmethod
    def get_consultation_confirmation_template(full_name: str, consultation) -> str:
        scheduled_at = getattr(consultation, "scheduled_at", None)
        specialty = getattr(consultation, "specialty", "")
        room_url = getattr(consultation, "jitsi_room_url", "")

        return f"""
        Hola {full_name},

        Tu videoconsulta ha sido confirmada.

        Especialidad: {specialty}
        Fecha/Hora: {scheduled_at}

        Enlace de la sala (Jitsi):
        {room_url}

        Saludos,
        El equipo de Tu Clínica Médica
        """

    @staticmethod
    def get_password_reset_template(full_name: str, reset_url: str) -> str:
        return f"""
        Hola {full_name},

        Has solicitado restablecer tu contraseña.

        Haz clic en el siguiente enlace para crear una nueva contraseña:
        {reset_url}

        Este enlace expirará en 1 hora por seguridad.

        Si no solicitaste restablecer tu contraseña, ignora este correo.

        Si tienes alguna pregunta, contacta a soporte@tuclinica.com

        Saludos,
        El equipo de Tu Clínica Médica
        """


def get_email_service():
    """Get appropriate email service based on configuration"""
    if os.getenv("SENDGRID_API_KEY"):
        return EmailService()
    else:
        return DevEmailService()
