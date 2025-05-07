import utils
import requests
import unittest
from requests.exceptions import ConnectionError
from time import sleep

root_url = utils.root_url


class TestTokenEndpoint(unittest.TestCase):

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{root_url}/api/token"
        self.current_user = utils.get_random_user()
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    def _make_request_with_retry(self, method, url, **kwargs):
        """Helper method to make requests with retry logic."""
        for attempt in range(self.max_retries):
            try:
                return method(url, **kwargs)
            except ConnectionError:
                if attempt == self.max_retries - 1:
                    raise
                sleep(self.retry_delay)

    def test_successful_token_generation(self):
        """Test that valid credentials yield access and refresh tokens."""
        # Arrange
        data = {
            "username": self.current_user["username"],
            "password": self.current_user["password_plaintext"]
        }

        # Act
        response = self._make_request_with_retry(requests.post, self.base_url, json=data)
        data = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(data["access_token"]) > 300)
        self.assertTrue(len(data["refresh_token"]) > 300)

    def test_token_authentication_works(self):
        """Test that generated token can access protected resources."""
        # Arrange
        data = {
            "username": self.current_user["username"],
            "password": self.current_user["password_plaintext"]
        }
        response = self._make_request_with_retry(requests.post, self.base_url, json=data)
        access_token = response.json()["access_token"]
        
        # Act
        home_url = f"{root_url}/"
        response = self._make_request_with_retry(
            requests.get,
            home_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        # Assert
        self.assertEqual(response.url, home_url)
        self.assertEqual(response.status_code, 200)

    def test_invalid_username_rejected(self):
        """Test that invalid username returns 401."""
        # Arrange
        data = {
            "username": "invalid_username",
            "password": self.current_user["password_plaintext"]
        }

        # Act
        response = self._make_request_with_retry(requests.post, self.base_url, json=data)

        # Assert
        self.assertEqual(response.status_code, 401)

    def test_invalid_password_rejected(self):
        """Test that invalid password returns 401."""
        # Arrange
        data = {
            "username": self.current_user["username"],
            "password": "invalid_password"
        }

        # Act
        response = self._make_request_with_retry(requests.post, self.base_url, json=data)

        # Assert
        self.assertEqual(response.status_code, 401)


class TestRefreshTokenEndpoint(unittest.TestCase):

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.base_url = f"{root_url}/api/token/refresh"
        self.current_user = utils.get_random_user()
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    def _make_request_with_retry(self, method, url, **kwargs):
        """Helper method to make requests with retry logic."""
        for attempt in range(self.max_retries):
            try:
                return method(url, **kwargs)
            except ConnectionError:
                if attempt == self.max_retries - 1:
                    raise
                sleep(self.retry_delay)

    def test_successful_token_refresh(self):
        """Test that valid refresh token yields new access token."""
        # Arrange
        refresh_token = utils.get_refresh_token(self.current_user["id"])
        data = {"refresh_token": refresh_token}

        # Act
        response = self._make_request_with_retry(requests.post, self.base_url, json=data)
        data = response.json()

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(data["access_token"]) > 300)
        self.assertTrue(len(refresh_token) > 300)

    def test_refreshed_token_works(self):
        """Test that refreshed access token can access protected resources."""
        # Arrange
        refresh_token = utils.get_refresh_token(self.current_user["id"])
        response = self._make_request_with_retry(
            requests.post,
            self.base_url,
            json={"refresh_token": refresh_token}
        )
        access_token = response.json()["access_token"]

        # Act
        home_url = f"{root_url}/"
        response = self._make_request_with_retry(
            requests.get,
            home_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        # Assert
        self.assertEqual(response.url, home_url)
        self.assertEqual(response.status_code, 200)

    def test_invalid_refresh_token_rejected(self):
        """Test that invalid refresh token returns error."""
        # Arrange
        data = {"refresh_token": "invalid_token"}

        # Act
        response = self._make_request_with_retry(requests.post, self.base_url, json=data)

        # Assert
        self.assertTrue(response.status_code in [400, 422])

    def test_expired_refresh_token_rejected(self):
        """Test that expired refresh token returns error."""
        # Arrange
        expired_token = utils.get_expired_refresh_token(self.current_user["id"])
        data = {"refresh_token": expired_token}

        # Act
        response = self._make_request_with_retry(requests.post, self.base_url, json=data)

        # Assert
        self.assertIn(response.status_code, [400, 401])


if __name__ == "__main__":
    unittest.main()
