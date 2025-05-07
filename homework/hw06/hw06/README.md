# Set Up
1. Create a virtual environment and install the dependencies using poetry:

    ```bash
    poetry install
    ```
2. Build the database (make sure you have a postgres database running and that the .env file is set up correctly with your DB_URL):

    ```bash
    poetry run python populate.py
    ```

3. Run the flask server:

    ```bash
    poetry run flask run --debug
    ```

4. Run the tests as follows (and make sure that your local Flask server is running):

    ```bash
    cd tests                                            # switch to your tests directory
    poetry run python run_tests.py                                 # run all tests
    poetry run python run_tests.py -v                              # run all tests verbose
    poetry run python run_tests.py TestCommentListEndpoint -v      # run some tests verbose

    # run a single test
    poetry run python run_tests.py TestCommentListEndpoint.test_comment_post_valid_request_201 -v       
    ```
