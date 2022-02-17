from flask import Flask, render_template
import zeep
from zeep.helpers import serialize_object

app = Flask(__name__)

transport = zeep.Transport(cache=None)
client = zeep.Client("http://localhost:8000/?wsdl", transport=transport)


@app.route("/")
def home():
    # result = client.service.get_vehicles()
    result = client.service.get_vehicles_names()
    print(result)

    return render_template('index.html', v_list=result)



