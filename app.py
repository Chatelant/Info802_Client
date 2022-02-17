from flask import Flask, render_template
import zeep


app = Flask(__name__)

transport = zeep.Transport(cache=None)
client = zeep.Client("http://localhost:8000/?wsdl", transport=transport)


@app.route("/")
def home():
    answer1 = client.service.addition(1, 2)
    answer2 = client.service.addition(3, 4)
    answer3 = client.service.addition(5, 6)
    result = [answer1, answer2, answer3]
    return render_template('index.html', v_list=result)



