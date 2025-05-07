import utils
import requests
import unittest

class TestProfileEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/profile"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_successful_profile_retrieval(self):
        """Test that profile endpoint returns correct user data."""
        # Act
        response = utils.issue_get_request(self.base_url, self.user_id)
        profile = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)

        # Verify all profile fields match the current user
        expected_fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "image_url",
            "thumb_url"
        ]
        for field in expected_fields:
            self.assertEqual(
                profile.get(field),
                self.current_user.get(field),
                f"Profile {field} does not match current user"
            )

    def test_profile_data_structure(self):
        """Test that profile data contains all required fields with correct types."""
        # Act
        response = utils.issue_get_request(self.base_url, self.user_id)
        profile = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)

        # Verify data types of all fields
        self.assertTrue(isinstance(profile["id"], int))
        self.assertTrue(isinstance(profile["username"], str))
        self.assertTrue(isinstance(profile["email"], str))
        self.assertTrue(isinstance(profile["first_name"], (str, type(None))))
        self.assertTrue(isinstance(profile["last_name"], (str, type(None))))
        self.assertTrue(isinstance(profile["image_url"], (str, type(None))))
        self.assertTrue(isinstance(profile["thumb_url"], (str, type(None))))

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Act
        response = requests.get(self.base_url)

        # Assert
        self.assertEqual(response.status_code, 401)

if __name__ == "__main__":
    unittest.main()
