import utils

root_url = utils.root_url
import unittest


class TestPostDetailEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()

    def test_post_patch(self):
        post_to_update = utils.get_post_by_user(self.current_user.get("id"))
        body = {
            "image_url": "https://picsum.photos/600/430?id=33",
            "caption": "Another caption 222",
            "alt_text": "Another alt text 222",
        }
        url = "{0}/api/posts/{1}".format(root_url, post_to_update.get("id"))

        response = utils.issue_patch_request(
            url, json=body, user_id=self.current_user.get("id")
        )
        new_post = response.json()
        # print(new_post)
        self.assertEqual(response.status_code, 200)

        # check that the values are in the returned json:
        self.assertEqual(new_post.get("image_url"), body.get("image_url"))
        self.assertEqual(new_post.get("caption"), body.get("caption"))
        self.assertEqual(new_post.get("alt_text"), body.get("alt_text"))

        # verify that data was committed to the database:
        new_post_db = utils.get_post_by_id(new_post.get("id"))
        self.assertEqual(new_post_db.get("id"), new_post.get("id"))
        self.assertEqual(new_post_db.get("image_url"), new_post.get("image_url"))
        self.assertEqual(new_post_db.get("caption"), new_post.get("caption"))
        self.assertEqual(new_post_db.get("alt_text"), new_post.get("alt_text"))

        utils.restore_post(post_to_update)

    def test_post_patch_blanks_not_overwritten(self):
        post_to_update = utils.get_post_by_user(self.current_user.get("id"))
        body = {}
        url = "{0}/api/posts/{1}".format(root_url, post_to_update.get("id"))

        response = utils.issue_patch_request(
            url, json=body, user_id=self.current_user.get("id")
        )
        new_post = response.json()
        self.assertEqual(response.status_code, 200)

        # check that the values are in the returned json:
        self.assertEqual(new_post.get("image_url"), post_to_update.get("image_url"))
        self.assertEqual(new_post.get("caption"), post_to_update.get("caption"))
        self.assertEqual(new_post.get("alt_text"), post_to_update.get("alt_text"))

        # verify that data was committed to the database:
        new_post_db = utils.get_post_by_id(new_post.get("id"))
        self.assertEqual(new_post_db.get("image_url"), new_post.get("image_url"))

        utils.restore_post(post_to_update)

    def test_post_patch_invalid_id_404(self):
        url = "{0}/api/posts/fdsfsdfsdfsdfs".format(root_url)
        response = utils.issue_patch_request(
            url, json={}, user_id=self.current_user.get("id")
        )
        # print(response.text)
        self.assertEqual(response.status_code, 404)

    def test_post_patch_id_does_not_exist_404(self):
        url = "{0}/api/posts/99999".format(root_url)
        response = utils.issue_patch_request(
            url, json={}, user_id=self.current_user.get("id")
        )
        # print(response.json())
        self.assertEqual(response.status_code, 404)

    def test_post_patch_unauthorized_id_404(self):
        post_no_access = utils.get_post_that_user_cannot_access(
            self.current_user.get("id")
        )
        url = "{0}/api/posts/{1}".format(root_url, post_no_access.get("id"))

        response = utils.issue_patch_request(
            url, json={}, user_id=self.current_user.get("id")
        )
        # print(response.json())
        self.assertEqual(response.status_code, 404)

    def test_post_delete(self):
        post_to_delete = utils.get_post_by_user(self.current_user.get("id"))
        url = "{0}/api/posts/{1}".format(root_url, post_to_delete.get("id"))

        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 200)

        # restore the post in the database:
        utils.restore_post_by_id(post_to_delete)

    def test_post_delete_invalid_id_404(self):
        url = "{0}/api/posts/sdfsdfdsf".format(root_url)

        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_post_delete_id_does_not_exist_404(self):
        post_with_access = utils.get_post_by_user(self.current_user.get("id"))
        url = "{0}/api/posts/99999".format(root_url, post_with_access.get("id"))

        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_post_delete_unauthorized_id_404(self):
        post_no_access = utils.get_post_that_user_cannot_access(
            self.current_user.get("id")
        )
        url = "{0}/api/posts/{1}".format(root_url, post_no_access.get("id"))

        response = utils.issue_delete_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_post_get(self):
        post_with_access = utils.get_post_by_user(self.current_user.get("id"))
        url = "{0}/api/posts/{1}".format(root_url, post_with_access.get("id"))

        response = utils.issue_get_request(url, user_id=self.current_user.get("id"))
        post = response.json()
        self.assertEqual(post_with_access.get("id"), post.get("id"))
        self.assertEqual(post_with_access.get("image_url"), post.get("image_url"))
        self.assertEqual(post_with_access.get("caption"), post.get("caption"))
        self.assertEqual(post_with_access.get("alt_text"), post.get("alt_text"))
        self.assertTrue("comments" in post and type(post["comments"]) == list)
        self.assertEqual(response.status_code, 200)

    def test_post_get_invalid_id_404(self):
        post_with_access = utils.get_post_by_user(self.current_user.get("id"))
        url = "{0}/api/posts/sdfsdfdsf".format(root_url, post_with_access.get("id"))

        response = utils.issue_get_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_post_get_id_does_not_exist_404(self):
        post_with_access = utils.get_post_by_user(self.current_user.get("id"))
        url = "{0}/api/posts/99999".format(root_url, post_with_access.get("id"))

        response = utils.issue_get_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)

    def test_post_get_unauthorized_id_404(self):
        post_no_access = utils.get_post_that_user_cannot_access(
            self.current_user.get("id")
        )
        # print(post_no_access.get('id'), '-', self.current_user.get('id'))
        url = "{0}/api/posts/{1}".format(root_url, post_no_access.get("id"))

        response = utils.issue_get_request(url, user_id=self.current_user.get("id"))
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
