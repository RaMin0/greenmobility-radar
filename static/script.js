let map;
let rectangle;
let rectangleNE;
let rectangleSW;
let timeout;
let timeout2;
let markers = [];
let infoWindow;
let carTypes = [];

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 15,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    zoomControl: false,
    styles: styles.silver,
  });
  addMyLocationButton(map);
  getMyLocation();
}

function showNewRect() {
  rectangleNE = rectangle.getBounds().getNorthEast();
  rectangleSW = rectangle.getBounds().getSouthWest();

  if (timeout) {
    clearTimeout(timeout);
  }
  timeout = setTimeout(function() { getCars(rectangleSW, rectangleNE, console.log); }, 200);
}

function handleLocation(position) {
  map.addListener("bounds_changed", () => {
    if (timeout2) {
      clearTimeout(timeout2);
    }
    timeout2 = setTimeout(function () {
      getCars(map.getBounds().getSouthWest(), map.getBounds().getNorthEast(), drawCars);
    }, 200);
  });

  const pos = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
  map.setCenter(pos);

  getCars(map.getBounds().getSouthWest(), map.getBounds().getNorthEast(), drawCars);

  var NORTH = 0;
  var WEST = -90;
  var SOUTH = 180;
  var EAST = 90;

  var height = 250;
  var width = 250;
  var center = new google.maps.LatLng(pos.lat, pos.lng);

  var north = google.maps.geometry.spherical.computeOffset(center, height / 2, NORTH);
  var south = google.maps.geometry.spherical.computeOffset(center, height / 2, SOUTH);

  var east = google.maps.geometry.spherical.computeOffset(center, width / 2, EAST);
  var west = google.maps.geometry.spherical.computeOffset(center, width / 2, WEST);

  const bounds = {
    north: north.lat(),
    south: south.lat(),
    east: east.lng(),
    west: west.lng(),
  };
  rectangle = new google.maps.Rectangle({
    bounds: bounds,
    editable: true,
    draggable: true,
  });
  rectangleNE = rectangle.getBounds().getNorthEast();
  rectangleSW = rectangle.getBounds().getSouthWest();
  rectangle.setMap(map);
  rectangle.addListener("bounds_changed", showNewRect);
}

function handleLocationError(browserHasGeolocation) {
  alert(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
}

function getCars(sw, ne, cb) {
  var doGetCards = function() {
    let params = {
      lat1: sw.lat(),
      lon1: sw.lng(),
      lat2: ne.lat(),
      lon2: ne.lng(),
    };
    let query = Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
    fetch('/api/cars?' + query).then(function (response) {
      response.json().then(function(data) {
        for (var i = 0; i < data.length; i++) {
          data[i].vehicleType = carTypes[data[i].vehicleTypeId];
        }
        cb(data);
      });
    });
  }

  if (!carTypes.length) {
    fetch('/api/car_types').then(function(response) {
      response.json().then(function(data) {
        data.forEach(function(carType) {
          carTypes[parseInt(carType.vehicleTypeId, 10)] = carType;
        });
        doGetCards();
      });
    });
  } else {
    doGetCards();
  }
}

function iconColor(fuel) {
  if (fuel >= 60) {
    return 'green';
  } else if (fuel >= 30) {
    return 'orange';
  } else {
    return 'red';
  }
}

function drawCars(data) {
  deleteMarkers();
  data.forEach(car => {
    const marker = new google.maps.Marker({
      position: { lat: car.lat, lng: car.lon },
      icon: `https://maps.google.com/mapfiles/ms/icons/${iconColor(car.fuelLevel)}-dot.png`,
      map,
    });
    marker.addListener('click', function () {
      if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow({});
      }
      infoWindow.setContent(
        `<div class="gm-style poi-info-window"><div>
          <div class="title full-width">${car.vehicleType.title} <small style="font-weight: lighter;">${car.licencePlate} (${car.fuelLevel}%)</small></div>
          <div class="address">
            <div class="address-line full-width">${car.address}</div>
            <div class="address-line full-width">${car.zipCode} ${car.city}</div>
          </div>
          <div class="view-link">
            <a target="_blank" href="greenmobility://select/car/${car.carId}">
              View on GreenMobility
            </a>
          </div>
        </div></div>`,
      );
      infoWindow.open(map, marker);
    });

    markers.push(marker);
  });
};

function deleteMarkers() {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
  markers = [];
}

function getMyLocation(secondChild) {
  if (secondChild) {
    var imgX = '0',
      animationInterval = setInterval(function () {
        imgX = imgX === '-18' ? '0' : '-18';
        secondChild.style['background-position'] = imgX + 'px 0';
      }, 500);
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      map.setCenter(latlng);
      if (secondChild) {
        clearInterval(animationInterval);
        secondChild.style['background-position'] = '-144px 0';
      } else {
        handleLocation(position);
      }
    }, function () { handleLocationError(true) });
  } else {
    if (secondChild) {
      clearInterval(animationInterval);
      secondChild.style['background-position'] = '0 0';
    }
    handleLocationError(false);
  }
}

function addMyLocationButton(map) {
  var controlDiv = document.createElement('div');

  var firstChild = document.createElement('button');
  firstChild.style.backgroundColor = '#fff';
  firstChild.style.border = 'none';
  firstChild.style.outline = 'none';
  firstChild.style.width = '28px';
  firstChild.style.height = '28px';
  firstChild.style.borderRadius = '2px';
  firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
  firstChild.style.cursor = 'pointer';
  firstChild.style.marginRight = '10px';
  firstChild.style.padding = '0';
  firstChild.title = 'Your Location';
  controlDiv.appendChild(firstChild);

  var secondChild = document.createElement('div');
  secondChild.style.margin = '5px';
  secondChild.style.width = '18px';
  secondChild.style.height = '18px';
  secondChild.style.backgroundImage = 'url(https://maps.gstatic.com/tactile/mylocation/mylocation-sprite-2x.png)';
  secondChild.style.backgroundSize = '180px 18px';
  secondChild.style.backgroundPosition = '0 0';
  secondChild.style.backgroundRepeat = 'no-repeat';
  firstChild.appendChild(secondChild);

  google.maps.event.addListener(map, 'center_changed', function () {
    secondChild.style['background-position'] = '0 0';
  });

  firstChild.addEventListener('click', function() { getMyLocation(secondChild); });

  controlDiv.index = 1;
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
}

const styles = {
  silver: [
    {
      elementType: "geometry",
      stylers: [{ color: "#f5f5f5" }],
    },
    {
      elementType: "labels.icon",
      stylers: [{ visibility: "off" }],
    },
    {
      elementType: "labels.text.fill",
      stylers: [{ color: "#616161" }],
    },
    {
      elementType: "labels.text.stroke",
      stylers: [{ color: "#f5f5f5" }],
    },
    {
      featureType: "administrative.land_parcel",
      elementType: "labels.text.fill",
      stylers: [{ color: "#bdbdbd" }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#eeeeee" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#757575" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#e5e5e5" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#ffffff" }],
    },
    {
      featureType: "road.arterial",
      elementType: "labels.text.fill",
      stylers: [{ color: "#757575" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#dadada" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#616161" }],
    },
    {
      featureType: "road.local",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }],
    },
    {
      featureType: "transit.line",
      elementType: "geometry",
      stylers: [{ color: "#e5e5e5" }],
    },
    {
      featureType: "transit.station",
      elementType: "geometry",
      stylers: [{ color: "#eeeeee" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#c9c9c9" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }],
    },
  ],
};
