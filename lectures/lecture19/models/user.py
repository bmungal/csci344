class User(object):
    def __init__(self, first_name, last_name, username, thumb_url, bio, is_active=True):
        self.first_name = first_name
        self.last_name = last_name
        self.username = username
        self.thumb_url = thumb_url
        self.bio = bio
        self.is_active = is_active

    def to_dict(self):
        return {
            'first_name': self.first_name,
            'last_name': self.last_name,
            'username': self.username,
            'thumb_url': self.thumb_url,
            'bio': self.bio,
            'is_active': self.is_active
        }