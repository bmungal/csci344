import utils

root_url = utils.root_url
import unittest


class TestPostListEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()
        pass

    def test_posts_get_defaults_to_20(self):
        response = utils.issue_get_request(
            root_url + "/api/posts", self.current_user.get("id")
        )
        data = response.json()
        self.assertLessEqual(len(data), 20)
        self.assertEqual(response.status_code, 200)

    def test_posts_get_has_required_data(self):
        response = utils.issue_get_request(
            root_url + "/api/posts", self.current_user.get("id")
        )
        data = response.json()
        post = data[0]

        # check that all of the keys are in there and values are of the correct type:
        self.assertTrue("id" in post and type(post["id"]) == int)
        self.assertTrue("image_url" in post and type(post["image_url"]) == str)
        self.assertTrue("user" in post and type(post["user"]) == dict)
        self.assertTrue(
            "caption" in post and type(post["caption"]) in [str, type(None)]
        )
        self.assertTrue(
            "alt_text" in post and type(post["alt_text"]) in [str, type(None)]
        )
        self.assertTrue("comments" in post and type(post["comments"]) == list)
        self.assertEqual(response.status_code, 200)

    def test_posts_get_limit_argument(self):
        response = utils.issue_get_request(
            root_url + "/api/posts?limit=3", self.current_user.get("id")
        )
        data = response.json()
        self.assertEqual(len(data), 3)
        self.assertEqual(response.status_code, 200)

    def test_posts_get_bad_limit_argument_handled(self):
        response = utils.issue_get_request(
            root_url + "/api/posts?limit=80", self.current_user.get("id")
        )
        self.assertEqual(response.status_code, 400)

        response = utils.issue_get_request(
            root_url + "/api/posts?limit=abc", self.current_user.get("id")
        )
        self.assertEqual(response.status_code, 400)

    def test_posts_get_is_authorized(self):
        authorized_user_ids = utils.get_authorized_user_ids(self.current_user.get("id"))
        response = utils.issue_get_request(
            root_url + "/api/posts?limit=50", self.current_user.get("id")
        )
        self.assertEqual(response.status_code, 200)
        posts = response.json()
        for post in posts:
            # check that user has access to every post:
            # print(self.current_user.get('id'), '-', post.get('user').get('id'), authorized_user_ids)
            self.assertTrue(post.get("user").get("id") in authorized_user_ids)

    def test_post_post(self):
        body = {
            "image_url": "https://picsum.photos/600/430?id=668",
            "caption": "Some caption",
            "alt_text": "some alt text",
        }
        response = utils.issue_post_request(
            root_url + "/api/posts",
            json=body,
            user_id=self.current_user.get("id"),
        )
        new_post = response.json()
        self.assertEqual(response.status_code, 201)

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

        # now delete post from DB:
        utils.delete_post_by_id(new_post.get("id"))

        # and check that it's gone:
        self.assertEqual(utils.get_post_by_id(new_post.get("id")), [])

    def test_post_post_image_only(self):
        body = {
            "image_url": "https://picsum.photos/600/430?id=668",
        }
        response = utils.issue_post_request(
            root_url + "/api/posts",
            json=body,
            user_id=self.current_user.get("id"),
        )
        new_post = response.json()
        self.assertEqual(response.status_code, 201)

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

        # now delete post from DB:
        utils.delete_post_by_id(new_post.get("id"))

        # and check that it's gone:
        self.assertEqual(utils.get_post_by_id(new_post.get("id")), [])

    def test_post_post_bad_data_400_error(self):
        url = "{0}/api/posts".format(root_url)

        response = utils.issue_post_request(
            url, json={}, user_id=self.current_user.get("id")
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
