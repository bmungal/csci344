import utils

root_url = utils.root_url
import unittest


class TestCommentListEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()

    def test_comment_post_valid_request_201(self):
        post = utils.get_post_by_user(self.current_user.get("id"))
        body = {"post_id": post.get("id"), "text": "Some comment text"}
        response = utils.issue_post_request(
            root_url + "/api/comments",
            json=body,
            user_id=self.current_user.get("id"),
        )
        new_comment = response.json()
        self.assertEqual(response.status_code, 201)

        # check that the values are in the returned json:
        self.assertEqual(new_comment.get("post_id"), body.get("post_id"))
        self.assertEqual(new_comment.get("text"), body.get("text"))
        self.assertEqual(new_comment.get("user").get("id"), self.current_user.get("id"))

        # now delete comment from DB:
        utils.delete_comment_by_id(new_comment.get("id"))

        # and check that it's gone:
        self.assertEqual(utils.get_comment_by_id(new_comment.get("id")), [])

    def test_comment_post_invalid_post_id_format_400(self):
        body = {"post_id": "dasdasdasd", "text": "Some comment text"}
        response = utils.issue_post_request(
            root_url + "/api/comments",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 400)

    def test_comment_post_invalid_post_id_404(self):
        body = {"post_id": 999999, "text": "Some comment text"}
        response = utils.issue_post_request(
            root_url + "/api/comments",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 404)

    def test_comment_post_unauthorized_post_id_404(self):
        post = utils.get_post_that_user_cannot_access(self.current_user.get("id"))
        body = {"post_id": post.get("id"), "text": "Some comment text"}
        response = utils.issue_post_request(
            root_url + "/api/comments",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 404)

    def test_comment_post_missing_text_400(self):
        post = utils.get_post_by_user(self.current_user.get("id"))
        body = {
            "post_id": post.get("id"),
        }
        response = utils.issue_post_request(
            root_url + "/api/comments",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
