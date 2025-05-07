import csv
import os
import random
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv
from faker import Faker
from flask import Flask

from models import db
from models.bookmark import Bookmark
from models.comment import Comment
from models.following import Following
from models.like_comment import LikeComment
from models.like_post import LikePost
from models.post import Post
from models.story import Story
from models.user import User

load_dotenv()

fake = Faker()

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DB_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# global variables to keep track of what got created and for whom
users = []
posts = []
comments = []
ppl_user_is_following_map = {}

response = requests.get("https://picsum.photos/v2/list?page=2&limit=100")
image_ids = list(map(lambda x: x.get("id"), response.json()))


def generate_image(id: int = None, width: int = 300, height: int = 200):
    """
    Generates fake image:
        * id (int): image identifier
        * width (int): width of the pic
        * height (int): height of the pic
    Returns an image url.
    """
    image_id = id or random.choice(image_ids)
    return "https://picsum.photos/id/{id}/{w}/{h}".format(
        id=image_id, w=width, h=height
    )


def create_webdev_user():
    # 1. generate fake user data
    first_name = "Webdev"
    last_name = "User"
    username = "webdev"
    email = "fake@email.com"

    # 2. create a new user (DB object)
    user = User(
        first_name,
        last_name,
        username,
        email,
        image_url=generate_image(),
        thumb_url=generate_image(width=30, height=30),
    )
    # 3. generate encrypted password:
    user.password_plaintext = "password"
    user.set_password(user.password_plaintext)
    user.is_verified = True
    user.is_disabled = False

    users.append(user)
    db.session.add(user)
    db.session.commit()


def _create_user(data=None):
    if not data:
        # 1. generate fake user data
        profile = fake.simple_profile()
        tokens = profile["name"].split(" ")
        first_name = tokens.pop(0)
        last_name = " ".join(tokens)
        username = "{0}_{1}".format(
            first_name, last_name.replace(" ", "_")
        ).lower()
        provider = profile["mail"].split("@")[1]
        email = "{0}@{1}".format(username, provider)
    else:
        first_name = data[0]
        last_name = data[1]
        username = first_name.lower().replace(" ", "")
        email = data[2]

    # 2. create a new user (DB object)
    user = User(
        first_name,
        last_name,
        username,
        email,
        image_url=generate_image(),
        thumb_url=generate_image(width=30, height=30),
    )
    # generate fake password. In reality, never store passwords
    # in plaintext, but useful when we're testing...
    user.password_plaintext = "password"
    user.is_verified = True
    user.is_disabled = False
    # encrypt fake password (how you should actually do it)...
    user.set_password(user.password_plaintext)  # encrypts password
    return user


def _create_post(user):
    time_of_post = datetime.now() - timedelta(hours=random.randint(1, 100))
    return Post(
        generate_image(width=600, height=430),
        user.id,
        caption=fake.sentence(nb_words=random.randint(15, 50)),
        pub_date=time_of_post,
    )


def _create_story(user):
    time_of_post = datetime.now() - timedelta(hours=random.randint(1, 100))
    return Story(
        fake.sentence(nb_words=random.randint(10, 30)),
        user.id,
        pub_date=time_of_post,
    )


# def _create_post_likes(post, follower_ids):
#     user_ids = follower_ids.copy()
#     # only followers of the current user (or the current user) can like
#     # the user's post:
#     # print('Creating post likes...')
#     for _ in range(random.randint(0, 5)):
#         i = random.randint(0, len(user_ids) - 1)
#         user_id = user_ids.pop(i)
#         like = LikePost(user_id, post.id)
#         db.session.add(like)
#         if len(user_ids) == 0:
#             break


def _create_comment(post, follower_ids):
    return Comment(
        fake.sentence(nb_words=random.randint(15, 50)),
        random.choice(follower_ids),
        post.id,
    )


def create_users(n=29):
    for _ in range(n):
        user = _create_user()
        users.append(user)
        db.session.add(user)
    db.session.commit()


def create_users_from_csv():
    with open("users.csv", "r") as file:
        reader = csv.reader(file)
        for row in reader:
            print("    * ", row[0], row[1], "(" + row[2] + ")")
            user = _create_user(row)
            users.append(user)
            db.session.add(user)
    db.session.commit()


def create_accounts_that_you_follow(users):
    for user in users:
        accounts_to_follow = []
        while len(accounts_to_follow) < 10:
            candidate_account = random.choice(users)
            if (
                candidate_account != user
                and candidate_account not in accounts_to_follow
            ):
                following = Following(user.id, candidate_account.id)
                db.session.add(following)

                # add to map:
                if user.id not in ppl_user_is_following_map:
                    ppl_user_is_following_map[user.id] = []
                ppl_user_is_following_map[user.id].append(candidate_account.id)

                accounts_to_follow.append(candidate_account)
    db.session.commit()


