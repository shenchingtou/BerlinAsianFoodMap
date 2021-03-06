// MIT License

// Copyright (c) 2020 Roman Gille

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

class LocalBusinessMap {

    constructor(mapElementId, options = {}) {
        this.categories = new Array();
        this.categoryLayers = [];
        this.map = undefined
        this.isLocal = location.hostname == 'localhost'
        this.repositoryBaseUrl = 'https://cdn.jsdelivr.net/gh/r-dent/BerlinAsianFoodMap@master/'
        this.clusterZoom = options.clusterBelowZoom 
        this.clusterLayer = undefined
        this.useClustering = (this.clusterZoom !== undefined && typeof(this.clusterZoom) == 'number')
        this.showLocateButton = (options.showLocateButton !== undefined)
        this.showCategorySelection = options.showCategorySelection
        this.onDataReady = options.onDataReady
        this.cityCenter = [52.518611, 13.408333]

        // Add loading layer DOM.
        var mapContainer = document.getElementById(mapElementId)
        mapContainer.classList.add('lh-mp-ctnr')
        mapContainer.innerHTML = '<div id="loading"><svg height="100" width="100" class="spinner"><circle cx="50" cy="50" r="20" class="inner-circle" /></svg></div>'
        
        const resourceVersionTag = '20200413-2'
        const dataUrl = (this.isLocal ? '' : this.repositoryBaseUrl) +'data/Berlin_Asian_Restaurants_Grocery_Stores.geojson?v='+ resourceVersionTag
        const cssUrl = (this.isLocal ? '' : this.repositoryBaseUrl) +'map-style.css?v='+ resourceVersionTag

        DocumentHelper.loadCss(cssUrl)
        DocumentHelper.loadCss('https://use.fontawesome.com/releases/v5.8.1/css/all.css')
        DocumentHelper.loadCss('https://unpkg.com/leaflet@1.6.0/dist/leaflet.css')
        DocumentHelper.loadScript('https://unpkg.com/leaflet@1.6.0/dist/leaflet.js', () => {
            this.map = this.createMap(mapElementId, options);
            DocumentHelper.loadUrl(dataUrl, (data) => this.applyGeoData(data)); 
        })
        // Add cluster css when clustering is enabled.
        if (this.clusterZoom !== undefined && typeof(this.clusterZoom) == 'number') {
            DocumentHelper.loadCss('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css')
            DocumentHelper.loadCss('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css')
        }
        if (this.showLocateButton) {
            DocumentHelper.loadCss('https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.71.1/dist/L.Control.Locate.min.css')
        }
    }

