from dotenv import load_dotenv

load_dotenv()
import os
import flask_jwt_extended


from flask import Flask, render_template, request
from flask_cors import CORS
from flask_restful import Api

from models import db
from models.api_navigator import ApiNavigator
from models.user import User
from views import initialize_routes
from flask import send_from_directory
import decorators 


app = Flask(__name__)


cors = CORS(app, 
    resources={r"/api/*": {"origins": '*'}}, 
    supports_credentials=True # new
)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DB_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
api = Api(app)

# 4. Turn on the JWT Manager
app.config["JWT_SECRET_KEY"] = os.environ.get('JWT_SECRET')
app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
app.config["JWT_COOKIE_SECURE"] = False
app.config['PROPAGATE_EXCEPTIONS'] = True 
jwt = flask_jwt_extended.JWTManager(app)

# Include JWT starter code for querying the DB for user info:
# Include JWT starter code for querying the DB for user info:
@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    # print('JWT data:', jwt_data)
    user_id = jwt_data["sub"]
    user_id = int(user_id) # cast to an integer
    return User.query.filter_by(id=user_id).one_or_none()

# Initialize routes for all of your API endpoints:
initialize_routes(api, flask_jwt_extended.current_user)


# Route for serving static react files
@app.route("/<path:filename>")
def custom_static(filename):
    try:
        return send_from_directory(app.root_path + "/static/react-client/dist", filename)
    except FileNotFoundError:
        return "File not found, probably because you're in development mode.", 404


@app.route("/")
@decorators.jwt_or_login
def home():
    if os.getenv("ENVIRONMENT") != "development":
        return send_from_directory(
        app.root_path + "/static/react-client/dist", "index.html"
    )
    else:
        return f'''
            Hello, {flask_jwt_extended.current_user.username}.
            In development mode, React is served by Vite.
            In production mode, this route will serve your react app.
        '''


@app.route("/api")
@app.route("/api/")
@decorators.jwt_or_login
def api_docs():
    access_token = request.cookies.get("access_token_cookie")
    csrf = request.cookies.get("csrf_access_token")

    navigator = ApiNavigator(flask_jwt_extended.current_user)
    return render_template(
        "api/api-docs.html",
        user=flask_jwt_extended.current_user,
        endpoints=navigator.get_endpoints(),
        access_token=access_token,
        csrf=csrf,
        url_root=request.url_root[0:-1],  # trim trailing slash
    )


# enables flask app to run using "python3 app.py"
if __name__ == "__main__":
    app.run()
