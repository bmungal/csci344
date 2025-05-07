import utils
import requests
import unittest


class TestFollowingListEndpoint(unittest.TestCase):

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/following"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_following_data_structure(self):
        """Test that following data contains all required fields."""
        # Act
        response = utils.issue_get_request(self.base_url, user_id=self.user_id)
        following_list = response.json()
        entry = following_list[0]

        # Assert
        self.assertEqual(response.status_code, 200)
        # Check entry structure
        self.assertTrue(isinstance(entry["id"], int))
        self.assertTrue(isinstance(entry["following"], dict))
        # Check following structure
        following = entry["following"]
        self.assertTrue(isinstance(following["id"], int))
        self.assertTrue(isinstance(following["first_name"], (str, type(None))))
        self.assertTrue(isinstance(following["last_name"], (str, type(None))))
        self.assertTrue(isinstance(following["image_url"], (str, type(None))))
        self.assertTrue(isinstance(following["thumb_url"], (str, type(None))))

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Act
        response = requests.get(self.base_url)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_following_list_retrieval(self):
        """Test getting list of following returns correct data."""
        # Act
        response = utils.issue_get_request(self.base_url, user_id=self.user_id)
        following_list = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        authorized_ids = utils.get_following_ids(self.user_id)
        self.assertTrue(len(authorized_ids) > 1)
        self.assertEqual(len(authorized_ids), len(following_list))
        for entry in following_list:
            self.assertTrue(entry["following"]["id"] in authorized_ids)

    def test_successful_follow_creation(self):
        """Test following a new user returns 201 and correct data."""
        # Arrange
        user_to_follow = utils.get_unfollowed_user(self.user_id)
        body = {"user_id": user_to_follow["id"]}

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 201)
        new_following = response.json()
        following = new_following["following"]
        
        # Verify response data
        self.assertEqual(user_to_follow["id"], following["id"])
        self.assertEqual(user_to_follow["first_name"], following["first_name"])
        self.assertEqual(user_to_follow["last_name"], following["last_name"])
        self.assertEqual(user_to_follow["username"], following["username"])
        self.assertEqual(user_to_follow["email"], following["email"])
        self.assertEqual(user_to_follow["image_url"], following["image_url"])
        self.assertEqual(user_to_follow["thumb_url"], following["thumb_url"])

        # Verify database state
        db_record = utils.get_following_by_id(new_following["id"])
        self.assertEqual(db_record["id"], new_following["id"])

        # Cleanup
        utils.delete_following_by_id(new_following["id"])
        self.assertEqual(utils.get_following_by_id(new_following["id"]), [])

    def test_duplicate_follow_prevented(self):
        """Test following an already-followed user returns 400."""
        # Arrange
        already_following = utils.get_following_by_user(self.user_id)
        body = {"user_id": already_following["following_id"]}

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 400)

    def test_invalid_user_id_format_handled(self):
        """Test following with non-numeric user ID returns 400."""
        # Arrange
        body = {"user_id": "invalid_id"}

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 400)

    def test_nonexistent_user_id_handled(self):
        """Test following non-existent user returns 404."""
        # Arrange
        body = {"user_id": 999999}

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_missing_user_id_handled(self):
        """Test following without user_id returns 400."""
        # Act
        response = utils.issue_post_request(
            self.base_url,
            json={},
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
