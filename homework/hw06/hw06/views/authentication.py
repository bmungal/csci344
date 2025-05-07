from flask import (
    request,
    make_response,
    render_template,
    redirect,
    current_app,
)
from models import User
import flask_jwt_extended


def logout():
    # Done for you: Simply remove the JWT cookie!
    response = make_response(redirect("/login", 302))
    flask_jwt_extended.unset_jwt_cookies(response)
    return response


def login():
    can_register = True
    if request.method == "POST":
        # check if the user is valid...and if they are
        username = request.form.get("username")
        password = request.form.get("password")
        print(username, password)

        # Add your logic here...
        #1. Query for user
         #- if user doesnt exist, throw error
        the_user = User.query.filter_by(username=username).one_or_none()
        print(the_user)

        if (the_user) is None:
            return render_template("login.html", message="Invalid Username")

        #2. Check password matches
         #If password doesn't exist, throw error
        if (the_user.check_password(password)) is False:
            return render_template("login.html", message="Invalid Password")

        # If the user successfully logs into the system, set a JWT access cookie:
        access_token = flask_jwt_extended.create_access_token(
            identity=str(the_user.id)
        )
        resp = make_response(redirect("/", 302))
        flask_jwt_extended.set_access_cookies(resp, access_token)

        current_app.logger.info(f"Successful login for user: {username}")
        return resp

    elif request.method == "GET":
        # show the user the login form:
        return render_template("login.html", can_register=can_register)


def initialize_routes(app):
    app.add_url_rule("/login", view_func=login, methods=["GET", "POST"])
    app.add_url_rule("/logout", view_func=logout)
