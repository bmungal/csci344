import requests
import utils

root_url = utils.root_url
import unittest


class TestLikePostDetailEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()
        pass

    def test_like_post_delete_valid_200(self):
        liked_post = utils.get_liked_post_by_user(self.current_user.get("id"))
        url = "{0}/api/likes/{1}".format(root_url, liked_post.get("id"))
        # print(url)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        # print(response.text)
        self.assertEqual(response.status_code, 200)

        # restore the post in the database:
        utils.restore_liked_post(liked_post)

    def test_like_post_delete_invalid_id_format_404(self):
        url = "{0}/api/likes/{1}".format(root_url, "sdfsdfdsf")
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_like_post_delete_invalid_id_404(self):
        liked_post = utils.get_liked_post_by_user(self.current_user.get("id"))
        url = "{0}/api/likes/{1}".format(root_url, 99999)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_like_post_delete_unauthorized_id_404(self):
        unauthorized_liked_post = utils.get_liked_post_that_user_cannot_delete(
            self.current_user.get("id")
        )
        url = "{0}/api/posts/{1}/likes/{2}".format(
            root_url,
            unauthorized_liked_post.get("post_id"),
            unauthorized_liked_post.get("id"),
        )
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    # to run all of the tests:
    unittest.main()
