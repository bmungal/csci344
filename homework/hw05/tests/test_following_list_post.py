import requests
import utils

root_url = utils.root_url
import unittest


class TestFollowingListEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()

    def test_following_get_check_data_structure(self):
        response = utils.issue_get_request(
            "{0}/api/following".format(root_url),
            user_id=self.current_user.get("id"),
        )
        self.assertEqual(response.status_code, 200)
        following_list = response.json()

        entry = following_list[0]
        self.assertTrue("id" in entry and type(entry["id"]) == int)
        self.assertTrue("following" in entry and type(entry["following"]) == dict)
        following = entry.get("following")
        self.assertTrue("id" in following and type(following["id"]) == int)
        self.assertTrue(
            "first_name" in following
            and type(following["first_name"]) in [str, type(None)]
        )
        self.assertTrue(
            "last_name" in following
            and type(following["last_name"]) in [str, type(None)]
        )
        self.assertTrue(
            "image_url" in following
            and type(following["image_url"]) in [str, type(None)]
        )
        self.assertTrue(
            "thumb_url" in following
            and type(following["thumb_url"]) in [str, type(None)]
        )

    def test_following_get_check_if_query_correct(self):
        response = utils.issue_get_request(
            "{0}/api/following".format(root_url),
            user_id=self.current_user.get("id"),
        )
        following_list = response.json()
        self.assertEqual(response.status_code, 200)

        # check that these are actually the people you're following:
        authorized_user_ids = utils.get_following_ids(self.current_user.get("id"))
        self.assertTrue(len(authorized_user_ids) > 1)
        self.assertEqual(len(authorized_user_ids), len(following_list))
        for entry in following_list:
            # print(entry, authorized_user_ids)
            self.assertTrue(entry.get("following").get("id") in authorized_user_ids)

    def test_following_post_valid_request_201(self):
        user = utils.get_unfollowed_user(self.current_user.get("id"))
        body = {"user_id": user.get("id")}
        response = utils.issue_post_request(
            root_url + "/api/following",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 201)
        new_person_to_follow = response.json()
        following = new_person_to_follow.get("following")

        self.assertEqual(user.get("id"), following.get("id"))
        self.assertEqual(user.get("first_name"), following.get("first_name"))
        self.assertEqual(user.get("last_name"), following.get("last_name"))
        self.assertEqual(user.get("username"), following.get("username"))
        self.assertEqual(user.get("email"), following.get("email"))
        self.assertEqual(user.get("image_url"), following.get("image_url"))
        self.assertEqual(user.get("thumb_url"), following.get("thumb_url"))

        # check that the record is in the database:get_following_record_by_id
        db_rec = utils.get_following_by_id(new_person_to_follow.get("id"))
        self.assertEqual(db_rec.get("id"), new_person_to_follow.get("id"))

        # now delete following record from DB:
        utils.delete_following_by_id(new_person_to_follow.get("id"))

        # and check that it's gone:
        db_rec = utils.get_following_by_id(new_person_to_follow.get("id"))
        self.assertEqual(db_rec, [])

    def test_following_post_no_duplicates_400(self):
        already_following = utils.get_following_by_user(self.current_user.get("id"))
        body = {"user_id": already_following.get("following_id")}
        response = utils.issue_post_request(
            root_url + "/api/following",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 400)

    def test_following_post_invalid_user_id_format_400(self):
        body = {"user_id": "dasdasdasd"}
        response = utils.issue_post_request(
            root_url + "/api/following",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 400)

    def test_following_post_invalid_user_id_404(self):
        body = {
            "user_id": 999999,
        }
        response = utils.issue_post_request(
            root_url + "/api/following",
            json=body,
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 404)

    def test_following_post_missing_user_id_400(self):
        response = utils.issue_post_request(
            root_url + "/api/following",
            json={},
            user_id=self.current_user.get("id"),
        )
        # print(response.text)
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
