import utils
import requests
import unittest

class TestCommentDetailEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/comments"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_successful_comment_deletion(self):
        """Test deleting an existing comment returns 200."""
        # Arrange
        comment = utils.get_comment_by_user(self.user_id)
        url = f"{self.base_url}/{comment['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 200)

        # Cleanup
        utils.restore_comment_by_id(comment)

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Arrange
        comment = utils.get_comment_by_user(self.user_id)
        url = f"{self.base_url}/{comment['id']}"

        # Act
        response = requests.delete(url)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_invalid_format_id_handled(self):
        """Test that non-numeric comment IDs return 404."""
        response = utils.issue_delete_request(
            f"{self.base_url}/invalid_id", 
            user_id=self.user_id
        )
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_id_handled(self):
        """Test that non-existent comment IDs return 404."""
        response = utils.issue_delete_request(
            f"{self.base_url}/99999", 
            user_id=self.user_id
        )
        self.assertEqual(response.status_code, 404)

    def test_unauthorized_deletion_prevented(self):
        """Test that deleting another user's comment returns 404."""
        # Arrange
        unauthorized_comment = utils.get_comment_that_user_cannot_delete(self.user_id)
        url = f"{self.base_url}/{unauthorized_comment['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