    createMap(mapElementId, {mapBoxKey, mapBoxStyle}) {
        const map = L.map(mapElementId, {zoomControl: false}).setView(this.cityCenter, 11);
        L.control.zoom({position: 'bottomleft'}).addTo(map)

        if (mapBoxKey !== undefined && typeof(mapBoxKey) == 'string' && mapBoxKey.length > 0) {
            // Use Mapbox if key is provided.
            const mapboxAttribution = '<a href="https://github.com/r-dent/BerlinAsianFoodMap" target="_blank">Code</a> on GitHub' +
            '<br>Map data &copy; <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank">CC-BY-SA</a>, ' + 
            'Imagery © <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>'
            const retinaPart = (window.devicePixelRatio > 1) ? '@2x' : ''
            const useCustomStyle = (mapBoxStyle !== undefined && typeof(mapBoxStyle) == 'string' && mapBoxStyle.length > 0)
    
            L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}'+ retinaPart +'?access_token={accessToken}', {
                attribution: mapboxAttribution,
                maxZoom: 18,
                id: (useCustomStyle ? mapBoxStyle : 'mapbox/streets-v11'),
                tileSize: 512,
                zoomOffset: -1,
                accessToken: mapBoxKey,
            }).addTo(map);
        } else {
            // Use OpenStreetMap as fallback.
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}', {
                foo: 'bar', 
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
            }).addTo(map);
        }

        if (this.showLocateButton) {
            DocumentHelper.loadScript('https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.71.1/dist/L.Control.Locate.min.js', () => {
                L.control.locate({position: 'bottomleft', showCompass: false}).addTo(map);
            })
        }

        var addButton = L.control({position: 'bottomright'});
        addButton.onAdd = (map) => {
            var div = L.DomUtil.create('div', 'add-entry')
            div.innerHTML = '<a href="https://hackmd.io/C7UtXN8vTHqt2LWLamc3rw" target="_blank"><i class="fa fa-plus"></i> Add business</a>'
            return div
        };
        addButton.addTo(map);

        return map
    }

    showMarkerPopup(feature, layer) {

        const data = feature.properties
        const title = data.Name
        const coord = feature.geometry.coordinates
        const addressString = title +' Berlin'
        var texts = [data.angebot]

        if (data.description !== undefined && data.description != '') {
            texts.push(data.description)
        }
        
        const address = '<a onclick="GeoHelper.navigate('+ coord[1] +','+ coord[0] +',\''+ addressString +'\')" class="directions-link"><i class="fa fa-directions"></i></a>Navigate:'

        layer.bindPopup(
            '<h3>'+ title +'</h3><p>'+ texts.join('</p><p>') +'</p><p>'+ address +'</p>'
        )
    }

    renderMapMarker(geoJsonPoint, coordinatate) {

        var image = 'other'
        switch (geoJsonPoint.properties.category) {
            case 'Baumarkt': image = 'hardwarestore'; break;
            case 'Blumenladen': image = 'flowers'; break;
            case 'Buchhandlung': image = 'books'; break;
            case 'Bürobedarf': image = 'office'; break;
            case 'Gastronomie': image = 'food'; break;
            case 'Gesundheit': image = 'medical'; break;
            case 'Getränkemarkt': image = 'drinks'; break;
            case 'Haushalt': image = 'household'; break;
            case 'Mode / Bekleidung': image = 'fashion'; break;
            case 'Möbel': image = 'furniture'; break;
            case 'Sportwaren': image = 'sports'; break;
        }

        const imageLink = (this.isLocal ? '' : this.repositoryBaseUrl) +'images/marker_'+ image +'.svg'
        var icon = L.icon({
            iconUrl: imageLink,
            iconSize: [27, 39],
            shadowUrl: (this.isLocal ? '' : this.repositoryBaseUrl) +'images/marker_shadow.svg',
            shadowSize: [13, 8],
            shadowAnchor: [7, -13]
        });
        return L.marker(coordinatate, {icon: icon})
            .bindTooltip(geoJsonPoint.properties.Name, {offset: [0, 16]})
    }

    renderClusterMarker(cluster) {
        const iconUrl = (this.isLocal ? '' : this.repositoryBaseUrl) +'images/group_marker.svg'
        return L.divIcon({
            className: 'cluster-marker',
            iconSize: [34, 40],
            html: '<img src="'+ iconUrl +'"/><div>' + cluster.getChildCount() + '</div>'
        })
    }

    addLayersToMap(layers, map) {

        if (this.useClustering) {

            const addClusterLayer = (layers, map) => {
                var markers = L.markerClusterGroup({
                    disableClusteringAtZoom: this.clusterZoom,
                    iconCreateFunction: (cluster) => this.renderClusterMarker(cluster)
                });
                for (const id in layers) {
                    markers.addLayer(layers[id])
                }
                this.clusterLayer = markers
                map.addLayer(markers)
            }

            if (L.markerClusterGroup === undefined) {
                DocumentHelper.loadScript('https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js', () => {
                    addClusterLayer(layers, map)
                })
            } else {
                addClusterLayer(layers, map)
            }
        } else {
            for (const id in layers) {
                layers[id].addTo(map)
            }
        }
    }

    createCategoryLayers(geoJson) {

        for (const catId in this.categories) {
            const category = this.categories[catId]
            const geoLayer = L.geoJSON(geoJson, {
                onEachFeature: this.showMarkerPopup,
                pointToLayer: (point, coord) => this.renderMapMarker(point, coord),
                filter: function(feature, layer) {
                    return feature.properties.category == category
                }
            })
            this.categoryLayers[category] = geoLayer
        }
        this.addLayersToMap(this.categoryLayers, this.map)
    }

    showLayer(id) {
        var group = this.categoryLayers[id];
        if (!this.map.hasLayer(group)) {
            group.addTo(this.map);   
        }
    }

    hideLayer(id) {
        var lg = this.categoryLayers[id];
        this.map.removeLayer(lg);   
    }

    selectCategory(selectedCategory) {
        console.log(selectedCategory)
        var shownLayers = new Array()

        for (const category in this.categoryLayers) {
            const layer = this.categoryLayers[category]
            this.map.removeLayer(layer)
            if (category == selectedCategory || selectedCategory == 'all') {
                shownLayers.push(layer)
            }
        }
        if (this.useClustering) {
            this.map.removeLayer(this.clusterLayer)
        }
        this.addLayersToMap(shownLayers, this.map)
        this.map.fitBounds(L.featureGroup(shownLayers).getBounds())
    }

    applyGeoData(data) {

        const geo = new GeoHelper()
        var geoJson = JSON.parse(data);
        var filteredFeatures = new Array()
        var distinctCategories = new Set()

        for (const index in geoJson.features) {
            var feature = geoJson.features[index]
            // Filter by distance.
            const distanceToCityCenter = geo.distance(this.cityCenter, [feature.geometry.coordinates[1], feature.geometry.coordinates[0]])
            if (distanceToCityCenter < 30) {
                filteredFeatures.push(feature)
            } else {
                continue
            }
            // Build categories.
            const category = feature.properties.category;
            distinctCategories.add(category)
        }
        this.categories = Array.from(distinctCategories).sort()
        geoJson.features = filteredFeatures
        console.log(this.categories);
        
        if (this.showCategorySelection !== false) {
            // Create category selection control.
            var control = L.control({position: 'topright'});
            control.onAdd = (map) => {
                var div = L.DomUtil.create('div', 'command');

                var categorySelection = '<form><div class="select-wrapper fa fa-angle-down"><select id="category-selection" name="category">'
                categorySelection += '<option value="all">Alle</option>'
                for (const catId in this.categories) {
                    var category = this.categories[catId]
                    categorySelection += '<option value="'+ category +'">'+ category +'</option>'
                }
                categorySelection += '</select></div></form>'

                div.innerHTML = categorySelection; 
                return div;
            };
            control.addTo(this.map);
            document
                .getElementById('category-selection')
                .addEventListener('change', (event) => this.selectCategory(event.target.value), false);
        }

        this.createCategoryLayers(geoJson);

        // Remove loading overlay.
        document.getElementById('loading').remove()

        if (this.onDataReady !== undefined && typeof(this.onDataReady) == 'function') {
            this.onDataReady(this.categories)
        }
    }
}

