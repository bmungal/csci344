import utils
import requests
import unittest

class TestLikePostDetailEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/likes"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_successful_like_deletion(self):
        """Test deleting an existing like returns 200."""
        # Arrange
        liked_post = utils.get_liked_post_by_user(self.user_id)
        url = f"{self.base_url}/{liked_post['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 200)

        # Cleanup
        utils.restore_liked_post(liked_post)

    def test_authentication_required(self):
        """Test that unauthenticated unlike requests return 401."""
        # Arrange
        liked_post = utils.get_liked_post_by_user(self.user_id)
        url = f"{self.base_url}/{liked_post['id']}"

        # Act
        response = requests.delete(url)

        # Assert
        self.assertEqual(response.status_code, 401)

        # Verify like still exists (wasn't deleted)
        like_db = utils.get_liked_post_by_id(liked_post['id'])
        self.assertNotEqual(like_db, [])
        self.assertEqual(like_db['id'], liked_post['id'])

    def test_invalid_format_id_handled(self):
        """Test that non-numeric like IDs return 404."""
        # Arrange
        url = f"{self.base_url}/invalid_id"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_id_handled(self):
        """Test that non-existent like IDs return 404."""
        # Arrange
        url = f"{self.base_url}/99999"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_unauthorized_unlike_prevented(self):
        """Test that unliking another user's like returns 404."""
        # Arrange
        unauthorized_like = utils.get_liked_post_that_user_cannot_delete(self.user_id)
        url = f"{self.base_url}/{unauthorized_like['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 404)

        # Verify like still exists
        like_db = utils.get_liked_post_by_id(unauthorized_like['id'])
        self.assertNotEqual(like_db, [])
        self.assertEqual(like_db['id'], unauthorized_like['id'])

if __name__ == "__main__":
    unittest.main()
