import utils
import requests
import unittest

class TestCommentListEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/comments"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_successful_comment_creation(self):
        """Test creating a new comment returns 201 and correct data."""
        # Arrange
        post = utils.get_post_by_user(self.user_id)
        body = {
            "post_id": post["id"],
            "text": "Some comment text"
        }

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 201)
        new_comment = response.json()

        # Verify response data
        self.assertEqual(new_comment["post_id"], body["post_id"])
        self.assertEqual(new_comment["text"], body["text"])
        self.assertEqual(new_comment["user"]["id"], self.user_id)

        # Cleanup
        utils.delete_comment_by_id(new_comment["id"])
        self.assertEqual(utils.get_comment_by_id(new_comment["id"]), [])

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Arrange
        post = utils.get_post_by_user(self.user_id)
        body = {
            "post_id": post["id"],
            "text": "Some comment text"
        }

        # Act
        response = requests.post(self.base_url, json=body)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_invalid_post_id_format_handled(self):
        """Test that non-numeric post IDs return 400."""
        # Arrange
        body = {
            "post_id": "invalid_id",
            "text": "Some comment text"
        }

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 400)

    def test_nonexistent_post_id_handled(self):
        """Test that non-existent post IDs return 404."""
        # Arrange
        body = {
            "post_id": 999999,
            "text": "Some comment text"
        }

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_unauthorized_post_comment_prevented(self):
        """Test commenting on an inaccessible post returns 404."""
        # Arrange
        post = utils.get_post_that_user_cannot_access(self.user_id)
        body = {
            "post_id": post["id"],
            "text": "Some comment text"
        }

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_missing_text_handled(self):
        """Test that request without text returns 400."""
        # Arrange
        post = utils.get_post_by_user(self.user_id)
        body = {
            "post_id": post["id"]
        }

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()
