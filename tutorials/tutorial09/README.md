### Set Up Your Virtual Environment
Open the terminal and navigate to your `tutorial09` folder. Then, install your dependencies and build your virtual environment as follows:

```bash
poetry install
```

Note that this should create a `.venv` folder at the root of your `tutorial09` folder.


### Run Your Flask Web Server

When you're done, try running your flask app from your command line, using the poetry virtual environment:

```bash
poetry run flask run --debug
```

You should see the following output:
```bash
 * Serving Flask app "app.py" (lazy loading)
 * Environment: development
 * Debug mode: on
 * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
 * Restarting with stat
 * Debugger is active!
 * Debugger PIN: 273-580-071
 ```

 Navigate to <a href="http://127.0.0.1:5000/" target="_blank">http://127.0.0.1:5000/</a>, and you should see a screen that lists the exercises that you are to complete:
