let map;
let service;
let markers = {};
let activeCategory = null;
let searchMarker;
let directionsService;
let directionsRenderer;
let userLocation;
let trafficLayer;
let trafficVisible = false;
let currentInfoWindow = null;

function initMap() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();

  const myLatLng = { lat: -34.397, lng: 150.644 };

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 8,
    center: myLatLng,
  });

  directionsRenderer.setMap(map);
  trafficLayer = new google.maps.TrafficLayer();
  document
    .getElementById("toggle-traffic")
    .addEventListener("click", function () {
      trafficVisible = !trafficVisible;

      if (trafficVisible) {
        trafficLayer.setMap(map);
      } else {
        trafficLayer.setMap(null);
      }
    });

  service = new google.maps.places.PlacesService(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      map.setCenter(userLocation);
    });
  }

  document
    .getElementById("estimate-time-btn")
    .addEventListener("click", estimateTravelTime);

  const locationInput = document.getElementById("location-input");
  const locationAutocomplete = new google.maps.places.Autocomplete(
    locationInput
  );
  locationAutocomplete.bindTo("bounds", map);

  locationAutocomplete.addListener("place_changed", function () {
    const place = locationAutocomplete.getPlace();
    if (!place.geometry) {
      alert("No details available for input: '" + place.name + "'");
      return;
    }
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }

    if (searchMarker) {
      searchMarker.setMap(null);
    }

    searchMarker = new google.maps.Marker({
      map: map,
      position: place.geometry.location,
    });
  });

  const destinationInput = document.getElementById("destination-input");
  const destinationAutocomplete = new google.maps.places.Autocomplete(
    destinationInput
  );
  destinationAutocomplete.bindTo("bounds", map);

  destinationAutocomplete.addListener("place_changed", function () {
    const place = destinationAutocomplete.getPlace();
    if (!place.geometry) {
      alert("No details available for input: '" + place.name + "'");
      return;
    }
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }

    if (searchMarker) {
      searchMarker.setMap(null);
    }

    searchMarker = new google.maps.Marker({
      map: map,
      position: place.geometry.location,
    });
  });

  document
    .getElementById("parks-btn")
    .addEventListener("click", function () {
      toggleCategory("park");
    });
  document
    .getElementById("shopping-btn")
    .addEventListener("click", function () {
      toggleCategory("shopping_mall");
    });
  document.getElementById("gas-btn").addEventListener("click", function () {
    toggleCategory("gas_station");
  });
  document.getElementById("coffee-btn").addEventListener("click", function () {
    toggleCategory("cafe");
  });
  document
    .getElementById("groceries-btn")
    .addEventListener("click", function () {
      toggleCategory("supermarket");
    });
}

function estimateTravelTime() {
  const destination = document.getElementById("destination-input").value;
  if (!destination) {
    alert("Please enter a destination.");
    return;
  }

  const request = {
    origin: userLocation,
    destination: destination,
    travelMode: "DRIVING",
  };

  directionsService.route(request, function (result, status) {
    if (status === "OK") {
      directionsRenderer.setDirections(result);
      const duration = result.routes[0].legs[0].duration.text;
      document.getElementById(
        "time-estimate"
      ).innerHTML = `Estimated Travel Time: ${duration}`;
    } else {
      alert("Unable to find the route to the destination.");
    }
  });
}

function toggleCategory(category) {
  if (activeCategory && activeCategory !== category) {
    clearMarkers(activeCategory);
  }

  if (activeCategory === category) {
    clearMarkers(category);
    activeCategory = null;
  } else {
    findPlaces(category);
    activeCategory = category;
  }
}

function findPlaces(placeType) {
  if (searchMarker) {
    searchMarker.setMap(null);
    searchMarker = null;
  }

  const request = {
    location: map.getCenter(),
    radius: "5000",
    type: [placeType],
  };

  clearMarkers(placeType);

  service.nearbySearch(request, function (results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      for (let i = 0; i < results.length; i++) {
        createMarker(results[i], placeType);
      }
    } else {
      alert("No " + placeType + " found in this area.");
    }
  });
}

function createMarker(place, category) {
  const placeLoc = place.geometry.location;
  const placeMarker = new google.maps.Marker({
    map: map,
    position: placeLoc,
    title: place.name,
  });

  if (!markers[category]) {
    markers[category] = [];
  }

  markers[category].push(placeMarker);

  let photoUrl = "";
  if (place.photos && place.photos.length > 0) {
    photoUrl = place.photos[0].getUrl({ maxWidth: 200, maxHeight: 200 });
  } else {
    photoUrl = "https://via.placeholder.com/200?text=No+Image";
  }

  let ratingStars = "";
  if (place.rating) {
    const fullStars = Math.floor(place.rating);
    const halfStar =
      place.rating % 1 >= 0.5
        ? '<i class="fas fa-star-half-alt stars"></i>'
        : "";
    ratingStars = '<div class="stars">';
    for (let i = 0; i < fullStars; i++) {
      ratingStars += '<i class="fas fa-star stars"></i>';
    }
    ratingStars += halfStar + "</div>";
  }

  const infowindowContent = `
    <div>
      <strong>${place.name}</strong><br>
      <em>${place.vicinity}</em><br>
      <img src="${photoUrl}" alt="Image of ${
    place.name
  }" style="width:200px; height:auto;"><br><br>
      <strong>Rating: ${place.rating || "N/A"}</strong> ${ratingStars}<br><br>
      <strong>Reviews:</strong><br>
      ${
        place.reviews && place.reviews.length > 0
          ? place.reviews
              .slice(0, 3)
              .map(
                (review) =>
                  `<em>${review.author_name}</em>: "${review.text}"<br>`
              )
              .join("")
          : "No reviews available"
      }
    </div>
  `;

  const infowindow = new google.maps.InfoWindow({
    content: infowindowContent,
  });

  google.maps.event.addListener(placeMarker, "click", function () {
    if (currentInfoWindow && currentInfoWindow === infowindow) {
      currentInfoWindow.close();
      currentInfoWindow = null;
    } else {
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }
      infowindow.open(map, placeMarker);
      currentInfoWindow = infowindow;
    }
  });
}

function clearMarkers(category) {
  if (markers[category]) {
    for (let i = 0; i < markers[category].length; i++) {
      markers[category][i].setMap(null);
    }
    markers[category] = [];
  }
}

document
  .getElementById("location-input")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      var location = document.getElementById("location-input").value;
      if (location) {
        geocodeLocation(location);
      } else {
        alert("Please enter a location");
      }
    }
  });

function geocodeLocation(location) {
  var geocoder = new google.maps.Geocoder();

  geocoder.geocode({ address: location }, function (results, status) {
    if (status === "OK") {
      var latLng = results[0].geometry.location;

      if (searchMarker) {
        searchMarker.setMap(null);
      }

      searchMarker = new google.maps.Marker({
        map: map,
        position: latLng,
        title: location,
      });

      map.setCenter(latLng);
      map.setZoom(12);
      clearMarkers();
    } else {
      alert(
        "Geocode was not successful for the following reason: " + status
      );
    }
  });
}
