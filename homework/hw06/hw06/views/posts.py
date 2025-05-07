import json

from flask import Response, request
from flask_restful import Resource

from models import db
from models.post import Post
from views import get_authorized_user_ids, can_view_post
import flask_jwt_extended



def get_path():
    return request.host_url + "api/posts/"


class PostListEndpoint(Resource):

    def __init__(self, current_user):
        self.current_user = current_user

    @flask_jwt_extended.jwt_required()
    def get(self):

        # giving you the beginnings of this code (as this one is a little tricky for beginners):
        ids_for_me_and_my_friends = get_authorized_user_ids(self.current_user)

        try:
            limit = int(request.args.get("limit", 20))
            if limit > 50:
                return Response(json.dumps({"Message": "Cannot request more than 50 posts"}), mimetype="application/json", status=400)
        except:
            return Response(json.dumps({"Message": "Please use a valid integer between 1 - 50 for limit"}), mimetype="application/json", status=400)

        posts = Post.query.filter(Post.user_id.in_(ids_for_me_and_my_friends)).limit(limit)

        data = [item.to_dict(user=self.current_user) for item in posts.all()]
        return Response(json.dumps(data), mimetype="application/json", status=200)

    @flask_jwt_extended.jwt_required()
    def post(self):
        data = request.json
        print(data)
        image_url = data.get("image_url")
        caption = data.get("caption")
        alt_text = data.get("alt_text")

        #Validate
        if not image_url:
            return Response(json.dumps({"message": "image_url is a required parameter"}), mimetype="application/json", status=400)

        #1. Create
        new_post = Post(
            image_url=image_url,
            user_id=self.current_user.id,
            caption=caption,
            alt_text=alt_text,

        )

        db.session.add(new_post) #issues insert statement
        db.session.commit() #ommits the change to the database

        return Response(json.dumps(
            new_post.to_dict(user=self.current_user)
        ), mimetype="application/json", status=201)


class PostDetailEndpoint(Resource):

    def __init__(self, current_user):
        self.current_user = current_user

    @flask_jwt_extended.jwt_required()
    def patch(self, id):
        print("POST id=", id)
        # TODO: Add PATCH logic...
        data = request.json
        post = Post.query.get(id)

        #Invalid post
        if post is None:
            return Response(
                json.dumps({"message": "post not found"}),
                mimetype="application/json",
                status=404,
            )
        
        #Validate user
        if post.user_id != self.current_user.id:
            return Response(
                json.dumps({"message": "you are not authorized to edit this post"}),
                mimetype="application/json",
                status=404,
            )
        
        #Get params
        image_url = data.get("image_url")
        caption = data.get("caption")
        alt_text = data.get("alt_text")

        #Update (if the field exists)
        if image_url is not None:
            post.image_url = image_url
        if caption is not None:
            post.caption = caption
        if alt_text is not None:
            post.alt_text = alt_text

        db.session.commit()

        update = Post.query.get(id)

        return Response(
            json.dumps(update.to_dict()), 
            mimetype="application/json", 
            status=200
        )


    @flask_jwt_extended.jwt_required()
    def delete(self, id):
        print("POST id=", id)

        # TODO: Add DELETE logic...
        post = Post.query.get(id)

        #validate post exists
        if post is None:
            return Response(
                json.dumps({"message": "post id not found"}),
                mimetype="application/json",
                status=404,
            )
        
        if post.user_id != self.current_user.id:
            return Response(
                json.dumps({"message": "you are not authorized to get delete this post."}),
                mimetype="application/json",
                status=404,
            )
        
        #Delete
        Post.query.filter_by(id=id).delete()
        db.session.commit()

        return Response(
                json.dumps({"message": f"post id={id} successfully deleted"}),
            mimetype="application/json",
            status=200,
        )

    @flask_jwt_extended.jwt_required()
    def get(self, id):
        can_view = can_view_post(id, self.current_user)
        if can_view:
            post = Post.query.get(id)
            return Response(
            json.dumps(post.to_dict(user=self.current_user)),
            mimetype="application/json",
            status=200,
            )
        else:
            return Response(
            json.dumps({"Message":f"Post id ={id} not found"}),
            mimetype="application/json",
            status=404,
            )



def initialize_routes(api, current_user):
    api.add_resource(
        PostListEndpoint,
        "/api/posts",
        "/api/posts/",
        resource_class_kwargs={"current_user": current_user},
    )
    api.add_resource(
        PostDetailEndpoint,
        "/api/posts/<int:id>",
        "/api/posts/<int:id>/",
        resource_class_kwargs={"current_user": current_user},
    )
