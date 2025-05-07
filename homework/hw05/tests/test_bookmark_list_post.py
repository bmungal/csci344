import requests
import utils

root_url = utils.root_url
import unittest


class TestBookmarkListEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()

    def test_bookmarks_get_check_if_query_correct(self):
        # query for the bookmark:
        response = utils.issue_get_request(
            "{0}/api/bookmarks".format(root_url),
            user_id=self.current_user.get("id"),
        )

        self.assertEqual(response.status_code, 200)
        bookmarks = response.json()

        # ensure that all the bookmarks belonging to the user are in the list:
        bookmark_ids = utils.get_user_bookmark_ids(self.current_user.get("id"))
        for bookmark in bookmarks:
            self.assertTrue(bookmark.get("id") in bookmark_ids)

        # check that the list isn't empty
        self.assertTrue(len(bookmarks) > 1)

    def test_bookmarks_get_check_if_data_structure_correct(self):
        response = utils.issue_get_request(
            "{0}/api/bookmarks".format(root_url),
            user_id=self.current_user.get("id"),
        )
        self.assertEqual(response.status_code, 200)
        bookmarks = response.json()

        self.assertGreater(len(bookmarks), 0)
        bookmark = bookmarks[0]

        bookmark_db = utils.get_bookmark_by_id(bookmark.get("id"))
        post_db = utils.get_post_by_id(bookmark.get("post").get("id"))

        self.assertEqual(bookmark.get("id"), bookmark_db.get("id"))
        self.assertEqual(bookmark.get("post").get("id"), post_db.get("id"))
        self.assertEqual(
            bookmark.get("post").get("image_url"), post_db.get("image_url")
        )
        self.assertEqual(
            bookmark.get("post").get("caption"), post_db.get("caption")
        )
        self.assertEqual(
            bookmark.get("post").get("alt_text"), post_db.get("alt_text")
        )
        self.assertEqual(
            bookmark.get("post").get("user").get("id"), post_db.get("user_id")
        )

    def test_bookmark_post_valid_request_201(self):
        post_id = utils.get_unbookmarked_post_id_by_user(
            self.current_user.get("id")
        )
        body = {"post_id": post_id}
        response = utils.issue_post_request(
            root_url + "/api/bookmarks",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        new_bookmark = response.json()
        self.assertEqual(response.status_code, 201)

        # check that the values are in the returned json:
        post_dict = new_bookmark.get("post")

        # check that the bookmarked post exists in the response:
        self.assertNotEqual(post_dict, None)

        # check that the correct post was bookmarked:
        self.assertEqual(post_dict.get("id"), post_id)

        # check that the bookmark is actually in the database:
        bookmark_db = utils.get_bookmark_by_id(new_bookmark.get("id"))
        self.assertEqual(bookmark_db.get("id"), new_bookmark.get("id"))

        # now delete bookmark from DB:
        utils.delete_bookmark_by_id(new_bookmark.get("id"))

        # and check that it's gone:
        self.assertEqual(utils.get_bookmark_by_id(new_bookmark.get("id")), [])

    def test_bookmark_post_no_duplicates_400(self):
        bookmark = utils.get_bookmarked_post_by_user(
            self.current_user.get("id")
        )
        body = {"post_id": bookmark.get("post_id")}
        url = root_url + "/api/bookmarks"
        response = utils.issue_post_request(
            url,
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print("user_id", self.current_user.get("id"))
        # print("post_id", bookmark.get("post_id"))
        # print(url, response.text)
        self.assertEqual(response.status_code, 400)

    def test_bookmark_post_invalid_post_id_format_400(self):
        body = {"post_id": "dasdasdasd"}
        response = utils.issue_post_request(
            root_url + "/api/bookmarks",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 400)

    def test_bookmark_post_invalid_post_id_404(self):
        body = {"post_id": 999999}
        response = utils.issue_post_request(
            root_url + "/api/bookmarks",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 404)

    def test_bookmark_post_unauthorized_post_id_404(self):
        post = utils.get_post_that_user_cannot_access(
            self.current_user.get("id")
        )
        body = {
            "post_id": post.get("id"),
        }
        response = utils.issue_post_request(
            root_url + "/api/bookmarks",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 404)

    def test_bookmark_post_missing_post_id_400(self):
        response = utils.issue_post_request(
            root_url + "/api/bookmarks",
            json={},
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
