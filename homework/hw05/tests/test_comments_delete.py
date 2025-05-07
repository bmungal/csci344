import requests
import utils

root_url = utils.root_url
import unittest


class TestCommentDetailEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()

    def test_comment_delete_valid_200(self):
        comment_to_delete = utils.get_comment_by_user(self.current_user.get("id"))
        comment_id = comment_to_delete.get("id")
        url = "{0}/api/comments/{1}".format(root_url, comment_id)

        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        # print(response.text)
        self.assertEqual(response.status_code, 200)

        # restore the post in the database:
        utils.restore_comment_by_id(comment_to_delete)

    def test_comment_delete_invalid_id_format_404(self):
        url = "{0}/api/comments/sdfsdfdsf".format(root_url)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_comment_delete_invalid_id_404(self):
        url = "{0}/api/comments/99999".format(root_url)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_comment_delete_unauthorized_id_404(self):
        unauthorized_comment = utils.get_comment_that_user_cannot_delete(
            self.current_user.get("id")
        )
        url = "{0}/api/comments/{1}".format(root_url, unauthorized_comment.get("id"))
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
