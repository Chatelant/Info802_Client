import json

from flask import Flask, render_template, request
import zeep

app = Flask(__name__)


# Connexion au service SOAP
# TODO : changer l'URL
transport = zeep.Transport(cache=None)
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


# cars = client.service.get_vehicles()
# print(cars)
