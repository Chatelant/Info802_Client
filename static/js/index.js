// paramètres de l'application
let params = {
    geocoder: "",
    map: "",
    car: "0",
    roadDisplay: "",
    roadService: "",
    polyline: "",
    start: "",
    end: "",
    stations: [],
    travelTime: 0,
    totalDist: 0,
}

// JAVASCRIPT POUR LA DROPDOWN
document.getElementById("vehicle-select").onchange = selectCar;
selectCar();

// Affiche les informations du véhicule sélectionné
async function selectCar() {
    let dropdown = document.getElementById("vehicle-select");
    let car_value = dropdown.options[dropdown.selectedIndex].value;

    if (car_value !== "0") {
        // récupération du nom de la voiture sélectionnée
        const url = 'car_selected'
        const car_selected = dropdown.options[dropdown.selectedIndex].text;

        // envoie du nom de la voiture au python
        const response = await fetch(url, {
            method: "POST",
            body: car_selected
        });

        // récupération des informations de la voiture
        const resp = await response.json();
        const info = JSON.parse(JSON.stringify(resp));

        // format des informations : "brand;model;autonomy;refill"
        let data = info.split(";");
        params.car = {
            brand: data[0],
            model: data[1],
            autonomy: parseFloat(data[2]),
            refill: parseFloat(data[3]),
        }
    }
}

// JAVASCRIPT POUR LA MAP
// Initialise la map
function initialize() {
    params.geocoder = new google.maps.Geocoder();
    let latlng = new google.maps.LatLng(48.8588335, 2.2768239);
    let mapOptions = {
        zoom: 10,
        center: latlng
    }
    params.map = new google.maps.Map(document.getElementById('map'), mapOptions);

    // Setup du trajet entre les deux points
    params.polyline = new google.maps.Polyline({
        path: [],
        strokeColor: '#0e3d80',
        strokeWeight: 4
    });
}

// Trouve et trace la route entre les 2 points donnés par l'utilisateur
async function setRoute() {
    // Reset les paramètres de la carte
    params.stations = []
    if (params.roadDisplay) params.roadDisplay.setMap(null);

    // Trouve la position du point de départ en LatLng
    let addressDepart = document.getElementById('addressDepart').value;
    params.start = await getCoordinates(addressDepart);

    // Trouve la position du point d'arrivée en LatLng
    let addressArrivee = document.getElementById('addressArrivee').value;
    params.end = await getCoordinates(addressArrivee);

    if (params.car === "0") {
        alert("Veuillez sélectionner une voiture");
    } else {
        // Calcul du trajet sans station
        let request = {
            origin: new google.maps.LatLng(params.start),
            destination: new google.maps.LatLng(params.end),
            travelMode: google.maps.TravelMode.DRIVING
        };

        await calculTrajet(request);

        // Récupère la liste des stations où l'on doit s'arrêter pendant le trajet
        await setListStations();

        // Calcul et affichage du trajet
        request = {
            origin: new google.maps.LatLng(params.start),
            waypoints: params.stations,
            destination: new google.maps.LatLng(params.end),
            travelMode: google.maps.TravelMode.DRIVING
        };

        await calculTrajet(request);

        params.roadDisplay.setMap(params.map);
        params.polyline.setMap(params.map);

        // Recentre la carte sur le trajet
        let Center = new google.maps.LatLng(18.210885, -67.140884);
        let properties = {
            center: Center,
            zoom: 20,
            mapTypeId: google.maps.MapTypeId.SATELLITE
        };
    }
    displayTravelTime();
}

