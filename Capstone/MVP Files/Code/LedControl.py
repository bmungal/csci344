import RPi.GPIO as GPIO
import time

# Use BCM numbering
GPIO.setmode(GPIO.BCM)

# Setup LED pins
LED1 = 17
LED2 = 27
GPIO.setup(LED1, GPIO.OUT)
GPIO.setup(LED2, GPIO.OUT)

print("Press 1: LED1 ON, LED2 OFF")
print("Press 2: LED1 OFF, LED2 ON")
print("Press 3: BOTH ON")
print("Press 0: ALL OFF")
print("Press q: QUIT")

try:
    while True:
        choice = input("Enter a number: ")

        if choice == '1':
            GPIO.output(LED1, GPIO.HIGH)
            GPIO.output(LED2, GPIO.LOW)
        elif choice == '2':
            GPIO.output(LED1, GPIO.LOW)
            GPIO.output(LED2, GPIO.HIGH)
        elif choice == '3':
            GPIO.output(LED1, GPIO.HIGH)
            GPIO.output(LED2, GPIO.HIGH)
        elif choice == '0':
            GPIO.output(LED1, GPIO.LOW)
            GPIO.output(LED2, GPIO.LOW)
        elif choice.lower() == 'q':
            break
        else:
            print("Invalid input. Try 1, 2, 3, 0 or q.")

except KeyboardInterrupt:
    print("Exiting...")

finally:
    GPIO.cleanup()