import utils
import requests
import unittest

class TestBookmarkDetailEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/bookmarks"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_successful_bookmark_deletion(self):
        """Test deleting an existing bookmark returns 200."""
        # Arrange
        bookmark = utils.get_bookmark_by_user(self.user_id)
        url = f"{self.base_url}/{bookmark['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 200)

        # Cleanup
        utils.restore_bookmark(bookmark)

    def test_invalid_format_id_handled(self):
        """Test that non-numeric bookmark IDs return 404."""
        response = utils.issue_delete_request(
            f"{self.base_url}/invalid_id", 
            user_id=self.user_id
        )
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_id_handled(self):
        """Test that non-existent bookmark IDs return 404."""
        response = utils.issue_delete_request(
            f"{self.base_url}/99999", 
            user_id=self.user_id
        )
        self.assertEqual(response.status_code, 404)

    def test_unauthorized_deletion_prevented(self):
        """Test that deleting another user's bookmark returns 404."""
        # Arrange
        unauthorized_bookmark = utils.get_bookmark_that_user_cannot_delete(self.user_id)
        url = f"{self.base_url}/{unauthorized_bookmark['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Arrange
        bookmark = utils.get_bookmark_by_user(self.user_id)
        url = f"{self.base_url}/{bookmark['id']}"

        # Act
        response = requests.delete(url)

        # Assert
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
