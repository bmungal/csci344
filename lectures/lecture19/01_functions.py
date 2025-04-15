def greet_walter():
    """Required parameter example"""
    return "Hello, Walter!"


def greet(name):
    """Required parameter example"""
    return f"Hello, {name}!"


def calculate_total(amount, tax_rate=0.1):
    """Required parameter with optional parameter (default value)"""
    return amount + (amount * tax_rate)


def create_profile(name, age, email=None, phone=None):
    """
    Required parameters (name, age) and keyword-only optional parameters (email, phone)
    """
    profile = {
        'name': name,
        'age': age
    }
    if email:
        profile['email'] = email
    if phone:
        profile['phone'] = phone
    return profile



# Example usage:
if __name__ == '__main__':
    
    # No required parameters:
    print(greet_walter())  # Output: Hello, Walter!
    
    # Basic required parameter
    print(greet("Alice"))  # Output: Hello, Alice!
    
    # Optional parameter
    print(calculate_total(100))  # Uses default tax_rate (0.1)
    print(calculate_total(100, 0.15))  # Specifies custom tax_rate
    
    # Keyword arguments
    profile1 = create_profile("Bob", 30, email="bob@example.com")
    profile2 = create_profile("Carol", 25, phone="555-0123", email="carol@example.com")
    print(profile1)
    print(profile2)
    
