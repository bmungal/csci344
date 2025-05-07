from datetime import datetime


def get_display_time(timestamp):
    diff = datetime.utcnow() - timestamp
    days = diff.days
    seconds = diff.seconds
    hours = seconds // 3600

    # minutes = (seconds // 60) % 60
    if days == 0:
        if hours <= 0:
            return "Just now"
        elif hours == 1:
            return "1 hour ago"
        else:
            return "{0} hours ago".format(hours)
    elif days == 1:
        return "1 day ago"
    else:
        return "{0} days ago".format(days)
