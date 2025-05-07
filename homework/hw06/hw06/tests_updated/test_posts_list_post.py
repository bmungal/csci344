import utils
import requests
import unittest

class TestPostListEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/posts"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_default_post_limit(self):
        """Test that posts endpoint defaults to 20 posts."""
        # Act
        response = utils.issue_get_request(self.base_url, self.user_id)
        data = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(data), 20)

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Act
        response = requests.get(self.base_url)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_post_data_structure(self):
        """Test that post data contains all required fields."""
        # Act
        response = utils.issue_get_request(self.base_url, self.user_id)
        data = response.json()
        post = data[0]

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertTrue(isinstance(post["id"], int))
        self.assertTrue(isinstance(post["image_url"], str))
        self.assertTrue(isinstance(post["user"], dict))
        self.assertTrue(isinstance(post["caption"], (str, type(None))))
        self.assertTrue(isinstance(post["alt_text"], (str, type(None))))
        self.assertTrue(isinstance(post["comments"], list))

    def test_custom_post_limit(self):
        """Test that limit parameter returns correct number of posts."""
        # Act
        response = utils.issue_get_request(f"{self.base_url}?limit=3", self.user_id)
        data = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data), 3)

    def test_invalid_limit_handled(self):
        """Test that invalid limit parameters return 400."""
        # Arrange
        test_cases = ["80", "abc"]  # Test both out-of-range and non-numeric

        # Act & Assert
        for limit in test_cases:
            response = utils.issue_get_request(
                f"{self.base_url}?limit={limit}", 
                self.user_id
            )
            self.assertEqual(response.status_code, 400)

    def test_authorized_posts_only(self):
        """Test that only authorized posts are returned."""
        # Arrange
        authorized_user_ids = utils.get_authorized_user_ids(self.user_id)

        # Act
        response = utils.issue_get_request(
            f"{self.base_url}?limit=50", 
            self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 200)
        posts = response.json()
        for post in posts:
            self.assertTrue(post["user"]["id"] in authorized_user_ids)

    def test_successful_post_creation(self):
        """Test creating a new post returns 201 and correct data."""
        # Arrange
        body = {
            "image_url": "https://picsum.photos/600/430?id=668",
            "caption": "Test caption",
            "alt_text": "Test alt text"
        }

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 201)
        new_post = response.json()

        # Verify response data
        self.assertEqual(new_post["image_url"], body["image_url"])
        self.assertEqual(new_post["caption"], body["caption"])
        self.assertEqual(new_post["alt_text"], body["alt_text"])

        # Verify database state
        db_post = utils.get_post_by_id(new_post["id"])
        self.assertEqual(db_post["id"], new_post["id"])
        self.assertEqual(db_post["image_url"], new_post["image_url"])
        self.assertEqual(db_post["caption"], new_post["caption"])
        self.assertEqual(db_post["alt_text"], new_post["alt_text"])

        # Cleanup
        utils.delete_post_by_id(new_post["id"])
        self.assertEqual(utils.get_post_by_id(new_post["id"]), [])

    def test_image_only_post_creation(self):
        """Test creating a post with only image_url succeeds."""
        # Arrange
        body = {
            "image_url": "https://picsum.photos/600/430?id=668"
        }

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 201)
        new_post = response.json()

        # Verify response data
        self.assertEqual(new_post["image_url"], body["image_url"])
        self.assertIsNone(new_post["caption"])
        self.assertIsNone(new_post["alt_text"])

        # Cleanup
        utils.delete_post_by_id(new_post["id"])

    def test_missing_image_url_handled(self):
        """Test that post without image_url returns 400."""
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
