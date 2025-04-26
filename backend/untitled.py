from google.colab import userdata
from google import genai

GOOGLE_API_KEY = userdata.get('GOOGLE_API_KEY')
client = genai.Client(api_key=GOOGLE_API_KEY)

def generate_response(prompt):
    response = client.generate_content(prompt)
    return response.text

print(generate_response("Hello, how are you?"))