class GeoHelper {

    constructor() {
      /** Converts numeric degrees to radians */
        if (typeof(Number.prototype.toRad) === 'undefined') {
            Number.prototype.toRad = function() {
            return this * Math.PI / 180;
            }
        }
    }

    distance(pointA, pointB) {
        const lat1 = pointA[0]
        const lon1 = pointA[1]
        const lat2 = pointB[0]
        const lon2 = pointB[1]

        var R = 6371; // Radius of the earth in km
        var dLat = (lat2-lat1).toRad();  // Javascript functions in radians
        var dLon = (lon2-lon1).toRad(); 
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; // Distance in km
        return d;
      }

      static navigate(lat, lon, address) {
        // If it's an iPhone..
        if( (navigator.platform.indexOf("iPhone") != -1) 
            || (navigator.platform.indexOf("iPod") != -1)
            || (navigator.platform.indexOf("iPad") != -1))
             window.open('https://maps.apple.com/?daddr='+ address);
        else
             window.open('https://www.google.com/maps/dir/?api=1&destination='+ lat +','+ lon);
    }
}

class DocumentHelper {

    static loadScript(url, callback = () => {}) {
        var scriptNode = document.createElement("script"); 
        scriptNode.type = 'text/javascript';
        scriptNode.src = url;
        scriptNode.onreadystatechange = callback
        scriptNode.onload = callback
    
        document.head.appendChild(scriptNode);
    }

    static loadCss(url) {
        var cssNode = document.createElement("link"); 
        cssNode.rel = 'stylesheet';
        cssNode.href = url
    
        document.head.appendChild(cssNode);
    }

    static loadUrl(url, handler){
        const request = new XMLHttpRequest();
        request.open("GET", url);
        request.send();

        request.onreadystatechange = (e) => {
            if (request.readyState == 4 && request.status == 200) {
                handler(request.responseText)
            }
        }        
    }
}
