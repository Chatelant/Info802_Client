from flask import Flask, render_template

app = Flask(__name__)


# Connexion au service SOAP
# TODO : changer l'URL
# transport = zeep.Transport(cache=None)
# client = zeep.Client("https://boiling-sea-49331.herokuapp.com/?wsdl", transport=transport)


# Lancement de l'application
# Le service SOAP fournit les noms des véhicules électriques
@app.route("/")
def home():
    # names = client.service.get_vehicles_names()
    names = ["Oui", "bonsoir"]
    return render_template('index.html', v_list=names)


# Retourne les informations d'une voiture à partir de son nom
# Le service SOAP fournit les informations
# @app.route("/car_selected", methods=['POST'])
# def get_car_info():
#     car_name = request.data.decode('UTF-8')
#     car_info = client.service.get_vehicle_info(car_name)
#
#     return json.dumps(car_info)


@app.route("/map")
def custom_map():
    return render_template('map.html')


# cars = client.service.get_vehicles()
# print(cars)
if __name__ == '__main__':
    app.run(debug=True, use_debugger=False, use_reloader=False)
