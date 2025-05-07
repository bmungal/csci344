import utils
import requests
import unittest

class TestPostDetailEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/posts"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")
        self.test_post = utils.get_post_by_user(self.user_id)

    def test_successful_post_update(self):
        """Test updating a post returns 200 and updates all fields."""
        # Arrange
        url = f"{self.base_url}/{self.test_post['id']}"
        update_data = {
            "image_url": "https://picsum.photos/600/430?id=33",
            "caption": "Updated test caption",
            "alt_text": "Updated test alt text"
        }

        # Act
        response = utils.issue_patch_request(
            url, 
            json=update_data,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 200)
        updated_post = response.json()

        # Verify response data
        self.assertEqual(updated_post["image_url"], update_data["image_url"])
        self.assertEqual(updated_post["caption"], update_data["caption"])
        self.assertEqual(updated_post["alt_text"], update_data["alt_text"])

        # Verify database state
        db_post = utils.get_post_by_id(updated_post["id"])
        self.assertEqual(db_post["image_url"], update_data["image_url"])
        self.assertEqual(db_post["caption"], update_data["caption"])
        self.assertEqual(db_post["alt_text"], update_data["alt_text"])

        # Cleanup
        utils.restore_post(self.test_post)

    def test_patch_authentication_required(self):
        """Test that unauthenticated patch requests return 401."""
        # Arrange
        url = f"{self.base_url}/{self.test_post['id']}"

        # Act
        response = requests.patch(url, json={})

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_empty_patch_preserves_data(self):
        """Test that patch with empty body doesn't overwrite existing data."""
        # Arrange
        url = f"{self.base_url}/{self.test_post['id']}"

        # Act
        response = utils.issue_patch_request(
            url,
            json={},
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 200)
        updated_post = response.json()

        # Verify original data preserved
        self.assertEqual(updated_post["image_url"], self.test_post["image_url"])
        self.assertEqual(updated_post["caption"], self.test_post["caption"])
        self.assertEqual(updated_post["alt_text"], self.test_post["alt_text"])

    def test_successful_post_deletion(self):
        """Test deleting a post returns 200 and removes the post."""
        # Arrange
        post_to_delete = utils.get_post_by_user(self.user_id)
        url = f"{self.base_url}/{post_to_delete['id']}"

        # Act
        response = utils.issue_delete_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 200)

        # Cleanup
        utils.restore_post_by_id(post_to_delete)

    def test_delete_authentication_required(self):
        """Test that unauthenticated delete requests return 401."""
        # Arrange
        url = f"{self.base_url}/{self.test_post['id']}"

        # Act
        response = requests.delete(url)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_successful_post_retrieval(self):
        """Test getting a post returns 200 and correct data."""
        # Arrange
        url = f"{self.base_url}/{self.test_post['id']}"

        # Act
        response = utils.issue_get_request(url, user_id=self.user_id)

        # Assert
        self.assertEqual(response.status_code, 200)
        post = response.json()

        # Verify post data
        self.assertEqual(post["id"], self.test_post["id"])
        self.assertEqual(post["image_url"], self.test_post["image_url"])
        self.assertEqual(post["caption"], self.test_post["caption"])
        self.assertEqual(post["alt_text"], self.test_post["alt_text"])
        self.assertTrue(isinstance(post["comments"], list))

    def test_get_authentication_required(self):
        """Test that unauthenticated get requests return 401."""
        # Arrange
        url = f"{self.base_url}/{self.test_post['id']}"

        # Act
        response = requests.get(url)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_invalid_id_format_handled(self):
        """Test that non-numeric post IDs return 404 for all methods."""
        # Arrange
        url = f"{self.base_url}/invalid_id"
        
        # Act & Assert - GET
        response = utils.issue_get_request(url, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

        # Act & Assert - PATCH
        response = utils.issue_patch_request(url, json={}, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

        # Act & Assert - DELETE
        response = utils.issue_delete_request(url, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_id_handled(self):
        """Test that non-existent post IDs return 404 for all methods."""
        # Arrange
        url = f"{self.base_url}/99999"
        
        # Act & Assert - GET
        response = utils.issue_get_request(url, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

        # Act & Assert - PATCH
        response = utils.issue_patch_request(url, json={}, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

        # Act & Assert - DELETE
        response = utils.issue_delete_request(url, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

    def test_unauthorized_access_prevented(self):
        """Test that accessing another user's post returns 404 for all methods."""
        # Arrange
        unauthorized_post = utils.get_post_that_user_cannot_access(self.user_id)
        url = f"{self.base_url}/{unauthorized_post['id']}"
        
        # Act & Assert - GET
        response = utils.issue_get_request(url, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

        # Act & Assert - PATCH
        response = utils.issue_patch_request(url, json={}, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

        # Act & Assert - DELETE
        response = utils.issue_delete_request(url, user_id=self.user_id)
        self.assertEqual(response.status_code, 404)

if __name__ == "__main__":
    unittest.main()
