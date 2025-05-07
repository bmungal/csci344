mport paho.mqtt.client as mqtt
import RPi.GPIO as GPIO

# GPIO Setup
LED_PIN = 17  # Use your correct GPIO pin number
GPIO.setmode(GPIO.BCM)
GPIO.setup(LED_PIN, GPIO.OUT)

# MQTT Setup
MQTT_BROKER = "192.168.1.233"  # Change this!
MQTT_PORT = 1883
TOPIC = "led/control"

def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    print(f"Received: {payload}")
    if payload == "ON":
        GPIO.output(LED_PIN, GPIO.HIGH)
    elif payload == "OFF":
        GPIO.output(LED_PIN, GPIO.LOW)

client = mqtt.Client()
client.username_pw_set("bmungal", "Iaminretrograde1!")

client.on_connect = on_connect
client.on_message = on_message

client.connect(MQTT_BROKER, MQTT_PORT, 60)

try:
    client.loop_forever()
except KeyboardInterrupt:
    GPIO.cleanup()