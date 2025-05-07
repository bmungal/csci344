import utils
import requests
import unittest

class TestFollowingDetailEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/following"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_successful_unfollow(self):
        """Test unfollowing a user returns 200 and removes the relationship."""
        # Arrange
        following = utils.get_following_by_user(self.user_id)
        url = f"{self.base_url}/{following['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 200)
        
        # Verify relationship is removed
        following_db = utils.get_following_by_id(following['id'])
        self.assertEqual(following_db, [])

        # Cleanup
        utils.restore_following(following)

    def test_authentication_required(self):
        """Test that unauthenticated unfollow requests return 401."""
        # Arrange
        following = utils.get_following_by_user(self.user_id)
        url = f"{self.base_url}/{following['id']}"

        # Act
        response = requests.delete(url)

        # Assert
        self.assertEqual(response.status_code, 401)

        # Verify relationship still exists (wasn't deleted)
        following_db = utils.get_following_by_id(following['id'])
        self.assertNotEqual(following_db, [])
        self.assertEqual(following_db['id'], following['id'])

    def test_invalid_format_id_handled(self):
        """Test that non-numeric following IDs return 404."""
        # Arrange
        url = f"{self.base_url}/invalid_id"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_id_handled(self):
        """Test that non-existent following IDs return 404."""
        # Arrange
        url = f"{self.base_url}/99999"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_unauthorized_unfollow_prevented(self):
        """Test that unfollowing another user's relationship returns 404."""
        # Arrange
        unauthorized_following = utils.get_following_that_user_cannot_delete(self.user_id)
        url = f"{self.base_url}/{unauthorized_following['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 404)
        
        # Verify relationship still exists
        still_there = utils.get_following_by_id(unauthorized_following['id'])
        self.assertEqual(unauthorized_following['id'], still_there['id'])

if __name__ == "__main__":
    unittest.main()
