(function($) {
    var MarkerType = { BRANCH:'BRANCH', USER: 'USER' };
    var map = null;
    var debug = true;
    var geocoder = null;
    var branchMarkerIcon = 'http://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png';

    function log(msg1, msg2) {
        if(!debug) { return; }
        if(typeof msg2 === 'undefined') {
            console.log(msg1);
            return;
        }
        console.log(msg1, msg2);
    }

    function sortByDistanceDistanceMatrix(a, b) {
        return (a.custom_distance.distance.value - b.custom_distance.distance.value);
    }

    function showLoader() {
        $('#map-spinner').show();
    }

    function hideLoader() {
        $('#map-spinner').hide();
    }

    function showInfo(msg, className) {
        var $infoElement = $('#map-info');
        hideLoader();
        $infoElement.html(msg);
        if (className) {
            $infoElement.removeClass().addClass(className);
        }
    }

    function clearInfo() {
        hideLoader();
        $('#map-info').removeClass().html('');
    }

    function isBranchMarker(marker) {
      return marker.custom_type === MarkerType.BRANCH;
    }

    function getBranchMarkers() {
      var markers = [];
      $.each(map.markers, function(i, marker) {
        if(isBranchMarker(marker)) {
          markers.push(marker);
        }
      });
      return markers;
    }

    function addWindowInfo(marker, content) {
        var infowindow = new google.maps.InfoWindow({
            content: content
        });

        google.maps.event.addListener(marker, 'mouseover', function() {
          infowindow.open(map, marker);
        });

        google.maps.event.addListener(marker, 'mouseout', function() {
          infowindow.close(map, marker);
          if(isBranchMarker(marker)) {
            marker.setIcon(branchMarkerIcon);
          }
        });
    }

    function getUserMarker() {
        var userMarker = null;
        $.each(map.markers, function(i, marker) {
          if(marker.custom_type === MarkerType.USER) {
            userMarker = marker;
          }
        });
        return userMarker;
    }

    function addUserMarker(location) {
      var userMarker = getUserMarker();

      if(null === userMarker) {
        var marker = new google.maps.Marker({
          position: location,
          map: map,
          title: 'Your Position',
          custom_type: MarkerType.USER
        });
        map.markers.push(marker);
        addWindowInfo(marker, '<b>Your position</b>');
      } else {
        userMarker.setPosition(location);
        userMarker.setMap(map);
      }
    }

    function focusMapOnMarkers(markers) {
        //add user marker if exists
        var userMarker = getUserMarker();

        if(null !== userMarker){
          markers.push(userMarker);
        }

        if(markers.length === 1) {
            map.setCenter(markers[0].getPosition());
            map.setZoom(11);
        } else {
            var latlng = null;
            var focusedOn = markers.map(function(el) { return el.custom_branch_id; });
            var bounds = new google.maps.LatLngBounds();
            $.each(map.markers, function(i, marker) {
                if(focusedOn.length < 1) {
                    log('show all');
                    latlng = new google.maps.LatLng(marker.position.lat(), marker.position.lng());
                    bounds.extend(latlng);
                } else {
                    log('show chosen with user marker');
                    if(focusedOn.indexOf(marker.custom_branch_id) > -1 || marker.custom_type === MarkerType.USER){
                        latlng = new google.maps.LatLng(marker.position.lat(), marker.position.lng());
                        bounds.extend(latlng);
                    }
                }
            });
            map.fitBounds(bounds);
        }
    }

    function showAllBranchMarkers() {
      var bounds = new google.maps.LatLngBounds();
      $.each(map.markers, function(i, marker) {
        if(marker.custom_type === MarkerType.USER) {
          marker.setMap(null);
        } else {
         latlng = new google.maps.LatLng(marker.position.lat(), marker.position.lng());
         bounds.extend(latlng);
        }
      });
      map.fitBounds(bounds);
    }

    function addBranchMarker(branchId) {
        var branch = branches[branchId];

        var latlng = new google.maps.LatLng( branch['lat'], branch['lng']);

        var marker = new google.maps.Marker({
            position    : latlng,
            map         : map,
            title       : branch['title'],
            address     : branch['address'],
            icon        : branchMarkerIcon,
            custom_type : MarkerType.BRANCH,
            custom_branch_id   : branchId
        });

        map.markers.push(marker);

        var content = '<b>Branch ' + branch['title'] + '</b><br>';
        content += branch['address'];

        google.maps.event.addListener(marker, 'click', (function(marker, i) {
            return function() {
                showLoader();
                $('.acf-map').addClass('overview');
                focusMapOnMarkers([marker]);
                hideLoader();
                $('#map-info').html(content + '<br><a href="' + branch['link'] + '">Check branch page</a>').show();
            };
        })(marker));

        addWindowInfo(marker, content);
    }

    function showBigMap() {
        if(!$('.acf-map').hasClass('overview')) { return; }
        $('#map-sidebar').hide();
        $('.acf-map').removeClass('overview');
        focusMapOnMarkers([]);
    }

    function calculateDistances(point) {
        addUserMarker(point);

        var errorMsg;
        var coordinates = map.markers.map(function(el) { return { lat: el.getPosition().lat(), lng: el.getPosition().lng() }; });
        var service = new google.maps.DistanceMatrixService();
        var request = {
            origins: [point],
            destinations: coordinates,
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false
        };

        service.getDistanceMatrix(request, function(response, status) {
            if (status !== google.maps.DistanceMatrixStatus.OK) {
                errorMsg = 'Error: ' + status;
                log(errorMsg);
                showInfo(errorMsg, "error-info");
            } else {
                abc = response;
                var markersToShow = [];
                var origins = response.originAddresses;
                var destinations = response.destinationAddresses;
                var results = response.rows[0].elements;

                for (var i = 0; i < getBranchMarkers().length; i++) {
                    if(results[i].status !== google.maps.DistanceMatrixElementStatus.OK) {
                        continue;
                    }
                    var maxDistance = $('#maxDistance').val() * 1000;
                    if(results[i].distance.value > maxDistance) {
                        map.markers[i].custom_distance = null;
                        continue; 
                    }

                    map.markers[i].custom_distance = {
                        distance: results[i].distance,
                        duration: results[i].duration,
                        status: results[i].status
                    };
                    
                    markersToShow.push(map.markers[i]);
                }

                if(markersToShow.length < 1) {
                    errorMsg = 'There is no branch close to the given distance.';
                    log(errorMsg);
                    showInfo(errorMsg, "alert-warning");
                    focusMapOnMarkers([]);
                    return;
                }

                markersToShow.sort(sortByDistanceDistanceMatrix);

                clearInfo();
                focusMapOnMarkers(markersToShow);
            }
        });
    }

    function codeGeolocation() {
        clearInfo();
        showLoader();
        showBigMap();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                calculateDistances(pos);
            }, function() {
                var errorMsg = 'Error: The Geolocation service failed.';
                log(errorMsg);
                showInfo(errorMsg, "error-info");
            });
        } else {
            var errorMsg = 'Error: your browser doesn\'t support Geolocation.';
            log(errorMsg);
            showInfo(errorMsg, "error-info");
        }
    }

    function codeAddress() {
        clearInfo();
        showLoader();
        showBigMap();

        var address = document.getElementById('address').value;

        if('' === address) {
            focusMapOnMarkers([]);
            hideLoader();
        } else {
            geocoder.geocode({
                'address': address
            }, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    calculateDistances(results[0].geometry.location);
                } else {
                    var errorMsg = 'Geocode was not successful for the following reason: ' + status;
                    log(errorMsg);
                    showInfo(errorMsg, "error-info");
                }
            });
        }
    }

    function newMap( $el ) {
        geocoder = new google.maps.Geocoder();

        var args = {
            zoom       : 16,
            center     : new google.maps.LatLng(0, 0),
            mapTypeId  : google.maps.MapTypeId.ROADMAP,
            markers    : []
        };

        map = new google.maps.Map($el[0], args);

        for (var branchId in branches) {
            addBranchMarker(branchId);
        }

        focusMapOnMarkers([]);
        hideLoader();
    }

    newMap($('.acf-map'));

    $('#geolocation-btn').on('click', function() {
        clearInfo();
        codeGeolocation();
    });

    $('#address').on('keydown', function(e) {
        if(e.which === 13) {
          clearInfo();
          codeAddress();
        }
    });

    $('#search-btn').on('click', function() {
        clearInfo();
        codeAddress();
    });

    $('#reset-search-btn').on('click', function() {
        clearInfo();
        showAllBranchMarkers();
    });

})(jQuery);