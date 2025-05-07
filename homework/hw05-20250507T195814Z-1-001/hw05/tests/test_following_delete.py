import requests
import utils

root_url = utils.root_url
import unittest


class TestFollowingDetailEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()

    def test_following_delete_valid_200(self):
        following_to_delete = utils.get_following_by_user(self.current_user.get("id"))
        following_id = following_to_delete.get("id")
        url = "{0}/api/following/{1}".format(root_url, following_id)

        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        # print(response.text)
        self.assertEqual(response.status_code, 200)

        # check that it's really deleted:
        following_db = utils.get_following_by_id(following_id)
        self.assertEqual(following_db, [])

        # restore the post in the database:
        utils.restore_following(following_to_delete)

    def test_following_delete_invalid_id_format_404(self):
        url = "{0}/api/following/sdfsdfdsf".format(root_url)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_following_delete_invalid_id_404(self):
        url = "{0}/api/following/99999".format(root_url)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_following_delete_unauthorized_id_404(self):
        unauthorized_following = utils.get_following_that_user_cannot_delete(
            self.current_user.get("id")
        )
        following_id = unauthorized_following.get("id")
        url = "{0}/api/following/{1}".format(root_url, following_id)
        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

        still_there = utils.get_following_by_id(following_id)
        self.assertEqual(following_id, still_there.get("id"))


if __name__ == "__main__":
    unittest.main()
