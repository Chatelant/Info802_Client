// paramètres de l'application
let params = {
    geocoder: "",
    map: "",
    car: 0,
    roadDisplay: "",
    roadService: "",
    polyline: "",
    start: "",
    end: "",
    stations: [],
    travelTime: 0
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
        strokeColor: '#ff2481',
        strokeWeight: 4
    });
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


// TODO : à clean

// Calcul et trace un trajet entre deux points
// function getNewLatitude(latitude, distanceKm) {
//     const meridionalRadiuskm = 40007.86;
//     latitude = (latitude + distanceKm / (meridionalRadiuskm / 360));
//     if (latitude > 90) return 180 - latitude;
//     if (latitude < -90) return -(180 + latitude);
//     return latitude;
// }
//
// // TODO : NON FONCTIONNELS, A CORRIGER
// function normalizedPoint(lat1, lon1, lat2, lon2, dist) {
//     let constant = Math.PI / 180;
//     let angular = dist / 6371;
//     let a = Math.sin(0 * angular) / Math.sin(angular);
//     let b = Math.sin(1 * angular) / Math.sin(angular);
//     let x = a * Math.cos(lat1 * constant) * Math.cos(lon1 * constant) +
//         b * Math.cos(lat2 * constant) * Math.cos(lon2 * constant);
//     let y = a * Math.cos(lat1 * constant) * Math.sin(lon1 * constant) +
//         b * Math.cos(lat2 * constant) * Math.sin(lon2 * constant);
//     let z = a * Math.sin(lat1 * constant) + b * Math.sin(lat2 * constant);
//     let lat3 = Math.atan2(z, Math.sqrt(x * x + y * y));
//     let lon3 = Math.atan2(y, x);
//     return {lat: lat3 / constant, lng: lon3 / constant};
// }
// // TODO : NON FONCTIONNELS, A CORRIGER
function getPointPosition(lat1, lng1, lat2, lng2, dist) {
    let D = Math.sqrt((lat2 - lat1) * (lat2 - lat1) + (lng2 - lng1) * (lng2 - lng1));
    let lat3 = lat1 + dist / D * (lat2 - lat1);
    let lng3 = lng1 + dist / D * (lng2 - lng1);
    return {lat: lat3, lng: lng3};
}

