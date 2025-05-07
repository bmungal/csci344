import requests
import utils

root_url = utils.root_url
import unittest


class TestLikePostListEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()
        pass

    def test_like_post_valid_request_201(self):
        post_id = utils.get_unliked_post_id_by_user(self.current_user.get("id"))
        url = "{0}/api/likes".format(root_url)
        response = utils.issue_post_request(
            url, json={"post_id": post_id}, user_id=self.current_user.get("id")
        )
        # print(response.text)
        self.assertEqual(response.status_code, 201)
        new_like = response.json()

        # check that the values are in the returned json:
        self.assertEqual(new_like.get("post_id"), post_id)
        self.assertEqual(new_like.get("user_id"), self.current_user.get("id"))

        # check that it's really in the database:
        new_like_db = utils.get_liked_post_by_id(new_like.get("id"))
        self.assertEqual(new_like_db.get("id"), new_like.get("id"))

        # now delete like from DB:
        utils.delete_like_by_id(new_like.get("id"))

        # and check that it's gone:
        self.assertEqual(utils.get_liked_post_by_id(new_like.get("id")), [])

    def test_like_post_no_duplicates_400(self):
        liked_post = utils.get_liked_post_by_user(self.current_user.get("id"))
        # print(liked_post)
        url = "{0}/api/likes".format(root_url)
        post_id = liked_post.get("post_id")
        response = utils.issue_post_request(
            url,
            json={"post_id": post_id},
            user_id=self.current_user.get("id"),
        )
        # print("user_id", self.current_user.get("id"))
        # print("post_id", post_id)
        # print(url, response.text)
        self.assertEqual(response.status_code, 400)

    def test_like_post_invalid_post_id_404(self):
        response = utils.issue_post_request(
            root_url + "/api/likes",
            json={"post_id": 99999999},
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 404)

    def test_like_post_unauthorized_post_id_404(self):
        post = utils.get_post_that_user_cannot_access(self.current_user.get("id"))
        url = "{0}/api/likes".format(root_url)

        response = utils.issue_post_request(
            url,
            json={"post_id": post.get("id")},
            user_id=self.current_user.get("id"),
        )
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    # to run all of the tests:
    unittest.main()
