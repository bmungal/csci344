import flask_jwt_extended
from functools import wraps
from typing import Callable
from flask import redirect, current_app
from flask_jwt_extended.exceptions import (
    NoAuthorizationError,
    InvalidHeaderError,
    JWTExtendedException,
    CSRFError
)


def jwt_or_login(view_function):
    """
    Decorator that verifies JWT token and redirects to login if authentication fails.
    """
    @wraps(view_function)  # Properly preserves function metadata
    def wrapper(*args, **kwargs):
        try:
            flask_jwt_extended.verify_jwt_in_request()
            return view_function(*args, **kwargs)
            
        except NoAuthorizationError:
            # No token found
            current_app.logger.info("No JWT token found in request")
            return redirect("/login", code=302)
            
        except InvalidHeaderError as e:
            # Malformed token
            current_app.logger.warning(f"Invalid JWT header: {str(e)}")
            return redirect("/login", code=302)
            
        except CSRFError as e:
            # CSRF validation failed
            current_app.logger.warning(f"CSRF validation failed: {str(e)}")
            return redirect("/login", code=302)
            
        except JWTExtendedException as e:
            # Other JWT-related errors (expired, invalid signature, etc)
            current_app.logger.warning(f"JWT validation failed: {str(e)}")
            return redirect("/login", code=302)
            
        except Exception as e:
            # Unexpected errors
            current_app.logger.error(f"Unexpected error in jwt_or_login: {str(e)}")
            return redirect("/login", code=302)
            
    return wrapper
