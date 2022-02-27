// TODO : remplacer les constantes par des variables passées en paramètre

let geocoder;
let map;

let addressDepart;
let markerDepart;
let addressArrive;
let markerArrive;

let markersStations = [];

// Initialise la map
function initialize() {
    geocoder = new google.maps.Geocoder();
    let latlng = new google.maps.LatLng(48.8588335, 2.2768239);
    let mapOptions = {
        zoom: 10,
        center: latlng
    }
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    // setRechargeStations();
}

// Positionne le marqueur de départ et les stations environnantes
async function setMarkerDepart() {
    addressDepart = document.getElementById('addressDepart').value;
    await geocoder.geocode({'address': addressDepart}, function (results, status) {
        if (status === 'OK') {
            // Place le marqueur de départ
            if (markerDepart && markerDepart.setMap) {
                markerDepart.setMap(null);
            }
            map.setCenter(results[0].geometry.location);
            markerDepart = new google.maps.Marker({
                map: map,
                position: results[0].geometry.location,
                title: addressDepart,
                animation: google.maps.Animation.DROP
            });
            let infowindow = new google.maps.InfoWindow();
            google.maps.event.addListener(markerDepart, 'click', (function (marker) {
                return function () {
                    infowindow.setContent(addressDepart);
                    infowindow.open(map, markerDepart);
                }
            })(markerDepart));
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });

    // Affiche les stations de rechargement à proximité
    if (markersStations[0] && markersStations[0].setMap) {
        for (let i = 0; i < markersStations.length; i++) {
            markersStations[i].setMap(null);
        }
    }
    setNearbyStation();
}

// Essai pour récupérer les stations à partir d'un fichier CSV
function setRechargeStations() {
    const file = "https://static.data.gouv.fr/resources/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/20220222-073346/consolidation-etalab-schema-irve-v-2.0.2-20220222.csv";
    let rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status === 0) {
                let allText = rawFile.responseText;
                lines = allText.split("\n");
                for (let i = 1; i < lines.length; i++) {
                    let sanitizedLine = lines[i].replace(/,(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$)/g, ";")
                    let stationInfo = sanitizedLine.split(",");
                    if (stationInfo.length < 15) continue
                    let name = stationInfo[9]; // récupère le nom de la station
                    let [lat, long] = stationInfo[13].replace('"[', '').replace(']"', '').split(';');
                    rechargeStations.push({
                        name,
                        lat: parseFloat(lat),
                        long: parseFloat(long),
                    });
                }
            } else {
                alert("Erreur '" + rawFile.status + "' lors du téléchargement des stations");
            }
        }
    }
    rawFile.send(null);
}

// Place les stations de rechargement proche du point de départ
// TODO : modifier pour donner les stations par lesquelles il peut passer pendant son trajet
function setNearbyStation() {
    let rows = 15; // nombre de résultat de la requête API

    // 1° de lat = 111 km
    // 1° de long = 111 * cos(lat) km
    let km = 30; // kilomètres parcourables, TODO: remplacer par l'autonomie du véhicule calculé par l'autre api
    let distLat = km / 111; // distance en ° de lat entre le point de départ et la station la plus loin
    let distLng = km / (111 * Math.cos(distLat)); // distance en ° de lat entre le point de départ et la station la plus loin

    // set Polygon pour trouver les stations les plus proches
    let botleft = "(" + (markerDepart.position.lat() + distLat).toString() + ", " + (markerDepart.position.lng() - distLng).toString() + ")";
    let botright = "(" + (markerDepart.position.lat() + distLat).toString() + ", " + (markerDepart.position.lng() + distLng).toString() + ")";
    let top = "(" + (markerDepart.position.lat() - distLat).toString() + ", " + markerDepart.position.lng().toString() + ")";

    let polygon = botleft + ", " + botright + ", " + top; // triangulation (lat, lng) autour du marqueur de départ

    // Call de l'API d'opendata pour récupérer les stations les plus proches
    let url = 'https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=bornes-irve&q=&rows='
        + rows
        + '&facet=region&geofilter.polygon='
        + polygon;

    fetch(url)
        .then(res => res.json())
        .then(function (out) {
                // On regarde tous les résultats du JSON
                for (let i = 0; i < out.records.length; i++) {
                    let station = out.records[i];
                    drawMarkerStation(station.fields.ad_station, station.fields.ylatitude, station.fields.xlongitude);
                }
            }
        ).catch(err => console.log("Aucune station de rechargement à proximité : " + err));
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
        map: map,
        position: new google.maps.LatLng(lat, lng),
        title: name,
        icon: svgMarker,
    });

    google.maps.event.addListener(marker, 'click', (function (marker) {
        return function () {
            infowindow.setContent(name);
            infowindow.open(map, marker);
        }
    })(marker));

    markersStations.push(marker);
}

// TODO : draw trajet entre point de départ et destination