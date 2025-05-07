import utils
import requests
import unittest

class TestStoryListEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/stories"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get('id')

    def test_authorized_stories_retrieval(self):
        """Test that stories endpoint returns only authorized stories."""
        # Arrange
        authorized_user_ids = utils.get_authorized_user_ids(self.user_id)
        expected_story_ids = utils.get_stories_by_user(self.user_id)

        # Act
        response = utils.issue_get_request(self.base_url, self.user_id)
        stories = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(stories) > 1, "Should return multiple stories")
        self.assertEqual(
            len(expected_story_ids), 
            len(stories), 
            "Number of stories should match database"
        )

        # Verify each story is from an authorized user and exists in database
        for story in stories:
            self.assertTrue(
                story.get('user').get('id') in authorized_user_ids,
                "Story should be from authorized user"
            )
            self.assertTrue(
                story.get('id') in expected_story_ids,
                "Story should exist in database"
            )

    def test_story_data_structure(self):
        """Test that story data contains all required fields with correct types."""
        # Act
        response = utils.issue_get_request(self.base_url, self.user_id)
        stories = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(stories) > 0, "Should have at least one story")

        # Verify structure of first story
        story = stories[0]
        
        # Check story fields
        self.assertTrue(isinstance(story['id'], int))
        self.assertTrue(isinstance(story['text'], str))
        self.assertTrue(isinstance(story['user'], dict))

        # Check user fields within story
        user = story['user']
        self.assertTrue(isinstance(user['id'], int))
        self.assertTrue(isinstance(user['first_name'], (str, type(None))))
        self.assertTrue(isinstance(user['last_name'], (str, type(None))))
        self.assertTrue(isinstance(user['image_url'], (str, type(None))))
        self.assertTrue(isinstance(user['thumb_url'], (str, type(None))))

    def test_authentication_required(self):
        """Test that unauthenticated requests return 401."""
        # Act
        response = requests.get(self.base_url)

        # Assert
        self.assertEqual(response.status_code, 401)

if __name__ == '__main__':
    unittest.main()