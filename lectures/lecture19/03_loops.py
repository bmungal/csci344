def count_down(start):
    """Basic while loop example"""
    print(f"\nCounting down from {start}:")
    while start > 0:
        print(start)
        start -= 1
    print("Blast off!")








def get_positive_numbers(numbers):
    """For loop with continue statement"""
    
    positive_numbers = []
    for num in numbers:
        if num <= 0:
            continue  # Skip negative numbers
        positive_numbers.append(num)
    return positive_numbers





def enumerate_example():
    """Using enumerate in a for loop"""
    fruits = ['apple', 'banana', 'orange']
    print("\nFruit inventory:")
    for index, fruit in enumerate(fruits, 1):
        print(f"{index}. {fruit}")






def list_comprehension_example():
    """Demonstrating list comprehension"""
    numbers = [1, 2, 3, 4, 5]
    squares = [num * num for num in numbers]
    print(f"\nOriginal numbers: {numbers}")
    print(f"Squares: {squares}")





def find_largest():
    """For loop to find the largest number"""
    numbers = [12, 45, 23, 67, 89, 34, 21, 55, 90, 15]
    largest = numbers[0]  # Start with first number
    
    for num in numbers:
        if num > largest:
            largest = num
    
    print(f"\nNumbers: {numbers}")
    print(f"Largest number: {largest}")

if __name__ == '__main__':
    # test the count_down function:
    count_down(5)
    
    
    # test the process_list function:   
    result = get_positive_numbers(numbers = [1, -2, 3, -4, 5, -6, 7, -8, 9, -10])
    print(f"Positive numbers: {result}")
    result = get_positive_numbers(numbers = [-20, 0, 5, 10])
    print(f"Positive numbers: {result}")


    
    # test the enumerate_example function:
    enumerate_example()
    
    # test the list_comprehension_example function:
    list_comprehension_example()

    # test the find_largest function:
    find_largest()
