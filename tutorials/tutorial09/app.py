from flask import Flask
from flask import render_template
from flask import request
import random
import json
import requests
from pprint import pprint

# initializes flask app:
app = Flask(__name__)

###################
# global variable #
###################
current_user = {
    'first_name': 'Erick',
    'last_name': 'Rubi',
    'email': 'erub03@gmail.com',
    'username': 'erub03'
}

#############################
# For Grading (do not edit) #
#############################
@app.route('/')
def home():
    return '''
        <html>
        <body>
            <h1>Homepage</h1>
            <p>Demo of some typical things that a server can do...</p>
            <ul>
                <li>Exercise 1: <a href="/message">/message</a></li>
                <li>Exercise 2: <a href="/data/quotes/">/data/quotes/</a></li>
                <li>Exercise 3: <a href="/data/yelp/?location=Asheville+NC&term=thai">/data/yelp/?location=Asheville+NC&term=thai</a></li>
                <li>Exercise 4: <a href="/ui/quote">/ui/quote</a></li>
                <li>Exercise 5: <a href="/ui/first-restaurant/?location=Asheville+NC&term=thai">/ui/first-restaurant/?location=Asheville+NC&term=thai</a></li>
                <li>Exercise 6: <a href="/ui/all-restaurants/?location=Asheville+NC&term=thai">/ui/all-restaurants/?location=Asheville+NC&term=thai</a> (5pts Extra Credit)</li>
            </ul>
        </body>
        '''

##############################
# Exercise 1: Custom Message #
##############################
@app.route('/message')
def exercise1():
    # return 'Hello world!'
    return 'Welcome, '+ current_user["first_name"]+ ' '+ current_user["last_name"]+'!'


###########################################
# Exercise 2: Grab data from a "database" #
###########################################
@app.route('/data/quotes')
@app.route('/data/quotes/')
def exercise2():
    import json
    with open('data.json') as f:
        data = json.load(f)
    # print(data)
    return json.dumps(data)
    


#############################################
# Exercise 3: Grab data from another server #
#############################################
'''
Your web server can also communicate with another server. 
For instance, we could query Yelp, and then relay some or 
all of this data back to the requester. 

Currently, the search term and location are hard-coded (5 pizza restaurants in Asheville). 
How would you modify this code so that that your endpoint 
can make use of query string request parameters:

e.g., http://127.0.0.1:5000/yelp-proxy/location=NY,%20NY&term=chinese&count=3
'''
@app.route('/data/yelp/')
@app.route('/data/yelp')
def exercise3():
    # search_term = 'pizza'
    # location = 'Asheville, NC'

    search_term = request.args.get('term')
    location = request.args.get('location')
    if not search_term or not location:
        return "Check input, Please enter search term or location. Please try again."
    
    count = 10
    # go fetch data from another server and give it to the requestor:
    base_url = 'https://www.apitutor.org/yelp/simple/v3/businesses/search'
    url = f'{base_url}?location={location}&term={search_term}&limit={count}'
    response = requests.get(url)
    data = response.json()
    return json.dumps(data)



###################################################################
# Exercise 4: Merge data with a template (server-side templating) #
###################################################################
@app.route('/ui/quote')
def exercise4():
    import json
    with open('data.json') as f:
        quotes = json.load(f)
    #print(quotes)
    return render_template(
        'quote-of-the-day.html',
        user=current_user
        quote=random.choice(quotes)
    )


#########################################################
# Exercise 5: Merge someone else's data with a template #
#########################################################
@app.route('/ui/first-restaurant/')
@app.route('/ui/first-restaurant')
def exercise5():
    args = request.args
    location = args.get('location')
    search_term = args.get('term')
    if not (location and search_term):
        return '"location" and "term" are required query parameters'

    base_url = 'https://www.apitutor.org/yelp/simple/v3/businesses/search'
    url = f'{base_url}?location={location}&term={search_term}&limit=1'
    print(url)
    response = requests.get(url)
    restaurants = response.json()
    pprint(restaurants[0])  # for debugging
    return render_template(
        'restaurant.html',
        endpoint='/ui/first-restaurant/',
        user=current_user,
        search_term=search_term,
        location=location,
        restaurant=restaurants[0]
    )


#########################################################################
# Exercise 6: Merge someone else's data with a template (more practice) #
#########################################################################
@app.route('/ui/all-restaurants/')
@app.route('/ui/all-restaurants')
def exercise6():
    args = request.args
    location = args.get('location')
    search_term = args.get('term')
    if not (location and search_term):
        return '"location" and "term" are required query parameters'
    base_url = 'https://www.apitutor.org/yelp/simple/v3/businesses/search'
    url = f'{base_url}?location={location}&term={search_term}'

    response = requests.get(url)
    restaurants = response.json()
    return render_template(
        'restaurants.html',
        endpoint='/ui/all-restaurants/',
        user=current_user,
        location=location,
        search_term=search_term,
        restaurants=restaurants
    )