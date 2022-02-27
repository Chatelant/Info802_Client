let dropdown = document.getElementById("vehicle-select")
dropdown.onchange = show;

// Affiche les informations du véhicule sélectionné
async function show() {
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
        const car_infos = info.split(";");

        // affichage des informations de la voiture
        let car_name = document.getElementById("vehicle-name")
        let car_brand = document.getElementById("vehicle-brand")
        let car_model = document.getElementById("vehicle-model")
        let car_autonomy = document.getElementById("vehicle-autonomy")
        let car_refill = document.getElementById("vehicle-refill")

        car_name.textContent = car_selected
        car_brand.textContent = "Marque : " + car_infos[0]
        car_model.textContent = "Modèle : " + car_infos[1]
        car_autonomy.textContent = "Autonomie : " + car_infos[2] + " km"
        car_refill.textContent = "Rechargement : " + car_infos[3] + " h"
    } else {
        // si aucune voiture n'est sélectionnée
        // on efface les affichages
        let car_name = document.getElementById("vehicle-name")
        let car_brand = document.getElementById("vehicle-brand")
        let car_model = document.getElementById("vehicle-model")
        let car_autonomy = document.getElementById("vehicle-autonomy")
        let car_refill = document.getElementById("vehicle-refill")

        car_name.textContent = ""
        car_brand.textContent = ""
        car_model.textContent = ""
        car_autonomy.textContent = ""
        car_refill.textContent = ""
    }
}

show();