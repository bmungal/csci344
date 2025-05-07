import utils
import requests
import unittest

class TestBookmarkListEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/bookmarks"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")

    def test_bookmarks_list_retrieval(self):
        """Test getting list of bookmarks returns correct data."""
        # Act
        response = utils.issue_get_request(self.base_url, user_id=self.user_id)
        bookmarks = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        # Verify all bookmarks belong to user
        bookmark_ids = utils.get_user_bookmark_ids(self.user_id)
        for bookmark in bookmarks:
            self.assertTrue(bookmark["id"] in bookmark_ids)
        # Verify non-empty response
        self.assertTrue(len(bookmarks) > 1)

    def test_bookmark_data_structure(self):
        """Test that bookmark data contains all required fields."""
        # Act
        response = utils.issue_get_request(self.base_url, user_id=self.user_id)
        bookmarks = response.json()
        bookmark = bookmarks[0]

        # Assert
        self.assertEqual(response.status_code, 200)
        # Verify bookmark in response matches database
        bookmark_db = utils.get_bookmark_by_id(bookmark["id"])
        post_db = utils.get_post_by_id(bookmark["post"]["id"])

        self.assertEqual(bookmark["id"], bookmark_db["id"])
        self.assertEqual(bookmark["post"]["id"], post_db["id"])
        self.assertEqual(bookmark["post"]["image_url"], post_db["image_url"])
        self.assertEqual(bookmark["post"]["caption"], post_db["caption"])
        self.assertEqual(bookmark["post"]["alt_text"], post_db["alt_text"])
        self.assertEqual(bookmark["post"]["user"]["id"], post_db["user_id"])

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Act
        response = requests.get(self.base_url)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_successful_bookmark_creation(self):
        """Test creating a new bookmark returns 201 and correct data."""
        # Arrange
        post_id = utils.get_unbookmarked_post_id_by_user(self.user_id)
        body = {"post_id": post_id}

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 201)
        new_bookmark = response.json()
        
        # Verify response data
        self.assertEqual(new_bookmark["post"]["id"], post_id)

        # Verify database state
        bookmark_db = utils.get_bookmark_by_id(new_bookmark["id"])
        self.assertEqual(bookmark_db["id"], new_bookmark["id"])

        # Cleanup
        utils.delete_bookmark_by_id(new_bookmark["id"])
        self.assertEqual(utils.get_bookmark_by_id(new_bookmark["id"]), [])

    def test_duplicate_bookmark_prevented(self):
        """Test bookmarking an already bookmarked post returns 400."""
        # Arrange
        bookmark = utils.get_bookmarked_post_by_user(self.user_id)
        body = {"post_id": bookmark["post_id"]}

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 400)

    def test_invalid_post_id_format_handled(self):
        """Test that non-numeric post IDs return 400."""
        # Arrange
        body = {"post_id": "invalid_id"}

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
        body = {"post_id": 999999}

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_unauthorized_post_bookmark_prevented(self):
        """Test bookmarking an inaccessible post returns 404."""
        # Arrange
        post = utils.get_post_that_user_cannot_access(self.user_id)
        body = {"post_id": post["id"]}

        # Act
        response = utils.issue_post_request(
            self.base_url,
            json=body,
            user_id=self.user_id
        )

        # Assert
        self.assertEqual(response.status_code, 404)

    def test_missing_post_id_handled(self):
        """Test that request without post_id returns 400."""
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