// function getIntermediatePoint(startLatMicroDeg, startLonMicroDeg, endLatMicroDeg, endLonMicroDeg, t) // How much of the distance to use, from 0 through 1)
// {
// // Convert microdegrees to radians
//     let alatRad = rad2deg(startLatMicroDeg);
//     let alonRad = rad2deg(startLonMicroDeg);
//     let blatRad = rad2deg(endLatMicroDeg);
//     let blonRad = rad2deg(endLonMicroDeg);
// // Calculate distance in longitude
//     let dlon = blonRad - alonRad;
// // Calculate common variables
//     let alatRadSin = Math.sin(alatRad);
//     let blatRadSin = Math.sin(blatRad);
//     let alatRadCos = Math.cos(alatRad);
//     let blatRadCos = Math.cos(blatRad);
//     let dlonCos = Math.cos(dlon);
// // Find distance from A to B
//     let distance = Math.acos(alatRadSin * blatRadSin +
//         alatRadCos * blatRadCos *
//         dlonCos);
// // Find bearing from A to B
//     let bearing = Math.atan2(
//         Math.sin(dlon) * blatRadCos,
//         alatRadCos * blatRadSin -
//         alatRadSin * blatRadCos * dlonCos);
// // Find new point
//     let angularDistance = distance * t;
//     let angDistSin = Math.sin(angularDistance);
//     let angDistCos = Math.cos(angularDistance);
//     let xlatRad = Math.asin(alatRadSin * angDistCos +
//         alatRadCos * angDistSin * Math.cos(bearing));
//     let xlonRad = alonRad + Math.atan2(
//         Math.sin(bearing) * angDistSin * alatRadCos,
//         angDistCos - alatRadSin * Math.sin(xlatRad));
// // Convert radians to microdegrees
//     let xlat = Math.round(rad2deg(xlatRad));
//     let xlon = Math.round(rad2deg(xlonRad));
//     if (xlat > 90) xlat = 90;
//     if (xlat < -90) xlat = -90;
//     while (xlon > 180) xlon -= 360;
//     while (xlon <= -180) xlon += 360;
//     return  {lat: xlat, lng: xlon};
// }

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

    // Reset la liste des marqueurs
    for (let i = 0; i < params.stations.length; i++) {
        params.stations[i].setMap(null);
    }

    if (params.car === "0") {
        alert("Veuillez sélectionner une voiture");
    } else {
        let dist = 0; // Distance entre le départ et la station trouvée
        let distMax = getDistanceFromLatLonInKm(params.start.lat(), params.start.lng(), params.end.lat(), params.end.lng()); // Distance entre le départ et l'arrivée

        let unit = params.car.autonomy / 100; // unité de distance entre le point de départ et d'arrivée
        let lat = params.start.lat();
        let lng = params.start.lng();

        while (dist < distMax) {
            // TODO : PROBLEME : Résultat incorrect, point toujours trop loin
            let point = getPointPosition(lat, lng, params.end.lat(), params.end.lng(), unit);
            // let point = getIntermediatePoint(lat, lng, params.end.lat(), params.end.lng(), unit);

            lat = point.lat;
            lng = point.lng;
            let ray = 10;
            let station = await setStationOnRoad(lat, lng, ray); // Trouve la station la plus proche du point donné

            dist = getDistanceFromLatLonInKm(params.start.lat(), params.start.lng(), lat, lng);

            // Vérifie qu'on a trouvé une station, qu'on ne dépasse pas le nb de waypoints autorisé
            // et que la station trouvée n'est pas plus loin que la destination finale
            if (station !== undefined && params.stations.length < 25 && dist < distMax) {
                // drawMarkerStation(station.fields.ad_station, station.fields.ylatitude, station.fields.xlongitude);
                params.stations.push({
                    location: station.fields.ad_station,
                    stopover: true,
                });
            }
        }

        // Calcul et traçage du trajet
        let request = {
            origin: new google.maps.LatLng(params.start),
            waypoints: params.stations,
            destination: new google.maps.LatLng(params.end),
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(Date.now())
            }
        };

        params.roadService = new google.maps.DirectionsService();
        params.roadDisplay = new google.maps.DirectionsRenderer();
        let Center = new google.maps.LatLng(18.210885, -67.140884);
        let properties = {
            center: Center,
            zoom: 20,
            mapTypeId: google.maps.MapTypeId.SATELLITE
        };

        // Affichage sur la carte
        params.roadDisplay.setMap(params.map);
        params.roadService.route(request, function (response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                params.polyline.setPath([]);
                let bounds = new google.maps.LatLngBounds();
                startLocation = new Object();
                endLocation = new Object();
                params.roadDisplay.setDirections(response);
                // let route = response.routes[0];
                // For each route, display summary information.
                // let path = response.routes[0].overview_path;
                let legs = response.routes[0].legs;
                params.travelTime = 0;
                for (let i = 0; i < legs.length; i++) {
                    if (i === 0) {
                        startLocation.latlng = legs[i].start_location;
                        startLocation.address = legs[i].start_address;
                    }
                    endLocation.latlng = legs[i].end_location;
                    endLocation.address = legs[i].end_address;
                    let steps = legs[i].steps;
                    params.travelTime += legs[i].duration.value;
                    for (let j = 0; j < steps.length; j++) {
                        let nextSegment = steps[j].path;
                        for (let k = 0; k < nextSegment.length; k++) {
                            params.polyline.getPath().push(nextSegment[k]);
                            bounds.extend(nextSegment[k]);
                        }
                    }
                }
                console.log("TravelTime (setTrajet) : " + params.travelTime + " secondes");
                userAction();
                params.polyline.setMap(params.map);
            } else {
                alert("directions response " + status);
            }
        });
    }
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

// Conversion radiant à degré
function rad2deg(rad) {
    return rad * 180 / Math.PI;
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

// Trouve une station de rechargement proche du point (lat, lng) dans un rayon donné
async function setStationOnRoad(lat, lng, rayon) {
    let station;
    let rows = 30; // nombre de résultat souhaité

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
// Old function pour mettre des pin
// await geocoder.geocode({'address': addressArrivee}, function (results, status) {
//     if (status === 'OK') {
//         // Place le marqueur de départ
//         if (markerArrivee && markerArrivee.setMap) {
//             markerArrivee.setMap(null);
//         }
//         map.setCenter(results[0].geometry.location);
//         markerArrivee = new google.maps.Marker({
//             map: map,
//             position: results[0].geometry.location,
//             title: addressArrivee,
//             animation: google.maps.Animation.DROP
//         });
//         let infowindow = new google.maps.InfoWindow();
//         google.maps.event.addListener(markerArrivee, 'click', (function (marker) {
//             return function () {
//                 infowindow.setContent(addressArrivee);
//                 infowindow.open(map, markerArrivee);
//             }
//         })(markerArrivee));
//     } else {
//         alert('Geocode was not successful for the following reason: ' + status);
//     }
// });

// async function userAction() {
//     let url = 'https://info802-service-rest.herokuapp.com/travelTime?km=300&autonomy=150&reload_time=60'
//     await fetch(url)
//         .then(res => res.json())
//         .then(function (out) {
//                 console.log(out)
//             }
//         ).catch(err => function (err) {
//             console.log(err)
//         });
//}
// Example POST method implementation:
async function userAction() {
    let url = 'https://info802-service-rest.herokuapp.com/travelTime?km=300&autonomy=150&reload_time=60'
    // Default options are marked with *
    console.log("Ici")
    await fetch(url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'same-origin', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : "*"
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        // body: JSON.stringify(data) // body data type must match "Content-Type" header
    }).then(res => res.json())
        .then(function (out) {
                console.log("out : " + out)
            }
        ).catch(err => function (err) {
            console.log("err : " + err)
        });
}