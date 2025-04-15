from datetime import datetime

class Post(object):
    def __init__(self, id, image_url, caption, alt_text, user, pub_date=datetime.now()):
        self.id = id
        self.image_url = image_url
        self.caption = caption
        self.alt_text = alt_text
        self.user = user    # This will store the User object
        self.pub_date = pub_date

    def __str__(self):
        return f'''Post by {self.user.username}:
        {self.caption}'''

    def to_dict(self):
        return {
            'id': self.id,
            'image_url': self.image_url,
            'caption': self.caption,
            'alt_text': self.alt_text,
            'pub_date': self.pub_date,
            'user': self.user.to_dict()  # Convert the user object to dict as well
        }

    