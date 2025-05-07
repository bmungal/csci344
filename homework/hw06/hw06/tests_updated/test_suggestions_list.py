import utils
import requests
import unittest

class TestSuggestionListEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/api/suggestions"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get('id')

    def test_suggestions_retrieval(self):
        """Test that suggestions endpoint returns correct number of unfollowed users."""
        # Act
        response = utils.issue_get_request(self.base_url, self.user_id)
        suggestions = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(
            len(suggestions), 
            7, 
            "Should return no more than 7 suggestions"
        )

        # Verify suggestions are not already followed
        authorized_user_ids = utils.get_authorized_user_ids(self.user_id)
        for suggestion in suggestions:
            self.assertNotIn(
                suggestion['id'], 
                authorized_user_ids,
                "Suggested user should not be already followed"
            )

    def test_suggestion_data_structure(self):
        """Test that suggestion data contains all required fields with correct types."""
        # Act
        response = utils.issue_get_request(self.base_url, self.user_id)
        suggestions = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(suggestions) > 0, "Should have at least one suggestion")

        # Verify structure of first suggestion
        user = suggestions[0]
        
        # Check all required fields and their types
        self.assertTrue(isinstance(user['id'], int))
        self.assertTrue(isinstance(user['username'], str))
        self.assertTrue(isinstance(user['first_name'], (str, type(None))))
        self.assertTrue(isinstance(user['last_name'], (str, type(None))))
        self.assertTrue(isinstance(user['email'], str))
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
