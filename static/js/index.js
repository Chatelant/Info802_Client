// paramètres de l'application
let params = {
    geocoder: "",
    map: "",
    car: 0,
    roadDisplay: "",
    roadService: "",
    start: "",
    end: "",
    markers: [],
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

    console.log(params.car);
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

// Calcul et trace un trajet entre deux points
async function setRoute() {
    // Reset les paramètres de la carte
    if (params.markers !== []) params.markers = []
    if (params.roadDisplay) params.roadDisplay.setMap(null);

    // Trouve la position du point de départ en LatLng
    let addressDepart = document.getElementById('addressDepart').value;
    params.start = await getCoordinates(addressDepart);

    // Trouve la position du point d'arrivée en LatLng
    let addressArrivee = document.getElementById('addressArrivee').value;
    params.end = await getCoordinates(addressArrivee);

    // TODO : fonction qui retourne toutes les stations où s'arrêter pendant le voyage
    // setStationOnRoad();

    // Setup du trajet entre les deux points
    let start = new google.maps.LatLng(params.start);
    let end = new google.maps.LatLng(params.end);
    let request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING
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
    params.roadService.route(request, function (result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            params.roadDisplay.setDirections(result);
        } else {
            alert("couldn't get directions:" + status);
        }
    });

    console.log(params.roadDisplay);
}

function setPolygon(lat, lng, dist) {
    let distLat = dist / 111; // distance en ° de lat entre le point de départ et la station la plus loin
    let distLng = dist / (111 * Math.cos(distLat)); // distance en ° de lat entre le point de départ et la station la plus loin

    let botleft = "(" + (lat + distLat).toString() + ", " + (lng - distLng).toString() + ")";
    let botright = "(" + (lat + distLat).toString() + ", " + (lng + distLng).toString() + ")";
    let top = "(" + (lat - distLat).toString() + ", " + lng.toString() + ")";

    // triangulation (lat, lng) autour du marqueur de départ
    return botleft + ", " + botright + ", " + top;
}

// Place les stations de rechargement proche du point de départ
// TODO : modifier pour donner les stations par lesquelles il peut passer pendant son trajet
function setStationOnRoad() {
    let rows = 20; // nombre de résultat souhaité
    // let km = params.car.autonomy; // kilomètres parcourables
    let km = 30;
    let rayon = 30; // rayon de recherche de station sur la route

    // 1° de lat = 111 km
    // 1° de long = 111 * cos(lat) km
    let distLat = km / 111; // distance en ° de lat entre le point de départ et la station la plus loin
    let distLng = km / (111 * Math.cos(distLat)); // distance en ° de lat entre le point de départ et la station la plus loin

    let newLat = params.start.lat();
    let newLng = params.start.lng();
    let stop = false;
    let i = 0;

    while (stop !== true) {
        if (params.start.lat() <= params.end.lat()) {
            newLat += distLat;
        } else {
            newLat -= distLat;
        }

        if (params.start.lng() <= params.end.lng()) {
            newLng += distLng;
        } else {
            newLng -= distLng;
        }

        // set Polygon pour trouver une station sur le chemin
        let polygon = setPolygon(newLat, newLng, rayon);

        // Call de l'API d'opendata pour récupérer les stations les plus proches
        // let url = 'https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=bornes-irve&q=&rows='
        //     + rows
        //     + '&facet=region&geofilter.polygon='
        //     + polygon;
        //
        // fetch(url)
        //     .then(res => res.json())
        //     .then(function (out) {
        //             // On regarde tous les résultats du JSON
        //             console.log(out.records);
        //             for (let i = 0; i < out.records.length; i++) {
        //                 let station = out.records[i];
        //                 drawMarkerStation(station.fields.ad_station, station.fields.ylatitude, station.fields.xlongitude);
        //             }
        //         }
        //     ).catch(err => console.log("Aucune station de rechargement à proximité : " + err));

        drawMarkerStation("Station", newLat, newLng);

        i += 1;
        if (i === 20) { stop = true; }
    }
}

// Dessine un marqueur de station de rechargement
function drawMarkerStation(name, lat, lng) {
    const svgMarker = {
        path: "M10.453 14.016l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM12 2.016q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
        fillColor: "#2864b2",
        fillOpacity: 1,
        strokeWeight: 0,
        rotation: 0,
        scale: 2,
        anchor: new google.maps.Point(15, 30),
    };

    let infowindow = new google.maps.InfoWindow();
    let marker = new google.maps.Marker({
        map: params.map,
        position: new google.maps.LatLng(lat, lng),
        title: name,
        icon: svgMarker,
    });

    google.maps.event.addListener(marker, 'click', (function (marker) {
        return function () {
            infowindow.setContent(name);
            infowindow.open(params.map, marker);
        }
    })(marker));

    params.markers.push(marker);
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