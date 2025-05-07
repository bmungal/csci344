import json

from flask import Response, request
from flask_restful import Resource
import flask_jwt_extended

from models import db
from models.bookmark import Bookmark
from models.post import Post
from views import get_authorized_user_ids


class BookmarksListEndpoint(Resource):

    def __init__(self, current_user):
        self.current_user = current_user

    @flask_jwt_extended.jwt_required()
    def get(self):
        # Get all current_user bookmarks
        bookmarks = Bookmark.query.filter_by(user_id=self.current_user.id)

        bookmarks_list = []
        for item in bookmarks.all():
            item_dict = item.to_dict()
            bookmarks_list.append(item_dict)

        return Response(
            json.dumps(bookmarks_list),
            mimetype="application/json",
            status=200,
        )

    @flask_jwt_extended.jwt_required()
    def post(self):
        data = request.get_json()
        post_id = data.get("post_id")

        #error checking
        if post_id is None:
            return Response(
                json.dumps({"message": "must specify post_id"}),
                mimetype="application/json",
                status=400,
            )
        
        #Check if integer
        try:
            post_id = int(post_id)
        except:
            return Response(
                json.dumps({"message": "post_id must be an integer"}),
                mimetype="application/json",
                status=400,
            )

        post = Post.query.get(post_id)
        if post is None:
            return Response(
                json.dumps({"message": "post id not found"}),
                mimetype="application/json",
                status=404,
            )
        #validate user
        ids_for_me_and_my_friends = get_authorized_user_ids(self.current_user)

        if post.user_id not in ids_for_me_and_my_friends:
            return Response(
                json.dumps({"message": "you are not authorized to bookmark this post"}),
                mimetype="application/json",
                status=404,
            )
        
        bookmark = Bookmark.query.filter(Bookmark.post_id == post_id, Bookmark.user_id == self.current_user.id).first()
        
        if bookmark is not None:
            return Response(
                json.dumps({"message": "This post has been previously bookmarked"}),
                mimetype="application/json",
                status=400,
            )
        
        #Finally, add a new bookmark if not added before, valid post id and user id, and authorized user
        post_bookmark = Bookmark(
            post_id=post_id,
            user_id=self.current_user.id,
        )

        db.session.add(post_bookmark)
        db.session.commit()

        return Response(
            json.dumps(post_bookmark.to_dict()),
            mimetype="application/json",
            status=201,
        )



class BookmarkDetailEndpoint(Resource):

    def __init__(self, current_user):
        self.current_user = current_user

    @flask_jwt_extended.jwt_required()
    def delete(self, id):

        #Check if boomark exists
        bookmark = Bookmark.query.get(id)
        if bookmark is None:
            return Response(
                json.dumps({"message": "bookmark id not found"}),
                mimetype="application/json",
                status=404,
            )
        
        #Authorize user
        if bookmark.user_id != self.current_user.id:
            return Response(
                json.dumps(
                    {"message": "you are not authorized to delete this bookmark"}
                ),
                mimetype="application/json",
                status=404,
            )
    
        Bookmark.query.filter_by(id=id).delete()
        db.session.commit()

        return Response(
            json.dumps({"message": f"bookmark id={id} has been deleted"}),
            mimetype="application/json",
            status=200,
        )


def initialize_routes(api, current_user):
    api.add_resource(
        BookmarksListEndpoint,
        "/api/bookmarks",
        "/api/bookmarks/",
        resource_class_kwargs={"current_user": current_user},
    )

    api.add_resource(
        BookmarkDetailEndpoint,
        "/api/bookmarks/<int:id>",
        "/api/bookmarks/<int:id>",
        resource_class_kwargs={"current_user": current_user},
    )
