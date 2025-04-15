def age_check(age):
    if age >= 18:
        return "Adult"
    else:
        return "Minor"




def what_to_do(is_weekend, is_sunny):
    # Nested if statements
    
    if is_weekend:
        if is_sunny:
            print("Let's go to the beach!")
        else:
            print("Let's watch a movie at home")
    else:
        print("Time to work")




def concert_ticket(has_ticket, is_vendor):
    # Multiple conditions using and/or
    if has_ticket or is_vendor:
        print("Welcome to the concert!")
    else:
        print("Access denied")



def is_fruit_in_stock(fruit):
    fruit_list = ['apple', 'banana', 'orange']
    if fruit in fruit_list:
        return True
    else:
        return False



# Example usage:
if __name__ == '__main__':
    # Test age_check function
    print("\nTesting age_check:")
    print(age_check(20))  # Should print: Adult
    print(age_check(15))  # Should print: Minor

    # Test what_to_do function
    print("\nTesting what_to_do:")
    what_to_do(True, True)    # Should print: Let's go to the beach!
    what_to_do(True, False)   # Should print: Let's watch a movie at home
    what_to_do(False, True)   # Should print: Time to work

    # Test concert_ticket function
    print("\nTesting concert_ticket:")
    concert_ticket(True, False)    # Should print: Welcome to the concert!
    concert_ticket(False, True)    # Should print: Welcome to the concert!
    concert_ticket(False, False)   # Should print: Access denied

    # Test check_fruit function
    print("\nTesting check_fruit:")
    in_stock_apple = is_fruit_in_stock('apple')   # True
    in_stock_mango = is_fruit_in_stock('mango')   # False
    print(f"In stock apple: {in_stock_apple}")
    print(f"In stock mango: {in_stock_mango}")
