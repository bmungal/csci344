import unittest

import requests
import utils

root_url = utils.root_url


class TestSuggestionListEndpoint(unittest.TestCase):

    def setUp(self):
        self.current_user = utils.get_user_12()
        pass

    def test_suggestions_get_check_if_query_correct(self):
        url = f"{root_url}/api/suggestions"
        # print(url)
        response = utils.issue_get_request(url, self.current_user.get("id"))
        # print(response.text)
        self.assertEqual(response.status_code, 200)
        suggestions = response.json()
        ids = utils.get_unrelated_users(self.current_user.get("id"))
        self.assertEqual(len(suggestions), 7)
        for suggestion in suggestions:
            # print(suggestion.get('id'), ids)
            self.assertTrue(suggestion.get("id") in ids)

    def test_suggestions_get_check_if_data_structure_correct(self):
        response = utils.issue_get_request(
            "{0}/api/suggestions".format(root_url), self.current_user.get("id")
        )
        # print(response.text)
        self.assertEqual(response.status_code, 200)
        suggestions = response.json()
        suggestion = suggestions[0]
        user = utils.get_user(suggestion.get("id"))

        self.assertEqual(suggestion.get("id"), user.get("id"))
        self.assertEqual(suggestion.get("first_name"), user.get("first_name"))
        self.assertEqual(suggestion.get("last_name"), user.get("last_name"))
        self.assertEqual(suggestion.get("username"), user.get("username"))
        self.assertEqual(suggestion.get("email"), user.get("email"))
        self.assertEqual(suggestion.get("image_url"), user.get("image_url"))
        self.assertEqual(suggestion.get("thumb_url"), user.get("thumb_url"))


if __name__ == "__main__":
    unittest.main()
