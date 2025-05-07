import utils
import requests
import unittest

class TestFollowerListEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/followers"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_followers_list_retrieval(self):
        """Test getting list of followers returns correct data."""
        # Act
        response = utils.issue_get_request(self.base_url, user_id=self.user_id)
        follower_list = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        
        # Verify followers are correct
        authorized_follower_ids = utils.get_follower_ids(self.user_id)
        self.assertTrue(len(authorized_follower_ids) > 1)
        self.assertEqual(len(authorized_follower_ids), len(follower_list))
        
        # Verify each follower is authorized
        for entry in follower_list:
            self.assertTrue(entry["follower"]["id"] in authorized_follower_ids)

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Act
        response = requests.get(self.base_url)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_follower_data_structure(self):
        """Test that follower data contains all required fields with correct types."""
        # Act
        response = utils.issue_get_request(self.base_url, user_id=self.user_id)
        following_list = response.json()
        entry = following_list[0]

        # Assert
        self.assertEqual(response.status_code, 200)

        # Check entry structure
        self.assertTrue(isinstance(entry["id"], int))
        self.assertTrue(isinstance(entry["follower"], dict))

        # Check follower structure
        follower = entry["follower"]
        self.assertTrue(isinstance(follower["id"], int))
        self.assertTrue(isinstance(follower["first_name"], (str, type(None))))
        self.assertTrue(isinstance(follower["last_name"], (str, type(None))))
        self.assertTrue(isinstance(follower["image_url"], (str, type(None))))
        self.assertTrue(isinstance(follower["thumb_url"], (str, type(None))))

if __name__ == "__main__":
    unittest.main()
