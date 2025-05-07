import json

from flask import Response
from flask_restful import Resource

from models.story import Story
from views import get_authorized_user_ids


class StoriesListEndpoint(Resource):

    def __init__(self, current_user):
        self.current_user = current_user

    def get(self):
        # TODO: Add GET Logic...
        #authorize user
        ids_for_me_and_my_friends = get_authorized_user_ids(self.current_user)

        stories = Story.query.filter(Story.user_id.in_(ids_for_me_and_my_friends))

        stories_list = []
        for item in stories.all():
            item_dict = item.to_dict()
            stories_list.append(item_dict)

        
        return Response(
            json.dumps(stories_list), 
            mimetype="application/json", 
            status=200)


def initialize_routes(api, current_user):
    api.add_resource(
        StoriesListEndpoint,
        "/api/stories",
        "/api/stories/",
        resource_class_kwargs={"current_user": current_user},
    )
