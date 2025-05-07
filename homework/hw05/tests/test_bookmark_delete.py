import utils

root_url = utils.root_url
import unittest


class TestBookmarkDetailEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()

    def test_bookmark_delete_valid_200(self):
        bookmark_to_delete = utils.get_bookmark_by_user(self.current_user.get("id"))
        bookmark_id = bookmark_to_delete.get("id")
        url = "{0}/api/bookmarks/{1}".format(root_url, bookmark_id)

        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        # print(response.text)
        self.assertEqual(response.status_code, 200)

        # restore the post in the database:
        utils.restore_bookmark(bookmark_to_delete)

    def test_bookmark_delete_invalid_id_format_404(self):
        url = "{0}/api/bookmarks/sdfsdfdsf".format(root_url)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_bookmark_delete_invalid_id_404(self):
        url = "{0}/api/bookmarks/99999".format(root_url)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_bookmark_delete_unauthorized_id_404(self):
        unauthorized_bookmark = utils.get_bookmark_that_user_cannot_delete(
            self.current_user.get("id")
        )
        url = "{0}/api/bookmarks/{1}".format(root_url, unauthorized_bookmark.get("id"))
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
