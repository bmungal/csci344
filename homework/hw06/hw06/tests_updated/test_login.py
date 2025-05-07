import utils
import requests
import unittest


class TestLoginEndpoint(unittest.TestCase):

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{utils.root_url}/login"
        self.current_user = utils.get_random_user()
        self.headers = {
            "User-Agent": "Mozilla/5.0",
            "content-type": "application/x-www-form-urlencoded"
        }

    def test_successful_login_redirects(self):
        """Test successful login redirects to home screen."""
        # Arrange
        form_data = {
            "username": self.current_user["username"],
            "password": self.current_user["password_plaintext"]
        }

        # Act
        response = requests.post(
            self.base_url,
            headers=self.headers,
            data=form_data
        )

        # Assert
        self.assertEqual(response.url, f"{utils.root_url}/")
        self.assertEqual(response.status_code, 200)

    def test_invalid_username_stays_on_login(self):
        """Test login with invalid username stays on login page."""
        # Arrange
        form_data = {
            "username": "invalid_username",
            "password": self.current_user["password_plaintext"]
        }

        # Act
        response = requests.post(
            self.base_url,
            headers=self.headers,
            data=form_data
        )

        # Assert
        self.assertEqual(response.url, self.base_url)
        self.assertEqual(response.status_code, 200)

    def test_invalid_password_stays_on_login(self):
        """Test login with invalid password stays on login page."""
        # Arrange
        form_data = {
            "username": self.current_user["username"],
            "password": "invalid_password"
        }

        # Act
        response = requests.post(
            self.base_url,
            headers=self.headers,
            data=form_data
        )

        # Assert
        self.assertEqual(response.url, self.base_url)
        self.assertEqual(response.status_code, 200)

    def test_home_requires_authentication(self):
        """Test accessing home without auth redirects to login."""
        # Arrange
        home_url = f"{utils.root_url}/"

        # Act
        response = requests.get(home_url)

        # Assert
        self.assertEqual(response.url, self.base_url)
        self.assertEqual(response.status_code, 200)

    def test_home_accessible_with_auth(self):
        """Test accessing home with auth succeeds."""
        # Arrange
        home_url = f"{utils.root_url}/"

        # Act
        response = utils.issue_get_request(
            home_url, 
            user_id=self.current_user["id"]
        )

        # Assert
        self.assertEqual(response.url, home_url)
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
