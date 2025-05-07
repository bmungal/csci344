from datetime import datetime

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

from utilities import account_utilities

"""
References:
    * https://dev.to/kaelscion/authentication-hashing-in-sqlalchemy-1bem
"""
from . import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(256), nullable=False)
    last_name = db.Column(db.String(256), nullable=False)
    username = db.Column(db.String(256), nullable=False, unique=True)
    password_plaintext = db.Column(
        db.String(256), nullable=False
    )  # terrible idea...just for debugging
    password_hash = db.Column(db.String(256), nullable=False)
    email = db.Column(db.String(256), nullable=False, unique=True)
    image_url = db.Column(db.String(512), nullable=True)
    thumb_url = db.Column(db.String(512), nullable=True)
    date_created = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    is_verified = db.Column(db.Boolean(), nullable=False, default=False)
    is_disabled = db.Column(db.Boolean(), nullable=False, default=False)

    def get_unique_identifier(self):
        return self.password_hash[25:55]

    @staticmethod
    def create_account(first_name, last_name, username, email, password):

        # create user object:
        user = User(
            first_name,
            last_name,
            username,
            email,
            image_url=account_utilities.generate_image(),
            thumb_url=account_utilities.generate_image(width=30, height=30),
        )

        # generate encrypted password:
        user.password_plaintext = password
        user.set_password(user.password_plaintext)
        user.is_verified = False

        # save to database:
        db.session.add(user)
        db.session.commit()

        # send activation email
        account_utilities.send_activation_email(user)

        return user

    def __init__(
        self,
        first_name: str,
        last_name: str,
        username: str,
        email: str,
        image_url: str = None,
        thumb_url: str = None,
    ):

        self.first_name = first_name
        self.last_name = last_name
        self.username = username
        self.email = email
        self.image_url = image_url
        self.thumb_url = thumb_url

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def reset_password(self, password, commit=True):
        self.password_plaintext = password
        self.set_password(password)
        if commit:
            db.session.add(self)
            db.session.commit()

    def check_password(self, password):
        print(generate_password_hash(password))
        print(self.password_hash)
        print(self.password_plaintext, password)
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "username": self.username,
            "email": self.email,
            "image_url": self.image_url,
            "thumb_url": self.thumb_url,
        }
