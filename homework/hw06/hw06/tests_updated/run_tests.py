import utils

utils.modify_system_path()

import unittest

# import the tests you want to run with the python run_tests.py command:
from tests_updated.test_bookmark_delete import TestBookmarkDetailEndpoint
from tests_updated.test_bookmark_list_post import TestBookmarkListEndpoint
from tests_updated.test_like_delete import TestLikePostDetailEndpoint
from tests_updated.test_like_post import TestLikePostListEndpoint
from tests_updated.test_profile import TestProfileEndpoint
from tests_updated.test_stories_list import TestStoryListEndpoint

# New tests:
from tests_updated.test_login import TestLoginEndpoint
from tests_updated.test_logout import TestLogoutEndpoint
from tests_updated.test_posts_get_patch_delete import TestPostDetailEndpoint
from tests_updated.test_posts_list_post import TestPostListEndpoint
from tests_updated.test_token import (
    TestTokenEndpoint,
    TestRefreshTokenEndpoint,
)

# Optional tests:
# from tests_updated.test_comments_delete import TestCommentDetailEndpoint
# from tests_updated.test_comments_post import TestCommentListEndpoint
# from tests_updated.test_followers_list import TestFollowerListEndpoint
# from tests_updated.test_following_delete import TestFollowingDetailEndpoint
# from tests_updated.test_following_list_post import TestFollowingListEndpoint
# from tests_updated.test_suggestions_list import TestSuggestionListEndpoint


if __name__ == "__main__":
    unittest.main()

# Note: to run on command line (from the tests directory):
# $ python3 run_tests.py -v
# $ python3 run_tests.py TestPostListEndpoint -v
# $ python3 run_tests.py TestPostDetailEndpoint -v
# $ python3 run_tests.py TestFollowingListEndpoint -v
