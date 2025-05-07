import os
import random
import re
from datetime import datetime, timedelta

from faker import Faker

import models
from models import db
from views import get_authorized_user_ids


def password_check_is_valid(password):
    """
    Verify the strength of 'password'
    Returns a dict indicating the wrong criteria
    A password is considered strong if:
        8 characters length or more
        1 digit or more
        1 symbol or more
        1 uppercase letter or more
        1 lowercase letter or more
    """

    # calculating the length
    length_error = len(password) < 8

    # searching for digits
    digit_error = re.search(r"\d", password) is None

    # searching for uppercase
    uppercase_error = re.search(r"[A-Z]", password) is None

    # searching for lowercase
    lowercase_error = re.search(r"[a-z]", password) is None

    # searching for symbols
    symbol_error = (
        re.search(r"[ !#$%&'()*+,-./[\\\]^_`{|}~" + r'"]', password) is None
    )

    # overall result
    password_ok = not (
        length_error
        or digit_error
        or uppercase_error
        or lowercase_error
        or symbol_error
    )
    return password_ok


def email_check_is_valid(email):
    # https://stackabuse.com/python-validate-email-address-with-regular-expressions-regex/
    regex = re.compile(
        r"([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|\"([]!#-[^-~ \t]|(\\[\t -~]))+\")@([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|\[[\t -Z^-~]*])"
    )
    if re.fullmatch(regex, email):
        return True
    else:
        False


def generate_image(id: int = None, width: int = 300, height: int = 200):
    """
    Generates fake image:
        * id (int): image identifier
        * width (int): width of the pic
        * height (int): height of the pic
    Returns an image url.
    """
    image_id = id or random.randint(0, 1000)
    return "https://picsum.photos/{w}/{h}?id={id}".format(
        id=image_id, w=width, h=height
    )


def delete_account(user):
    models.User.query.filter_by(id=user.id).delete()
    db.session.commit()