// Récupère les coordonnées LatLng à partir d'une adresse
async function getCoordinates(address) {
    let coordinates;
    await params.geocoder.geocode({'address': address}, function (results, status) {
        if (status === 'OK') {
            coordinates = results[0].geometry.location
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
    return coordinates;
}

// Calcul une route à partir d'une requête
async function calculTrajet(request) {
    params.roadService = new google.maps.DirectionsService();
    params.roadDisplay = new google.maps.DirectionsRenderer();

    await params.roadService.route(request, function (response, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            params.polyline.setPath([]);
            let bounds = new google.maps.LatLngBounds();
            startLocation = new Object();
            endLocation = new Object();
            params.roadDisplay.setDirections(response);
            let legs = response.routes[0].legs;
            params.travelTime = 0;
            params.totalDist = 0;
            for (let i = 0; i < legs.length; i++) {
                if (i === 0) {
                    startLocation.latlng = legs[i].start_location;
                    startLocation.address = legs[i].start_address;
                }
                endLocation.latlng = legs[i].end_location;
                endLocation.address = legs[i].end_address;
                let steps = legs[i].steps;
                for (let j = 0; j < steps.length; j++) {
                    let nextSegment = steps[j].path;
                    for (let k = 0; k < nextSegment.length; k++) {
                        params.polyline.getPath().push(nextSegment[k]);
                        bounds.extend(nextSegment[k]);
                    }
                }
                params.travelTime += legs[i].duration.value;
                params.totalDist += legs[i].distance.value;
            }
        } else {
            alert("directions response " + status);
        }
    });
}

// Récupère la liste des stations de recharge où s'arrêter pour faire le trajet
async function setListStations() {
    const MAX_WAYPOINTS_PER_REQUEST = 23; // Maximum de stations où l'on peut s'arrêter (limite de GMAP)

    // Reset la liste des marqueurs
    for (let i = 0; i < params.stations.length; i++) {
        params.stations[i].setMap(null);
    }

    // Récupère la latitude et longitude de départ
    let lat = params.start.lat();
    let lng = params.start.lng();

    // Calcule la distance max, la distance autonomie et la distance parcourue (en m)
    let distMax = getDistanceFromLatLonInKm(params.start.lat(), params.start.lng(), params.end.lat(), params.end.lng()) * 1000; // Distance entre le départ et l'arrivée
    let distAutonomy = (params.car.autonomy - (params.car.autonomy / 2)) * 1000; // Distance parcourable avec le modèle de voiture donné
    let distParcourue = distAutonomy; // Distance parcourue

    // Tant que le trajet n'est pas fini, on cherche des stations de rechargement
    while (distParcourue < distMax) {
        let point = params.polyline.GetPointAtDistance(distParcourue); // Point de référence pour trouver une station
        lat = point.lat();
        lng = point.lng();
        let ray = 10; // Rayon de recherche
        let station = await setStationOnRoad(lat, lng, ray); // Trouve la station la plus proche du point donné

        // Vérifie qu'on a trouvé une station, qu'on ne dépasse pas le nb de waypoints autorisé
        // et que la station trouvée n'est pas plus loin que la destination finale
        if (station !== undefined && params.stations.length < MAX_WAYPOINTS_PER_REQUEST && distParcourue < distMax) {
            params.stations.push({
                location: new google.maps.LatLng(lat, lng),
                stopover: true,
            });
        }

        distParcourue += distAutonomy;
    }
}

// Trouve une station de rechargement proche du point (lat, lng) dans un rayon donné
async function setStationOnRoad(lat, lng, rayon) {
    let station;
    let rows = 20; // nombre de résultat souhaité

    // set Polygon pour trouver une station sur le chemin
    let polygon = setPolygon(lat, lng, rayon);

    // Call de l'API d'opendata pour récupérer les stations les plus proches
    let url = 'https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=bornes-irve&q=&rows='
        + rows
        + '&facet=region&geofilter.polygon='
        + polygon;

    await fetch(url)
        .then(res => res.json())
        .then(function (out) {
                // On regarde tous les résultats du JSON
                station = closestStation(lat, lng, out.records);
            }
        ).catch(err => function (err) {
            console.log("Aucune station trouvée, agrandissement du rayon de recherche : " + rayon);
            rayon += 10;
            station = setStationOnRoad(lat, lng, rayon);
        });

    return station;
}

// Retourne la station la plus proche d'un point (lat, lng) à partir d'une liste de stations
function closestStation(lat, lng, stations) {
    let closestStat = stations[0];
    let distMin = getDistanceFromLatLonInKm(lat, lng, closestStat.fields.ylatitude, closestStat.fields.xlongitude);
    let distance;
    for (let i = 1; i < stations.length; i++) {
        let station = stations[i];
        distance = getDistanceFromLatLonInKm(lat, lng, station.fields.ylatitude, station.fields.xlongitude);
        if (distance < distMin) {
            closestStat = station;
        }
    }
    return closestStat;
}

// Définit le polygone pour rechercher les stations autour d'un point (lat, lng) donné et une distance (dist)
function setPolygon(lat, lng, dist) {
    let distLat = dist / 111; // distance en ° de lat entre le point de départ et la station la plus loin
    let distLng = dist / (111 * Math.cos(distLat)); // distance en ° de lat entre le point de départ et la station la plus loin

    let botleft = "(" + (lat + distLat).toString() + ", " + (lng - distLng).toString() + ")";
    let botright = "(" + (lat + distLat).toString() + ", " + (lng + distLng).toString() + ")";
    let top = "(" + (lat - distLat).toString() + ", " + lng.toString() + ")";

    // triangulation (lat, lng) autour du marqueur de départ
    return botleft + ", " + botright + ", " + top;
}

// Fonctions pour calculer la distance en km entres 2 points à partir de leurs coordonnées LatLng
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    let R = 6371; // Radius of the earth in km
    let dLat = deg2rad(lat2 - lat1);  // deg2rad below
    let dLon = deg2rad(lon2 - lon1);
    let a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Conversion degré à radiant
function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function displayTravelTime() {
    let res = fetch("https://info802-service-rest.herokuapp.com/travelTime?" +
        "autonomy=" + params.car.autonomy.toString() +
        "&reload_time=" + params.car.refill.toString() +
        "&km=" + Math.floor(params.totalDist / 1000).toString() +
        "&travel_time=" + Math.floor(params.travelTime / 60).toString())
        .then(r => r.json())
        .then(function (r) {
            let hours = Math.floor(r["minutes"] / 60);
            let minuts = r["minutes"] % 60;
            let travelTime = document.getElementById("travelTime");
            travelTime.innerText = "Temps de trajet : " + hours.toString() + "h" + minuts.toString();
        });
}

// === A method which returns a google.maps.LatLng of a point a given distance along the path ===
// === Returns null if the path is shorter than the specified distance ===
google.maps.Polyline.prototype.GetPointAtDistance = function (metres) {
    // some awkward special cases
    if (metres === 0) return this.getPath().getAt(0);
    if (metres < 0) return null;
    if (this.getPath().getLength() < 2) return null;
    let dist = 0;
    let olddist = 0;
    let i = 0;
    for (i = 1; (i < this.getPath().getLength() && dist < metres); i++) {
        olddist = dist;
        dist += google.maps.geometry.spherical.computeDistanceBetween(
            this.getPath().getAt(i),
            this.getPath().getAt(i - 1)
        );
    }
    if (dist < metres) {
        return null;
    }
    let p1 = this.getPath().getAt(i - 2);
    let p2 = this.getPath().getAt(i - 1);
    let m = (metres - olddist) / (dist - olddist);
    return new google.maps.LatLng(p1.lat() + (p2.lat() - p1.lat()) * m, p1.lng() + (p2.lng() - p1.lng()) * m);
}

// ----------
// Essai pour récupérer les stations à partir d'un fichier CSV
// function setRechargeStations() {
//     const file = "https://static.data.gouv.fr/resources/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/20220222-073346/consolidation-etalab-schema-irve-v-2.0.2-20220222.csv";
//     let rawFile = new XMLHttpRequest();
//     rawFile.open("GET", file, true);
//     rawFile.onreadystatechange = function () {
//         if (rawFile.readyState === 4) {
//             if (rawFile.status === 200 || rawFile.status === 0) {
//                 let allText = rawFile.responseText;
//                 lines = allText.split("\n");
//                 for (let i = 1; i < lines.length; i++) {
//                     let sanitizedLine = lines[i].replace(/,(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$)/g, ";")
//                     let stationInfo = sanitizedLine.split(",");
//                     if (stationInfo.length < 15) continue
//                     let name = stationInfo[9]; // récupère le nom de la station
//                     let [lat, long] = stationInfo[13].replace('"[', '').replace(']"', '').split(';');
//                     rechargeStations.push({
//                         name,
//                         lat: parseFloat(lat),
//                         long: parseFloat(long),
//                     });
//                 }
//             } else {
//                 alert("Erreur '" + rawFile.status + "' lors du téléchargement des stations");
//             }
//         }
//     }
//     rawFile.send(null);
// }