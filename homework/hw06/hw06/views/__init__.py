from models import db, Following, Post
from sqlalchemy import and_

"""
Below are some helper functions to help you with security:
"""


def get_authorized_user_ids(current_user):
    # query the "following" table to get the list of authorized users:
    user_ids_tuples = (
        db.session.query(Following.following_id)
        .filter(Following.user_id == current_user.id)
        .order_by(Following.following_id)
        .all()
    )
    # convert to a list of ints:
    user_ids = [id for (id,) in user_ids_tuples]

    # don't forget to add the current user:
    user_ids.append(current_user.id)
    return user_ids


def can_view_post(post_id, user):
    # find user_ids that the user can follow (including the user themselves)
    auth_users_ids = get_authorized_user_ids(user)
    print(auth_users_ids)

    # query for all the posts that are owned by the user:
    post = Post.query.filter(
        and_(Post.id == post_id, Post.user_id.in_(auth_users_ids))
    ).first()
    print(Post.query.filter(
        and_(Post.id == post_id, Post.user_id.in_(auth_users_ids))
    ))
    if post:
        print(post_id, "post=", post.id, "user=", user.id, "posts_user_id=", post.user_id)
    if not post:
        print("CANNOT VIEW!!!")
        return False
    return True


def initialize_routes(api, current_user):
    from .bookmarks import initialize_routes as init_bookmark_routes
    from .comments import initialize_routes as init_comment_routes
    from .followers import initialize_routes as init_follower_routes
    from .following import initialize_routes as init_following_routes
    from .posts import initialize_routes as init_post_routes
    from .post_likes import initialize_routes as init_post_like_routes
    from .profile import initialize_routes as init_profile_routes
    from .stories import initialize_routes as init_story_routes
    from .suggestions import initialize_routes as init_suggestion_routes
    from .authentication import initialize_routes as init_authentication_routes
    from .token import initialize_routes as init_token_routes

    init_bookmark_routes(api, current_user)
    init_comment_routes(api, current_user)
    init_follower_routes(api, current_user)
    init_following_routes(api, current_user)
    init_post_routes(api, current_user)
    init_post_like_routes(api, current_user)
    init_profile_routes(api, current_user)
    init_story_routes(api, current_user)
    init_suggestion_routes(api, current_user)
    init_authentication_routes(api.app)
    init_token_routes(api)
