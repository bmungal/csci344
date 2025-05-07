import utils

utils.modify_system_path()

import unittest

# import the tests you want to run with the python run_tests.py command:
from tests.test_bookmark_delete import TestBookmarkDetailEndpoint
from tests.test_bookmark_list_post import TestBookmarkListEndpoint
from tests.test_like_delete import TestLikePostDetailEndpoint
from tests.test_like_post import TestLikePostListEndpoint
from tests.test_posts_get_patch_delete import TestPostDetailEndpoint
from tests.test_posts_list_post import TestPostListEndpoint
from tests.test_profile import TestProfileEndpoint
from tests.test_stories_list import TestStoryListEndpoint

# from tests.test_comments_delete import TestCommentDetailEndpoint
# from tests.test_comments_post import TestCommentListEndpoint
# from tests.test_followers_list import TestFollowerListEndpoint
# from tests.test_following_delete import TestFollowingDetailEndpoint
# from tests.test_following_list_post import TestFollowingListEndpoint
# from tests.test_suggestions_list import TestSuggestionListEndpoint

if __name__ == "__main__":
    unittest.main()

###################
# Required tests: #
###################
# Note: to run on command line (from the tests directory):
# poetry run python run_tests.py -v
# poetry run python run_tests.py TestPostListEndpoint -v
# poetry run python run_tests.py TestPostDetailEndpoint -v
# poetry run python run_tests.py TestBookmarkDetailEndpoint -v
# poetry run python run_tests.py TestBookmarkListEndpoint -v
# poetry run python run_tests.py TestLikePostDetailEndpoint -v
# poetry run python run_tests.py TestLikePostListEndpoint -v
# poetry run python run_tests.py TestProfileEndpoint -v
# poetry run python run_tests.py TestStoryListEndpoint -v


#######################
# Extra credit tests: #
#######################
# poetry run python run_tests.py TestCommentDetailEndpoint -v
# poetry run python run_tests.py TestCommentListEndpoint -v
# poetry run python run_tests.py TestFollowerListEndpoint -v
# poetry run python run_tests.py TestFollowingDetailEndpoint -v
# poetry run python run_tests.py TestFollowingListEndpoint -v
# poetry run python run_tests.py TestSuggestionListEndpoint -v
