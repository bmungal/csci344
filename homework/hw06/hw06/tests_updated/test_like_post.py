import utils
import requests
import unittest

class TestLikePostListEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/likes"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")


    def test_successful_like_creation(self):
        """Test creating a new like with valid data returns 201."""
        # Arrange
        post_id = utils.get_unliked_post_id_by_user(self.user_id)
        
        # Act
        response = utils.issue_post_request(
            self.base_url,
            json={"post_id": post_id},
            user_id=self.user_id
        )
        new_like = response.json()

        # Assert
        self.assertEqual(response.status_code, 201)
        self.assertEqual(new_like["post_id"], post_id)
        self.assertEqual(new_like["user_id"], self.user_id)

        # Verify database state
        db_like = utils.get_liked_post_by_id(new_like["id"])
        self.assertEqual(db_like["id"], new_like["id"])

        # Cleanup
        utils.delete_like_by_id(new_like["id"])
        self.assertEqual(utils.get_liked_post_by_id(new_like["id"]), [])

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        response = requests.post(self.base_url, json={})
        self.assertEqual(response.status_code, 401)

    def test_duplicate_like_prevented(self):
        """Test that liking the same post twice returns 400."""
        # Arrange
        liked_post = utils.get_liked_post_by_user(self.user_id)
        
        # Act
        response = utils.issue_post_request(
            self.base_url,
            json={"post_id": liked_post["post_id"]},
            user_id=self.user_id
        )
        
        # Assert
        self.assertEqual(response.status_code, 400)

    def test_invalid_post_id_handled(self):
        """Test that liking a non-existent post returns 404."""
        response = utils.issue_post_request(
            self.base_url,
            json={"post_id": 99999999},
            user_id=self.user_id
        )
        self.assertEqual(response.status_code, 404)

    def test_unauthorized_post_access_prevented(self):
        """Test that liking an inaccessible post returns 404."""
        # Arrange
        inaccessible_post = utils.get_post_that_user_cannot_access(self.user_id)
        
        # Act
        response = utils.issue_post_request(
            self.base_url,
            json={"post_id": inaccessible_post["id"]},
            user_id=self.user_id
        )
        
        # Assert
        self.assertEqual(response.status_code, 404)

if __name__ == "__main__":
    unittest.main()