def create_posts(users):
    for user in users:
        # generate between 5 and 10 posts per user:
        for _ in range(random.randint(5, 10)):
            post = _create_post(user)
            posts.append(post)
            db.session.add(post)
    db.session.commit()


def create_stories(users):
    i = 0
    for user in users:
        if i % 3:  # every third user has a story
            story = _create_story(user)
            db.session.add(story)
        i += 1
    db.session.commit()


def _get_people_who_the_user_follows_including_oneself(user_id):
    # query the "following" table to get the list of authorized users:
    user_ids_tuples = (
        db.session.query(Following.following_id)
        .filter(Following.user_id == user_id)
        .order_by(Following.following_id)
        .all()
    )
    # convert to a list of ints:
    user_ids = [id for (id,) in user_ids_tuples]

    # don't forget to add the current user:
    user_ids.append(user_id)
    return user_ids


def create_likes(users, posts):
    for current_user in users:
        # get all users that the current user follows:
        auth_user_ids = _get_people_who_the_user_follows_including_oneself(
            current_user.id
        )
        # for each user, create between 5 and 20 likes
        limit = random.randint(5, 20)
        counter = 0
        random.shuffle(posts)

        for post in posts:
            # if the post was created by someone in the user's feed,
            # like it:
            # print(
            #     f"current_user_id={current_user.id}",
            #     f"post_id={post.id}",
            #     f"post_user_id={post.user_id}",
            #     auth_user_ids,
            #     post.user_id in auth_user_ids,
            # )
            if post.user_id in auth_user_ids:
                like = LikePost(user_id=current_user.id, post_id=post.id)
                db.session.add(like)
                counter += 1
            if counter > limit:
                break
    db.session.commit()


def create_bookmarks(users, posts):
    for current_user in users:
        # get all users that the current user follows:
        auth_user_ids = _get_people_who_the_user_follows_including_oneself(
            current_user.id
        )

        # for each user, create between 5 and 20 bookmarks
        limit = random.randint(5, 20)
        counter = 0
        random.shuffle(posts)

        for post in posts:
            # if the post was created by someone in the user's feed,
            # bookmark it:
            if post.user_id in auth_user_ids:
                bookmark = Bookmark(current_user.id, post.id)
                db.session.add(bookmark)
                counter += 1
            if counter > limit:
                break

    db.session.commit()


def create_comments(users, posts):
    for current_user in users:
        # get all users that the current user follows:
        auth_user_ids = _get_people_who_the_user_follows_including_oneself(
            current_user.id
        )

        # for each user, create between 5 and 20 comments
        limit = random.randint(5, 20)
        counter = 0
        random.shuffle(posts)
        for post in posts:
            if post.user_id in auth_user_ids:
                comment = Comment(
                    fake.sentence(nb_words=random.randint(15, 50)),
                    current_user.id,
                    post.id,
                )
                db.session.add(comment)
                comments.append(comment)
                counter += 1
            if counter > limit:
                break

        db.session.commit()


def create_comment_likes(comments):
    for comment in comments:
        auth_user_ids = _get_people_who_the_user_follows_including_oneself(
            comment.user_id
        )
        for _ in range(random.randint(0, 3)):
            i = random.randint(0, len(auth_user_ids) - 1)
            user_id = auth_user_ids.pop(i)
            like = LikeComment(user_id, comment.id)
            db.session.add(like)
            if len(auth_user_ids) == 0:
                break
    db.session.commit()


# creates all of the tables if they don't exist:
with app.app_context():
    step = 1
    # uncomment if you want to drop all tables
    print("{0}. Dropping all tables...".format(step))
    db.drop_all()
    step += 1

    print(
        "{0}. creating DB tables (if they don't already exist)...".format(step)
    )
    db.create_all()
    step += 1

    print(
        "{0}. creating 30 accounts (slow b/c of password hashing)...".format(
            step
        )
    )
    create_webdev_user()
    try:
        create_users_from_csv()
    except:
        print("No user list found. Making random users...")
        create_users(n=29)
    step += 1

    print("{0}. assigning users some accounts to follow...".format(step))
    create_accounts_that_you_follow(users)
    step += 1

    print("{0}. creating fake posts...".format(step))
    create_posts(users)
    step += 1

    print("{0}. creating fake stories...".format(step))
    create_stories(users)
    step += 1

    print("{0}. creating fake post likes...".format(step))
    create_likes(users, posts)
    step += 1

    print("{0}. creating fake bookmarks...".format(step))
    create_bookmarks(users, posts)
    step += 1

    print("{0}. creating fake comments...".format(step))
    create_comments(users, posts)
    step += 1

    print("{0}. creating fake comment likes...".format(step))
    create_comment_likes(comments)
    step += 1

    print("DONE!")
