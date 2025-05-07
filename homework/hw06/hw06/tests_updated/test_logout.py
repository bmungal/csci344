import utils
import requests
import unittest

class TestLogoutEndpoint(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/logout"
        self.current_user = utils.get_random_user()
        self.user_id = self.current_user.get("id")
        self.login_url = f"{utils.root_url}/login"

    def test_successful_logout_redirects(self):
        """Test that logout redirects to login screen."""
        # Act
        response = requests.get(self.base_url)

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.url, self.login_url)
        
        # Verify no auth cookies remain
        self.assertFalse(any(
            cookie.startswith('access_token') 
            for cookie in response.cookies.keys()
        ))

if __name__ == "__main__":
    unittest.main()
