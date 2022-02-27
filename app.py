import json

import zeep
from flask import Flask, render_template, send_from_directory, request

app = Flask(__name__)


# Connexion au service SOAP
# TODO : changer l'URL
transport = zeep.Transport(cache=None)
# client = zeep.Client("https://boiling-sea-49331.herokuapp.com/?wsdl", transport=transport)
client = zeep.Client("http://localhost:8000/?wsdl", transport=transport)


# Lancement de l'application
# Le service SOAP fournit les noms des véhicules électriques
@app.route("/")
def home():
    names = client.service.get_vehicles_names()
    return render_template('index.html', v_list=names)


# Retourne les informations d'une voiture à partir de son nom
# Le service SOAP fournit les informations
@app.route("/car_selected", methods=['POST'])
def get_car_info():
    car_name = request.data.decode('UTF-8')
    car_info = client.service.get_vehicle_info(car_name)

    return json.dumps(car_info)


@app.route("/map")
def custom_map():
    return render_template('map.html')


if __name__ == '__main__':
    cars = client.service.get_vehicles()
    app.run(debug=True, use_debugger=False, use_reloader=False)
